// Tic tac toe for two (seats: js/party.js), or one against the CPU. Phones get the
// board to tap; on the TV remote, arrows move and OK places. Rounds run back to back,
// starting with whoever didn't start the last one.
App.screens.ttt = (() => {
  const CELL = 240, X0 = (W - CELL * 3) / 2, Y0 = 210;
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const MARKS = ['X', 'O'];
  const party = makeParty('TIC TAC TOE', 2);

  // board: 9 cells, each null or the seat (0 is X, 1 is O) that took it.
  let mode = 'lobby', board, turn, first, cursor = 4, timer, result, cpuAt;

  function outcome(b) {
    for (const l of LINES) if (b[l[0]] != null && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return { seat: b[l[0]], line: l };
    return b.every(c => c != null) ? { draw: true } : null;
  }

  // Best move for `seat` by full search: the board is small enough to try everything.
  function negamax(b, seat) {
    if (outcome(b)) return { score: outcome(b).draw ? 0 : -1 }; // the last mover won
    let best = { score: -2, move: -1 };
    for (let i = 0; i < 9; i++) {
      if (b[i] != null) continue;
      b[i] = seat;
      const score = -negamax(b, 1 - seat).score;
      b[i] = null;
      if (score > best.score) best = { score, move: i };
    }
    return best;
  }

  // Plays perfectly most of the time, so it can be beaten now and then.
  function cpuMove() {
    const free = board.map((c, i) => (c == null ? i : -1)).filter(i => i >= 0);
    place(turn, Math.random() < 0.25 ? free[Math.floor(Math.random() * free.length)] : negamax(board.slice(), turn).move);
  }

  function newBoard() {
    board = Array(9).fill(null);
    turn = first;
    result = null;
    mode = 'play';
    cpuAt = clock + 0.8;
  }

  function startRound() {
    if (!party.begin()) return;
    first = 0;
    newBoard();
  }

  function toLobby() {
    mode = 'lobby';
    party.toLobby();
  }

  function place(seat, i) {
    if (mode !== 'play' || seat !== turn || !(i >= 0 && i < 9) || board[i] != null) return;
    board[i] = seat;
    result = outcome(board);
    if (!result) {
      turn = 1 - turn;
      cpuAt = clock + 0.7;
      return;
    }
    if (!result.draw) party.players[result.seat].wins++;
    mode = 'over';
    timer = 2.5;
  }

  function update(dt) {
    if (mode === 'play' && party.players[turn].cpu && clock >= cpuAt) cpuMove();
    else if (mode === 'over') {
      timer -= dt;
      if (timer > 0) return;
      first = 1 - first;
      newBoard();
    }
  }

  function drawMark(g, seat, cx, cy, color) {
    g.strokeStyle = color;
    g.lineWidth = 22;
    g.lineCap = 'round';
    g.beginPath();
    if (seat === 0) {
      const r = CELL * 0.28;
      g.moveTo(cx - r, cy - r);
      g.lineTo(cx + r, cy + r);
      g.moveTo(cx + r, cy - r);
      g.lineTo(cx - r, cy + r);
    } else g.arc(cx, cy, CELL * 0.3, 0, Math.PI * 2);
    g.stroke();
  }

  const centre = i => [X0 + (i % 3 + 0.5) * CELL, Y0 + (Math.floor(i / 3) + 0.5) * CELL];

  function drawBoard(g) {
    g.fillStyle = 'rgba(255,255,255,0.32)';
    for (let k = 1; k < 3; k++) {
      g.fillRect(X0 + k * CELL - 4, Y0 + 12, 8, CELL * 3 - 24);
      g.fillRect(X0 + 12, Y0 + k * CELL - 4, CELL * 3 - 24, 8);
    }
    const tv = party.players.findIndex(p => p.id === 'tv');
    if (mode === 'play' && tv === turn) {
      g.strokeStyle = 'rgba(255,255,255,0.5)';
      g.lineWidth = 4;
      g.strokeRect(X0 + (cursor % 3) * CELL + 18, Y0 + Math.floor(cursor / 3) * CELL + 18, CELL - 36, CELL - 36);
    }
    board.forEach((seat, i) => {
      if (seat == null) return;
      const [cx, cy] = centre(i);
      drawMark(g, seat, cx, cy, party.players[seat].color);
    });
    if (result && result.line) {
      const [ax, ay] = centre(result.line[0]), [bx, by] = centre(result.line[2]);
      g.strokeStyle = '#ffffff';
      g.lineWidth = 12;
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.stroke();
    }

    // Players either side, whoever's turn it is lit up.
    party.players.forEach((p, seat) => {
      const x = seat ? X0 + CELL * 3 + 120 : X0 - 120, align = seat ? 'left' : 'right';
      const lit = mode === 'play' ? seat === turn : result && result.seat === seat;
      drawText(g, MARKS[seat], x, Y0 + 230, 12, p.color, { align, alpha: lit ? 1 : 0.35 });
      drawText(g, p.name, x, Y0 + 350, 5.5, '#ffffff', { style: 'thin', align, alpha: lit ? 1 : 0.5 });
      drawText(g, p.wins + (p.wins === 1 ? ' WIN' : ' WINS'), x, Y0 + 420, 4.5, p.color, { style: 'thin', align });
    });
    if (mode === 'over') drawText(g, result.draw ? 'DRAW' : party.players[result.seat].name + ' WINS', W / 2, 110, 8, result.draw ? '#ffffff' : party.players[result.seat].color, { align: 'center' });
    else drawText(g, party.players[turn].name + "'S TURN", W / 2, 120, 5, party.players[turn].color, { style: 'thin', align: 'center' });
  }

  function draw(g) {
    drawBackground(g, '#191c22', '#0c0e11');
    if (mode === 'lobby') party.drawLobby(g);
    else drawBoard(g);
    drawLightBar(g);
  }

  function key(k, repeat) {
    if (mode === 'lobby') return party.lobbyKey(k, repeat, startRound);
    if (k === 'back') return toLobby();
    const x = cursor % 3, y = Math.floor(cursor / 3);
    if (k === 'left') cursor = y * 3 + (x + 2) % 3;
    else if (k === 'right') cursor = y * 3 + (x + 1) % 3;
    else if (k === 'up') cursor = ((y + 2) % 3) * 3 + x;
    else if (k === 'down') cursor = ((y + 1) % 3) * 3 + x;
    else if (k === 'ok' && !repeat) place(party.players.findIndex(p => p.id === 'tv'), cursor);
  }

  function phone(event, p) {
    if (!party.phone(event, p, startRound) && event === 'place') place(party.players.findIndex(q => q.id === p.id), p.i);
  }

  // Phones draw the board from this: cells hold seats, `turn` is whose go it is.
  function phoneState() {
    return Object.assign(party.state(mode), {
      board: mode === 'lobby' ? null : board,
      turn: mode === 'play' ? party.players[turn].id : null,
    });
  }

  function enter() {
    mode = 'lobby';
    party.reset();
  }

  return { enter, update, draw, key, phone, phoneState };
})();
