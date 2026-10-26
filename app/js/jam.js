// Stand-in for Spotify Jams, which have no API. The home screen shows a QR code that
// opens jam/index.html on a guest's phone. Requests are rows in the Supabase table
// `jam` (supabase.sql) that the TV answers with its own Spotify login, and the TV keeps
// one 'state' row with what's playing and next.
//
// Spotify's queue can only be added to, never reordered or trimmed, so jam picks wait
// in the TV's own list (reorderable and removable from the phone) and each is handed
// to Spotify's queue near the end of the song before it.
const Jam = (() => {
  // One TV, so one fixed room; jam/index.html uses the same one.
  const ROOM = 'HOME';
  const QR_SIZE = 760;
  const HANDOFF_MS = 20000; // ticks run every 5s, so this leaves room for a slow one
  let lastId = 0, stateId = 0, stateJson = '', busy = false, ticking = false, toast = null;
  let search = null; // app-only catalogue token for the phone, see Music.catalogToken
  const REPEAT = ['off', 'context', 'track'];
  let picks = Platform.load('jam-picks', []); // [{ id, uri, name, artist, image, by, handed }]

  function enabled() {
    return !!(CONFIG.jamUrl && CONFIG.supabaseUrl && Music.enabled());
  }

  function savePicks() {
    Platform.save('jam-picks', picks);
  }

  function db(method, path, body) {
    return fetch(CONFIG.supabaseUrl + '/rest/v1/' + path, {
      method,
      headers: { apikey: CONFIG.supabaseKey, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: body && JSON.stringify(body),
    }).then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function roundRect(b, x, y, w, h, r) {
    b.beginPath();
    b.moveTo(x + r, y);
    b.arcTo(x + w, y, x + w, y + h, r);
    b.arcTo(x + w, y + h, x, y + h, r);
    b.arcTo(x, y + h, x, y, r);
    b.arcTo(x, y, x + w, y, r);
    b.closePath();
  }

  // Light modules on a rounded black box (phone cameras read inverted codes), with
  // rounded finder squares and the Spotify logo in the middle, which level H error
  // correction reads through. Modules stay solid squares: at a few pixels each, any
  // rounding leaves gaps that scanners trip on.
  function renderQr(m, logo, fit) {
    const n = m.length, quiet = 3;
    const cell = Math.max(2, Math.floor((fit || QR_SIZE) / (n + quiet * 2)));
    const size = (n + quiet * 2) * cell;
    const finder = (x, y) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
    return makeCanvas(size, size, b => {
      b.fillStyle = '#000000';
      roundRect(b, 0, 0, size, size, cell * 2.5);
      b.fill();
      b.fillStyle = '#f4f6f8';
      m.forEach((row, y) => row.forEach((dark, x) => {
        if (!dark || finder(x, y)) return;
        b.fillRect((x + quiet) * cell, (y + quiet) * cell, cell, cell);
      }));
      [[0, 0], [n - 7, 0], [0, n - 7]].forEach(([fx, fy]) => {
        const x = (fx + quiet) * cell, y = (fy + quiet) * cell;
        roundRect(b, x, y, cell * 7, cell * 7, cell * 1.6);
        b.fill();
        b.fillStyle = '#000000';
        roundRect(b, x + cell, y + cell, cell * 5, cell * 5, cell * 1.1);
        b.fill();
        b.fillStyle = '#f4f6f8';
        roundRect(b, x + cell * 2, y + cell * 2, cell * 3, cell * 3, cell * 0.8);
        b.fill();
      });
      if (!logo) return;
      const d = Math.round(size * 0.24), c = size / 2;
      b.fillStyle = '#000000';
      b.beginPath();
      b.arc(c, c, d / 2 + cell, 0, Math.PI * 2);
      b.fill();
      b.imageSmoothingQuality = 'high';
      const top = (logo.naturalHeight - logo.naturalWidth) / 2;
      b.drawImage(logo, 0, top, logo.naturalWidth, logo.naturalWidth, c - d / 2, c - d / 2, d, d);
    });
  }

  function trackInfo(t, big) {
    const imgs = t.album ? t.album.images : [];
    return {
      uri: t.uri,
      name: t.name,
      artist: t.artists ? t.artists[0].name : '',
      image: ((big ? imgs[0] : imgs[imgs.length - 1]) || {}).url,
    };
  }

  function answer(id, results) {
    return db('PATCH', 'jam?id=eq.' + id, { results });
  }

  function addPick(row) {
    return Music.api('GET', '/tracks/' + row.query.split(':').pop())
      .then(t => trackInfo(t), () => ({ uri: row.query, name: row.title || 'A song', artist: '' }))
      .then(t => {
        picks.push(Object.assign(t, { id: row.id, by: row.name || null }));
        savePicks();
        toast = { text: (row.name || 'SOMEONE') + ' ADDED ' + t.name + ' - ' + t.artist, until: Date.now() + 6000 };
        return answer(row.id, { ok: true });
      });
  }

  // An 'edit' carries { op: 'move', id, to } or { op: 'remove', id } as JSON, with `to`
  // an index into the full pick list. A pick already handed to Spotify can't change.
  function editPick(row) {
    const op = JSON.parse(row.query);
    const i = picks.findIndex(p => p.id === op.id);
    if (i < 0 || picks[i].handed) return answer(row.id, { error: "That song can't be changed now." });
    const pick = picks.splice(i, 1)[0];
    if (op.op === 'move') {
      const first = picks[0] && picks[0].handed ? 1 : 0;
      picks.splice(Math.max(first, Math.min(op.to, picks.length)), 0, pick);
    }
    savePicks();
    return answer(row.id, { ok: true });
  }

  // The phone's player buttons also come as 'edit' rows, saying what to switch to
  // rather than what to flip so a double tap can't undo itself. The answer waits for
  // Spotify's new state so the phone doesn't flash back to the old one.
  const CONTROLS = {
    play: () => ['PUT', '/me/player/play'],
    pause: () => ['PUT', '/me/player/pause'],
    prev: () => ['POST', '/me/player/previous'],
    next: () => ['POST', '/me/player/next'],
    shuffle: op => ['PUT', '/me/player/shuffle?state=' + !!op.to],
    repeat: op => ['PUT', '/me/player/repeat?state=' + (REPEAT.includes(op.to) ? op.to : 'off')],
  };

  // A tick already under way read the player before the change, so wait for it.
  function freshTick() {
    return ticking ? new Promise(done => setTimeout(done, 300)).then(freshTick) : tick();
  }

  function controlPlayer(row, op) {
    const [method, path] = CONTROLS[op.op](op);
    return Music.api(method, path)
      .then(() => new Promise(done => setTimeout(done, 700)))
      .then(freshTick)
      .then(() => answer(row.id, { ok: true }));
  }

  function handle(row) {
    let done;
    const op = row.kind === 'edit' && JSON.parse(row.query);
    if (op && CONTROLS[op.op]) {
      done = controlPlayer(row, op);
    } else if (row.kind === 'search') {
      done = Music.api('GET', '/search?type=track&limit=10&q=' + encodeURIComponent(row.query))
        .then(d => answer(row.id, d.tracks.items.map(t => trackInfo(t))));
    } else if (row.kind === 'add') {
      done = addPick(row).then(tick);
    } else {
      done = Promise.resolve().then(() => editPick(row)).then(tick);
    }
    return done.catch(err => answer(row.id, { error: err.message }));
  }

  function publish(state) {
    const json = JSON.stringify(state);
    // Rewritten at least once a minute so guests can tell the TV is on.
    const minute = Math.floor(Date.now() / 60000);
    if (json + minute === stateJson) return;
    stateJson = json + minute;
    state.at = Date.now();
    return answer(stateId, state);
  }

  // Every 5s: hands the next pick to Spotify near the end of a song, drops it from the
  // list once it plays, and publishes the state for the phone.
  function tick() {
    if (ticking || document.hidden) return;
    ticking = true;
    if (CONFIG.spotifyClientSecret && (!search || search.expires - Date.now() < 10 * 60e3)) {
      Music.catalogToken().then(t => { search = t; }, err => console.error('jam search token', err.message));
    }
    return Promise.all([Music.api('GET', '/me/player'), Music.api('GET', '/me/player/queue')])
      .then(([p, q]) => {
        const now = p && p.item;
        const head = picks[0];
        // Gone from Spotify's queue without being seen playing (skipped past between
        // ticks, or relinked to another uri) also counts, or it would block the list.
        if (now && head && head.handed && (now.uri === head.uri || (q && !q.queue.some(t => t.uri === head.uri)))) {
          picks.shift();
          savePicks();
        } else if (p && p.is_playing && now && head && !head.handed && now.duration_ms - p.progress_ms < HANDOFF_MS) {
          head.handed = true;
          savePicks();
          Music.api('POST', '/me/player/queue?uri=' + encodeURIComponent(head.uri)).catch(err => {
            head.handed = false;
            savePicks();
            console.error('jam handoff', err.message);
          });
        }
        // Spotify's own upcoming tracks, without the pick already handed to it.
        const next = q ? q.queue.map(t => trackInfo(t)) : [];
        const handed = picks[0] && picks[0].handed ? next.findIndex(t => t.uri === picks[0].uri) : -1;
        if (handed >= 0) next.splice(handed, 1);
        return publish({
          now: now && trackInfo(now, true),
          playback: now && { playing: p.is_playing, progress: p.progress_ms, duration: now.duration_ms, repeat: p.repeat_state, shuffle: p.shuffle_state },
          picks: picks.map(({ id, uri, name, artist, image, by, handed }) => ({ id, uri, name, artist, image, by, handed: !!handed })),
          next: next.slice(0, 10),
          search: search && { token: search.token, expires: search.expires },
        });
      })
      .catch(err => console.error('jam', err.message))
      .then(() => { ticking = false; });
  }

  function poll() {
    if (busy || document.hidden) return;
    busy = true;
    db('GET', 'jam?select=id,kind,name,query,title&order=id&kind=neq.state&code=eq.' + ROOM + '&id=gt.' + lastId)
      .then(rows => rows.reduce((p, row) => p.then(() => {
        lastId = row.id;
        return handle(row);
      }), Promise.resolve()))
      .catch(err => console.error('jam', err.message))
      .then(() => { busy = false; });
  }

  function start() {
    if (!enabled()) return;
    Promise.all([
      // Requests left from before the launcher opened are skipped.
      db('GET', 'jam?select=id&order=id.desc&limit=1&kind=neq.state&code=eq.' + ROOM),
      db('GET', 'jam?select=id&limit=1&kind=eq.state&code=eq.' + ROOM)
        .then(rows => rows.length ? rows : db('POST', 'jam', { code: ROOM, kind: 'state', query: 'state' })),
    ]).then(([last, state]) => {
      lastId = last.length ? last[0].id : 0;
      stateId = state[0].id;
      setInterval(poll, 1000);
      setInterval(tick, 5000);
      tick();
    }).catch(err => console.error('jam', err.message));
  }

  // Every screen: who just added what, above the now-playing line.
  function draw(g) {
    if (!toast || Date.now() > toast.until) return;
    const text = toast.text.normalize('NFD').replace(/[̀-ͯ]/g, '');
    drawBullet(g, 64, H - 140 + 3.5 * 4, '#1DB954');
    drawText(g, text.length > 40 ? text.slice(0, 38).trim() + '..' : text, 88, H - 140, 4, '#ffffff', { style: 'thin' });
  }

  return { start, draw, renderQr };
})();
