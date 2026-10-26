// Wordle Race for up to four (seats: js/party.js): everyone gets the same word and
// guesses on their own phone, which shows their letters. The TV shows only the colours
// of each grid, so nobody can copy. Ends when everyone's done or the clock runs out;
// the fewest guesses wins, and the quicker of a tie. A lone player races the CPU.
const WordleRace = (() => {
  const TIME = 180, OVER = 12;
  const COLORS = { c: '#538d4e', p: '#b59f3b', a: '#3a3a3c' };
  const CODE = { correct: 'c', present: 'p', absent: 'a' };
  const party = makeParty('WORDLE RACE', 4);

  // Each of party.players also gets words, rows (marks as 'c'/'p'/'a' strings), solved,
  // gaveUp, at (seconds taken when done), miss (rejected guesses, so phones can tell) and next (CPU).
  let mode = 'lobby', answer, timer, round = 0, winner, overTimer;

  function startRound() {
    if (!party.begin()) return;
    const n = Math.floor(Math.random() * WORDLE_ANSWERS.length / 5);
    answer = WORDLE_ANSWERS.substr(n * 5, 5);
    party.players.forEach(p => Object.assign(p, { words: [], rows: [], solved: false, gaveUp: false, at: null, miss: 0, next: 6 + Math.random() * 8 }));
    round++;
    timer = TIME;
    mode = 'play';
  }

  function toLobby() {
    mode = 'lobby';
    party.toLobby();
  }

  const done = p => p.solved || p.gaveUp || p.rows.length === 6;

  function guess(p, word) {
    word = String(word || '').toUpperCase();
    if (mode !== 'play' || !p || done(p) || !/^[A-Z]{5}$/.test(word)) return;
    if (!isWordleWord(word)) return void p.miss++;
    p.words.push(word);
    p.rows.push(wordleMarks(answer, word).map(m => CODE[m]).join(''));
    if (word === answer) p.solved = true;
    if (done(p)) p.at = TIME - timer;
  }

  function giveUp(p) {
    if (mode !== 'play' || !p || done(p)) return;
    p.gaveUp = true;
    p.at = TIME - timer;
  }

  // The CPU really plays: each guess is an answer that fits everything it's seen so far.
  function cpuGuess(p) {
    const fits = [];
    for (let i = 0; i < WORDLE_ANSWERS.length; i += 5) {
      const w = WORDLE_ANSWERS.substr(i, 5);
      if (p.words.every((g, r) => wordleMarks(w, g).map(m => CODE[m]).join('') === p.rows[r])) fits.push(w);
    }
    guess(p, fits[Math.floor(Math.random() * fits.length)]);
  }

  function finish() {
    const ranked = party.players.filter(p => p.solved).sort((a, b) => a.rows.length - b.rows.length || a.at - b.at);
    winner = ranked[0] || null;
    if (winner) winner.wins++;
    mode = 'over';
    overTimer = OVER;
  }

  function update(dt) {
    if (mode === 'play') {
      timer -= dt;
      party.players.forEach(p => {
        if (!p.cpu || done(p) || TIME - timer < p.next) return;
        cpuGuess(p);
        p.next = TIME - timer + 12 + Math.random() * 14;
      });
      if (timer <= 0 || party.players.every(done)) {
        timer = Math.max(0, timer);
        finish();
      }
    } else if (mode === 'over') {
      overTimer -= dt;
      if (overTimer <= 0) toLobby();
    }
  }

  const clockText = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  function drawGrid(g, p, cx, top, size) {
    const gap = Math.round(size * 0.14), width = size * 5 + gap * 4;
    const x0 = cx - width / 2;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 5; c++) {
        const x = x0 + c * (size + gap), y = top + r * (size + gap);
        roundRectPath(g, x, y, size, size, 6);
        if (r < p.rows.length) {
          g.fillStyle = COLORS[p.rows[r][c]];
          g.fill();
        } else {
          g.strokeStyle = r === p.rows.length && !done(p) && mode === 'play' ? '#565758' : '#2c2e31';
          g.lineWidth = 3;
          g.stroke();
        }
      }
    }
    return top + size * 6 + gap * 5;
  }

  function drawPlayers(g) {
    const n = party.players.length, span = W / (n + 1), size = n <= 2 ? 72 : 54;
    party.players.forEach((p, i) => {
      const cx = span * (i + 1), lead = mode === 'over' && p === winner;
      drawText(g, p.name, cx, 290, 5, p.color, { style: 'thin', align: 'center' });
      const bottom = drawGrid(g, p, cx, 350, size);
      const status = p.solved ? 'GOT IT IN ' + p.rows.length + '  ' + clockText(p.at)
        : p.gaveUp ? 'GAVE UP'
        : p.rows.length === 6 ? 'OUT OF GUESSES'
        : mode === 'over' ? 'TIME UP' : p.rows.length + ' OF 6';
      drawText(g, status, cx, bottom + 34, 3.5, p.solved ? '#5cff9d' : '#9aa0a8', { style: 'thin', align: 'center' });
      if (lead) {
        g.strokeStyle = p.color;
        g.lineWidth = 4;
        const width = size * 5 + Math.round(size * 0.14) * 4;
        roundRectPath(g, cx - width / 2 - 24, 260, width + 48, bottom - 260 + 90, 16);
        g.stroke();
      }
    });
  }

  function drawWord(g) {
    const size = 96, gap = 12, x0 = W / 2 - (size * 5 + gap * 4) / 2;
    for (let c = 0; c < 5; c++) {
      const x = x0 + c * (size + gap);
      roundRectPath(g, x, 110, size, size, 8);
      g.fillStyle = COLORS.c;
      g.fill();
      drawText(g, answer[c], x + size / 2, 110 + size / 2 - 3.5 * 7, 7, '#ffffff', { align: 'center' });
    }
  }

  function draw(g) {
    drawBackground(g, '#1d2026', '#0e1013');
    if (mode === 'lobby') party.drawLobby(g, true);
    else {
      if (mode === 'play') {
        drawText(g, 'WORDLE RACE', W / 2, 70, 5, '#9aa0a8', { style: 'thin', align: 'center' });
        drawText(g, clockText(Math.ceil(timer)), W / 2, 130, 12, timer < 30 ? '#ff6b6b' : '#ffffff', { align: 'center' });
      } else drawWord(g);
      drawPlayers(g);
      const foot = mode === 'play' ? 'GUESS ON YOUR PHONE   BACK LOBBY'
        : (winner ? winner.name + ' WINS' : 'NOBODY GOT IT') + '   OK LOBBY';
      drawText(g, foot, W / 2, H - 140, mode === 'play' ? 4 : 6, mode === 'play' || !winner ? '#9aa0a8' : winner.color, { style: 'thin', align: 'center' });
    }
    drawLightBar(g);
  }

  // Needs a phone each, so the remote only starts and ends rounds.
  function key(k, repeat) {
    if (mode === 'lobby') {
      if (k === 'ok' && !repeat) startRound();
    } else if (k === 'back' || (mode === 'over' && k === 'ok' && !repeat)) toLobby();
  }

  function phone(event, p) {
    if (party.phone(event, p, startRound)) return;
    if (event === 'guess') guess(party.find(p.id), p.word);
    else if (event === 'giveup') giveUp(party.find(p.id));
  }

  // Everyone's colours but not their letters (each phone keeps its own), and the word
  // only once it's over.
  function phoneState() {
    const playing = mode !== 'lobby';
    return Object.assign(party.state(mode, p => (playing ? { rows: p.rows, solved: p.solved, gaveUp: p.gaveUp, miss: p.miss } : {})), {
      round,
      left: mode === 'play' ? Math.ceil(timer) : null,
      word: mode === 'over' ? answer : null,
      winner: mode === 'over' && winner ? winner.id : null,
    });
  }

  function enter() {
    mode = 'lobby';
    party.reset();
  }

  return { enter, update, draw, key, phone, phoneState, inLobby: () => mode === 'lobby' };
})();

// The Wordle tile: pick solo (js/wordle.js) or the race, from the remote or a phone.
// Back from either comes here.
App.screens.wordle = (() => {
  const CHOICES = [['solo', 'SOLO', 'JUST YOU, AT YOUR PACE'], ['race', 'MULTIPLAYER', 'RACE ON YOUR PHONES']];
  let mode = 'pick', sel = 0;
  const now = () => (mode === 'solo' ? WordleSolo : WordleRace);

  function pick(m) {
    mode = m;
    now().enter();
  }

  function draw(g) {
    if (mode !== 'pick') return now().draw(g);
    drawBackground(g, '#1d2026', '#0e1013');
    drawText(g, 'WORDLE', W / 2, 200, 14, '#ffffff', { align: 'center' });
    CHOICES.forEach(([, name, sub], i) => {
      const x = W / 2 + (i ? 60 : -660), y = 430;
      roundRectPath(g, x, y, 600, 300, 20);
      g.fillStyle = i ? '#b59f3b' : '#538d4e';
      g.globalAlpha = i === sel ? 1 : 0.35;
      g.fill();
      g.globalAlpha = 1;
      if (i === sel) {
        g.strokeStyle = '#ffffff';
        g.lineWidth = 6;
        g.stroke();
      }
      drawText(g, name, x + 300, y + 100, 8, '#ffffff', { align: 'center' });
      drawText(g, sub, x + 300, y + 200, 3.5, '#ffffff', { style: 'thin', align: 'center', alpha: 0.85 });
    });
    drawText(g, 'OK CHOOSE   BACK EXIT', W / 2, H - 150, 4, '#7d838c', { style: 'thin', align: 'center' });
    drawLightBar(g);
  }

  function key(k, repeat) {
    if (mode === 'pick') {
      if (k === 'back') App.home();
      else if (k === 'left' || k === 'right') sel ^= 1;
      else if (k === 'ok' && !repeat) pick(CHOICES[sel][0]);
    } else if (k === 'back' && (mode === 'solo' || WordleRace.inLobby())) mode = 'pick';
    else now().key(k, repeat);
  }

  function phone(event, p) {
    if (mode === 'pick') {
      if (event === 'pick' && (p.mode === 'solo' || p.mode === 'race')) pick(p.mode);
    } else if (mode === 'race') WordleRace.phone(event, p);
    else if (event === 'giveup') WordleSolo.giveUp();
  }

  return {
    enter() { mode = 'pick'; },
    update(dt) { if (mode !== 'pick') now().update(dt); },
    draw,
    key,
    phone,
    type(ch) { if (mode === 'solo') WordleSolo.type(ch); },
    // Phones show the choice, the typing box for solo, or the race.
    phoneState: () => (mode === 'race' ? WordleRace.phoneState() : Object.assign({ mode }, mode === 'solo' && WordleSolo.phoneState())),
  };
})();
