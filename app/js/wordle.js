// Wordle on your own: six tries at a five-letter word. Type on a phone (js/remote.js) or
// pick letters off the on-screen keyboard with the remote. The Wordle screen that offers
// this or the race is in js/wordrace.js.

// Shared with Wordle Race.
function isWordleWord(w) {
  const find = list => {
    for (let i = 0; i < list.length; i += 5) if (list.substr(i, 5) === w) return true;
    return false;
  };
  return find(WORDLE_ANSWERS) || find(WORDLE_GUESSES);
}

// 'correct', 'present' or 'absent' per letter. Greens first, then yellows from what's
// left, so a repeated letter is only yellow as many times as the answer has it.
function wordleMarks(answer, guess) {
  const out = Array(5).fill('absent'), left = {};
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) out[i] = 'correct';
    else left[answer[i]] = (left[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < 5; i++) {
    if (out[i] !== 'correct' && left[guess[i]]) {
      out[i] = 'present';
      left[guess[i]]--;
    }
  }
  return out;
}

const WordleSolo = (() => {
  const TILE = 104, GAP = 12, GRID_X = 220, GRID_Y = 200;
  const KEY_W = 70, KEY_H = 80, KEY_GAP = 8, KB_X = 1000, KB_Y = 420;
  const COLORS = { correct: '#538d4e', present: '#b59f3b', absent: '#3a3a3c' };
  const RANK = { absent: 1, present: 2, correct: 3 };
  const REVEAL = 0.22; // seconds between tiles turning over
  const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', ['ENTER'].concat('ZXCVBNM'.split(''), ['DEL'])];

  // Keys with their place on screen, for drawing and for moving between rows.
  const KEYS = ROWS.map((row, r) => {
    const list = typeof row === 'string' ? row.split('') : row;
    const widths = list.map(k => (k.length > 1 ? KEY_W * 1.5 + KEY_GAP / 2 : KEY_W));
    const total = widths.reduce((a, b) => a + b, 0) + KEY_GAP * (list.length - 1);
    let x = KB_X + (10 * KEY_W + 9 * KEY_GAP - total) / 2;
    return list.map((k, i) => {
      const key = { k, x, y: KB_Y + r * (KEY_H + KEY_GAP), w: widths[i] };
      x += widths[i] + KEY_GAP;
      return key;
    });
  });

  let answer, guesses, typed, marks, letters, row, col, msg, msgUntil, revealAt, done, pending;
  let stats = Platform.load('wordle', { played: 0, won: 0, streak: 0, best: 0 });

  function newGame() {
    const n = Math.floor(Math.random() * WORDLE_ANSWERS.length / 5);
    answer = WORDLE_ANSWERS.substr(n * 5, 5);
    guesses = [];
    marks = [];
    letters = {};
    typed = '';
    done = null;
    revealAt = 0;
    pending = null;
    say('');
  }

  function say(text, secs) {
    msg = text;
    msgUntil = secs ? clock + secs : Infinity;
  }

  function finish(won) {
    done = won ? 'won' : 'lost';
    stats.played++;
    if (won) {
      stats.won++;
      stats.streak++;
      stats.best = Math.max(stats.best, stats.streak);
    } else stats.streak = 0;
    Platform.save('wordle', stats);
  }

  function submit() {
    if (typed.length < 5) return say('NOT ENOUGH LETTERS', 1.5);
    if (!isWordleWord(typed)) return say('NOT IN WORD LIST', 1.5);
    const m = wordleMarks(answer, typed);
    guesses.push(typed);
    marks.push(m);
    revealAt = clock;
    pending = { guess: typed, m };
    const guess = typed;
    typed = '';
    if (guess === answer) {
      finish(true);
      say(['GENIUS', 'MAGNIFICENT', 'IMPRESSIVE', 'SPLENDID', 'GREAT', 'PHEW'][guesses.length - 1]);
    } else if (guesses.length === 6) {
      finish(false);
      say('THE WORD WAS ' + answer);
    } else say('');
  }

  function giveUp() {
    if (done) return;
    finish(false);
    typed = '';
    say('THE WORD WAS ' + answer);
  }

  // One letter, DEL or ENTER, from either keyboard.
  function press(k) {
    if (done) return k === 'ENTER' && newGame();
    if (k === 'ENTER') submit();
    else if (k === 'DEL') typed = typed.slice(0, -1);
    else if (typed.length < 5) typed += k;
  }

  // The keyboard catches up once the row has turned over.
  function update() {
    if (!pending || clock - revealAt < REVEAL * 5) return;
    const { guess, m } = pending;
    for (let i = 0; i < 5; i++) {
      if (RANK[m[i]] > (RANK[letters[guess[i]]] || 0)) letters[guess[i]] = m[i];
    }
    pending = null;
  }

  function drawTile(g, x, y, ch, fill, edge) {
    g.fillStyle = fill || 'rgba(0,0,0,0)';
    g.fillRect(x, y, TILE, TILE);
    if (edge) {
      g.strokeStyle = edge;
      g.lineWidth = 4;
      g.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
    }
    if (ch) drawText(g, ch, x + TILE / 2, y + TILE / 2 - 3.5 * 7, 7, '#ffffff', { align: 'center' });
  }

  function drawGrid(g) {
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 5; c++) {
        const x = GRID_X + c * (TILE + GAP), y = GRID_Y + r * (TILE + GAP);
        if (r < guesses.length) {
          const shown = r < guesses.length - 1 || clock - revealAt >= c * REVEAL;
          if (shown) drawTile(g, x, y, guesses[r][c], COLORS[marks[r][c]]);
          else drawTile(g, x, y, guesses[r][c], null, '#565758');
        } else if (r === guesses.length && !done) {
          drawTile(g, x, y, typed[c], null, typed[c] ? '#565758' : '#3a3a3c');
        } else drawTile(g, x, y, '', null, '#3a3a3c');
      }
    }
  }

  function drawKeys(g) {
    KEYS.forEach((list, r) => list.forEach((key, c) => {
      const on = r === row && c === col;
      roundRectPath(g, key.x, key.y, key.w, KEY_H, 8);
      g.fillStyle = COLORS[letters[key.k]] || '#818384';
      g.fill();
      if (on) {
        g.strokeStyle = '#ffffff';
        g.lineWidth = 5;
        g.stroke();
      }
      const cell = key.k.length > 1 ? 3 : 5;
      drawText(g, key.k, key.x + key.w / 2, key.y + KEY_H / 2 - 3.5 * cell, cell, '#ffffff', { align: 'center', style: key.k.length > 1 ? 'thin' : 'led' });
    }));
  }

  function draw(g) {
    drawBackground(g, '#1d2026', '#0e1013');
    drawGrid(g);
    const mid = KB_X + (10 * KEY_W + 9 * KEY_GAP) / 2;
    drawText(g, 'WORDLE', mid, GRID_Y, 12, '#ffffff', { align: 'center' });
    if (msg && clock < msgUntil) drawText(g, msg, mid, 320, 5, '#ffffff', { style: 'thin', align: 'center' });
    drawKeys(g);
    const pct = stats.played ? Math.round(stats.won / stats.played * 100) : 0;
    drawText(g, 'PLAYED ' + stats.played + '   WON ' + pct + '%   STREAK ' + stats.streak + '   BEST ' + stats.best,
      mid, KB_Y + 3 * (KEY_H + KEY_GAP) + 50, 3.5, '#9aa0a8', { style: 'thin', align: 'center' });
    const hint = done ? 'OK NEW WORD   BACK MENU' : 'TYPE ON YOUR PHONE OR PICK LETTERS   BACK MENU';
    drawText(g, hint, mid, KB_Y + 3 * (KEY_H + KEY_GAP) + 110, 3.5, '#5d636c', { style: 'thin', align: 'center' });
    drawLightBar(g);
  }

  function key(k, repeat) {
    if (done && k === 'ok' && !repeat) return newGame();
    const here = KEYS[row][col];
    if (k === 'left') col = (col + KEYS[row].length - 1) % KEYS[row].length;
    else if (k === 'right') col = (col + 1) % KEYS[row].length;
    else if (k === 'up' || k === 'down') {
      // The key in the next row nearest the one under the cursor.
      row = (row + (k === 'up' ? 2 : 1)) % 3;
      const cx = here.x + here.w / 2;
      col = KEYS[row].reduce((best, key, i) => (Math.abs(key.x + key.w / 2 - cx) < Math.abs(KEYS[row][best].x + KEYS[row][best].w / 2 - cx) ? i : best), 0);
    } else if (k === 'ok' && !repeat) press(here.k);
  }

  // Typing from a phone: letters, '\b' to delete and '\n' to enter.
  function type(ch) {
    if (ch === '\b') press('DEL');
    else if (ch === '\n') press('ENTER');
    else if (/^[a-z]$/i.test(ch)) press(ch.toUpperCase());
  }

  function enter() {
    row = 0;
    col = 0;
    newGame();
  }

  // For the phone's own Wordle (grid and keyboard): letters, colours and what's typed.
  function phoneState() {
    const code = { correct: 'c', present: 'p', absent: 'a' };
    return { words: guesses, rows: marks.map(m => m.map(x => code[x]).join('')), typed, done: !!done, msg: msg && clock < msgUntil ? msg : '' };
  }

  return { enter, update, draw, key, type, giveUp, phoneState };
})();
