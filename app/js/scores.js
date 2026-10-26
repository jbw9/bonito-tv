// Game leaderboards, shared through Supabase (see supabase.sql) with plain fetch.
// Every new record adds a row; boards keep each name's best.
// Boards are cached so the menus work offline, and scores that couldn't be sent are
// kept and retried on the next load.
const Scores = (() => {
  const LOCAL_BEST = { flappy: 'best', dino: 'best-dino', stack: 'best-stack' };
  const boards = {}; // game -> [{ name, score }], best per name, high to low
  let names = Platform.load('names', []);

  function call(path, opts) {
    if (!CONFIG.supabaseUrl) return Promise.reject(new Error('no leaderboard configured'));
    opts = opts || {};
    const headers = { apikey: CONFIG.supabaseKey, 'Content-Type': 'application/json' };
    return fetch(CONFIG.supabaseUrl + '/rest/v1/' + path, { method: opts.method || 'GET', headers, body: opts.body && JSON.stringify(opts.body) })
      .then(r => {
        if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status), { status: r.status });
        return opts.method ? null : r.json();
      });
  }

  function addNames(list) {
    list.forEach(n => {
      if (!names.some(m => m.toUpperCase() === n.toUpperCase())) names.push(n);
    });
    Platform.save('names', names);
  }

  function setBoard(game, rows) {
    const seen = {};
    boards[game] = rows
      .slice()
      .sort((a, b) => b.score - a.score)
      .filter(r => !seen[r.name.toUpperCase()] && (seen[r.name.toUpperCase()] = true));
    Platform.save('board-' + game, boards[game]);
  }

  function board(game) {
    if (!boards[game]) boards[game] = Platform.load('board-' + game, []);
    return boards[game];
  }

  function flush() {
    const pending = Platform.load('pending-scores', []);
    if (!pending.length) return Promise.resolve();
    const sent = () => Platform.save('pending-scores', Platform.load('pending-scores', []).slice(pending.length));
    return call('scores', { method: 'POST', body: pending }).then(sent, err => {
      // A 400 means the database refused the rows (e.g. a game it doesn't know yet);
      // retrying can't help and would block every later upload.
      if (err.status !== 400) throw err;
      console.error('scores rejected', JSON.stringify(pending));
      sent();
    });
  }

  // Refreshes a game's board and the name list; resolves even when offline.
  function load(game) {
    const fail = err => console.error('scores load failed', err && err.message);
    return Promise.all([
      call('profiles?select=name&order=name').then(rows => addNames(rows.map(p => p.name))).catch(fail),
      flush()
        .then(() => call('scores?select=name,score&order=score.desc&limit=100&game=eq.' + game))
        .then(rows => {
          setBoard(game, rows);
          addNames(rows.map(r => r.name));
        })
        .catch(fail),
    ]);
  }

  function best(game) {
    const top = board(game)[0];
    return Math.max(Platform.load(LOCAL_BEST[game], 0), top ? top.score : 0);
  }

  function submit(game, name, score) {
    Platform.save(LOCAL_BEST[game], Math.max(score, Platform.load(LOCAL_BEST[game], 0)));
    Platform.save('player', name);
    addNames([name]);
    setBoard(game, board(game).concat([{ name, score }]));
    Platform.save('pending-scores', Platform.load('pending-scores', []).concat([{ game, name, score }]));
    flush().catch(err => console.error('score upload failed', err && err.message));
  }

  function resetLocal() {
    Object.keys(LOCAL_BEST).forEach(game => Platform.save(LOCAL_BEST[game], 0));
  }

  // Top scores for a game menu, or just the local best before anyone is on the board.
  function drawBoard(g, game, y) {
    const rows = board(game).slice(0, 4);
    if (!rows.length) return drawText(g, 'BEST ' + best(game), W / 2, y, 4.5, '#e8ebef', { style: 'thin', align: 'center' });
    rows.forEach((r, i) => {
      const ink = i === 0 ? '#ffffff' : '#9aa0a8';
      drawText(g, (i + 1) + ' ' + r.name, W / 2 - 300, y + i * 48, 4.5, ink, { style: 'thin' });
      drawText(g, String(r.score), W / 2 + 300, y + i * 48, 4.5, ink, { style: 'thin', align: 'right' });
    });
  }

  return {
    load, best, submit, resetLocal, drawBoard,
    names: () => names,
    isRecord: (game, score) => score > best(game),
  };
})();
