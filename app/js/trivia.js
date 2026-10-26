// Trivia for up to four (seats: js/party.js): ten questions from the Open Trivia
// Database, answered on phones. A right answer scores 500, plus up to 500 more for
// answering fast. Most points after ten wins.
App.screens.trivia = (() => {
  const API = 'https://opentdb.com/api.php?amount=10&type=multiple&encode=url3986';
  const ASK = 15, REVEAL = 4.5;
  const TILES = ['#e21b3c', '#1368ce', '#d89e00', '#26890c']; // same order as the phone's buttons
  const LETTERS = ['A', 'B', 'C', 'D'];
  const TILE_W = 780, TILE_H = 150, TILE_GAP = 40, TILES_X = (W - TILE_W * 2 - TILE_GAP) / 2, TILES_Y = 520;
  const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
  const party = makeParty('TRIVIA', 4);

  // questions: [{ text, category, answers: [4], correct }]. Each of party.players also
  // gets score, pick (answer index), left (seconds left when picked), gain, think (CPU).
  let mode = 'lobby', questions, n, q, timer, sel = 0, winner, error;

  function startRound() {
    if (!party.begin()) return;
    party.players.forEach(p => { p.score = 0; });
    mode = 'loading';
    fetch(API)
      .then(r => r.json())
      .then(d => {
        if (mode !== 'loading') return;
        if (d.response_code !== 0 || !d.results.length) throw new Error('code ' + d.response_code);
        questions = d.results.map(r => {
          const answers = r.incorrect_answers.concat([r.correct_answer]).map(decodeURIComponent);
          for (let i = answers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [answers[i], answers[j]] = [answers[j], answers[i]];
          }
          return { text: decodeURIComponent(r.question), category: decodeURIComponent(r.category), answers, correct: answers.indexOf(decodeURIComponent(r.correct_answer)) };
        });
        n = -1;
        next();
      })
      .catch(err => {
        if (mode !== 'loading') return;
        console.error('trivia', err.message);
        // The database allows one request every five seconds per address.
        error = /code 5/.test(err.message) ? 'TOO QUICK - TRY AGAIN IN A FEW SECONDS' : 'COULD NOT LOAD QUESTIONS';
        mode = 'error';
        timer = 3;
      });
  }

  function toLobby() {
    mode = 'lobby';
    party.toLobby();
  }

  function next() {
    n++;
    if (n >= questions.length) return finish();
    q = questions[n];
    party.players.forEach(p => Object.assign(p, { pick: null, gain: 0, think: 3 + Math.random() * 8 }));
    sel = 0;
    mode = 'ask';
    timer = ASK;
  }

  function reveal() {
    party.players.forEach(p => {
      p.gain = p.pick === q.correct ? 500 + Math.round(500 * p.left / ASK) : 0;
      p.score += p.gain;
    });
    mode = 'reveal';
    timer = REVEAL;
  }

  function finish() {
    winner = party.players.slice().sort((a, b) => b.score - a.score)[0];
    winner.wins++;
    mode = 'over';
    timer = 7;
  }

  function answer(p, i) {
    if (mode !== 'ask' || !p || p.pick != null || !(i >= 0 && i < 4)) return;
    p.pick = i;
    p.left = timer;
  }

  function update(dt) {
    if (mode === 'ask') {
      timer -= dt;
      // The CPU knows a bit over half the answers.
      party.players.forEach(p => {
        if (p.cpu && p.pick == null && ASK - timer >= p.think) answer(p, Math.random() < 0.55 ? q.correct : (q.correct + 1 + Math.floor(Math.random() * 3)) % 4);
      });
      if (timer <= 0 || party.players.every(p => p.pick != null)) reveal();
    } else if (mode === 'reveal') {
      timer -= dt;
      if (timer <= 0) next();
    } else if (mode === 'over' || mode === 'error') {
      timer -= dt;
      if (timer <= 0) toLobby();
    }
  }

  // Wraps to lines no wider than `max` at the current font.
  function wrap(g, text, max) {
    const lines = [];
    let line = '';
    text.split(' ').forEach(word => {
      const tryLine = line ? line + ' ' + word : word;
      if (line && g.measureText(tryLine).width > max) {
        lines.push(line);
        line = word;
      } else line = tryLine;
    });
    if (line) lines.push(line);
    return lines;
  }

  function write(g, text, x, y, size, max, maxLines, color) {
    g.font = '700 ' + size + 'px ' + FONT;
    g.fillStyle = color || '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let lines = wrap(g, text, max);
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] += '…';
    }
    const top = y - (lines.length - 1) * size * 0.6;
    lines.forEach((l, i) => g.fillText(l, x, top + i * size * 1.2));
  }

  function tileRect(i) {
    return [TILES_X + (i % 2) * (TILE_W + TILE_GAP), TILES_Y + Math.floor(i / 2) * (TILE_H + TILE_GAP)];
  }

  function drawQuestion(g) {
    drawText(g, 'QUESTION ' + (n + 1) + ' OF ' + questions.length, W / 2, 80, 4, '#9aa0a8', { style: 'thin', align: 'center' });
    g.font = '500 30px ' + FONT;
    g.fillStyle = '#9aa0a8';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(q.category, W / 2, 150);
    write(g, q.text, W / 2, 300, 56, 1500, 3);

    if (mode === 'ask') {
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(TILES_X, 440, TILE_W * 2 + TILE_GAP, 10);
      g.fillStyle = timer < 5 ? '#ff6b6b' : '#ffffff';
      g.fillRect(TILES_X, 440, (TILE_W * 2 + TILE_GAP) * Math.max(0, timer) / ASK, 10);
    }

    const tv = party.find('tv');
    q.answers.forEach((a, i) => {
      const [x, y] = tileRect(i);
      g.globalAlpha = mode === 'reveal' && i !== q.correct ? 0.25 : 1;
      roundRectPath(g, x, y, TILE_W, TILE_H, 14);
      g.fillStyle = TILES[i];
      g.fill();
      if (mode === 'ask' && tv && tv.pick == null && i === sel) {
        g.strokeStyle = '#ffffff';
        g.lineWidth = 6;
        g.stroke();
      }
      drawText(g, LETTERS[i], x + 50, y + TILE_H / 2 - 3.5 * 6, 6, 'rgba(255,255,255,0.8)', { align: 'center' });
      write(g, a, x + TILE_W / 2 + 30, y + TILE_H / 2, 40, TILE_W - 180, 2);
      g.globalAlpha = 1;
      // Who picked what, once it's shown.
      if (mode !== 'reveal') return;
      party.players.filter(p => p.pick === i).forEach((p, k) => {
        g.fillStyle = p.color;
        g.beginPath();
        g.arc(x + TILE_W - 40 - k * 50, y + TILE_H / 2, 18, 0, Math.PI * 2);
        g.fill();
      });
    });
  }

  function drawScores(g) {
    const span = W / (party.players.length + 1);
    party.players.forEach((p, i) => {
      const x = span * (i + 1), y = 930;
      const answered = mode === 'ask' && p.pick != null;
      drawText(g, p.name + (answered ? ' - IN' : ''), x, y, 4, p.color, { style: 'thin', align: 'center' });
      drawText(g, String(p.score), x, y + 45, 5, '#ffffff', { align: 'center' });
      if (mode === 'reveal' && p.gain) drawText(g, '+' + p.gain, x, y - 50, 4, '#5cff9d', { style: 'thin', align: 'center' });
    });
  }

  function drawFinal(g) {
    party.drawWinner(g, winner.name + ' WINS', winner.color);
    party.players.slice().sort((a, b) => b.score - a.score).forEach((p, i) => {
      drawText(g, (i + 1) + ' ' + p.name + '  ' + p.score, W / 2, H / 2 + 150 + i * 56, 4.5, p.color, { style: 'thin', align: 'center' });
    });
  }

  function draw(g) {
    drawBackground(g, '#2a1f4a', '#120c24');
    if (mode === 'lobby') party.drawLobby(g);
    else if (mode === 'loading') drawText(g, 'LOADING QUESTIONS', W / 2, H / 2 - 30, 6, '#ffffff', { style: 'thin', align: 'center' });
    else if (mode === 'error') drawText(g, error, W / 2, H / 2 - 30, 5, '#ff6b6b', { style: 'thin', align: 'center' });
    else if (mode === 'over') drawFinal(g);
    else {
      drawQuestion(g);
      drawScores(g);
    }
    drawLightBar(g);
  }

  function key(k, repeat) {
    if (mode === 'lobby') return party.lobbyKey(k, repeat, startRound);
    if (k === 'back') return toLobby();
    if (mode !== 'ask') return;
    if (k === 'left' || k === 'right') sel ^= 1;
    else if (k === 'up' || k === 'down') sel ^= 2;
    else if (k === 'ok' && !repeat) answer(party.find('tv'), sel);
  }

  function phone(event, p) {
    if (!party.phone(event, p, startRound) && event === 'answer') answer(party.find(p.id), p.i);
  }

  // Phones show the answers as buttons, and the right one once it's revealed.
  function phoneState() {
    const asking = mode === 'ask' || mode === 'reveal';
    return Object.assign(party.state(mode, p => ({ score: p.score || 0, answered: asking && p.pick != null, gain: mode === 'reveal' ? p.gain : 0 })), {
      q: asking ? { n: n + 1, of: questions.length, answers: q.answers, correct: mode === 'reveal' ? q.correct : null } : null,
    });
  }

  function enter() {
    mode = 'lobby';
    party.reset();
  }

  return { enter, update, draw, key, phone, phoneState };
})();
