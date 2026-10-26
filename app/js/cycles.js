// Light cycles for 2-4, steered with the phone's arrow pad (seats: js/party.js).
// Last one riding wins the round.
App.screens.cycles = (() => {
  const CELL = 18, COLS = 96, ROWS = 44, X0 = (W - COLS * CELL) / 2, Y0 = 140;
  const STEP = { slow: 0.1, normal: 0.08, fast: 0.065 }; // seconds per move
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const STARTS = [[12, 11, 'right'], [COLS - 13, ROWS - 12, 'left'], [12, ROWS - 12, 'right'], [COLS - 13, 11, 'left']];

  const arena = makeCanvas(COLS * CELL, ROWS * CELL, b => {
    b.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = 0; x <= COLS; x += 4) b.fillRect(x * CELL, 0, 1, ROWS * CELL);
    for (let y = 0; y <= ROWS; y += 4) b.fillRect(0, y * CELL, COLS * CELL, 1);
  });
  const trail = makeCanvas(COLS * CELL, ROWS * CELL, () => {});

  const party = makeParty('LIGHT CYCLES', 4);
  // Each of party.players also gets x, y, dir, turns and alive for the round.
  let mode = 'lobby', grid, wait, timer, winner, flash = 0;

  const opposite = (a, b) => DIRS[a][0] === -DIRS[b][0] && DIRS[a][1] === -DIRS[b][1];
  const blocked = (x, y) => x < 0 || y < 0 || x >= COLS || y >= ROWS || grid[y * COLS + x] > 0;

  function startRound() {
    if (!party.begin()) return;
    grid = new Uint8Array(COLS * ROWS);
    trail.getContext('2d').clearRect(0, 0, trail.width, trail.height);
    party.players.forEach((p, i) => {
      const [x, y, dir] = STARTS[i];
      Object.assign(p, { x, y, dir, turns: [], alive: true });
      mark(p, x, y);
    });
    winner = null;
    mode = 'countdown';
    timer = 3;
  }

  // A trail is a line from cell centre to cell centre, so it reads as one ribbon.
  function mark(p, fromX, fromY) {
    grid[p.y * COLS + p.x] = 1;
    const g = trail.getContext('2d'), pad = 5;
    g.fillStyle = p.color;
    g.fillRect(Math.min(fromX, p.x) * CELL + pad, Math.min(fromY, p.y) * CELL + pad,
      (Math.abs(p.x - fromX) + 1) * CELL - pad * 2, (Math.abs(p.y - fromY) + 1) * CELL - pad * 2);
  }

  function room(p, d) {
    let n = 0, x = p.x, y = p.y;
    while (n < 30) {
      x += DIRS[d][0];
      y += DIRS[d][1];
      if (blocked(x, y)) break;
      n++;
    }
    return n;
  }

  // The CPU rides on while the way ahead is open and otherwise turns toward the most
  // room, with the odd turn anyway so it doesn't just circle the edge.
  function steer(p) {
    const ahead = room(p, p.dir);
    if (ahead > 4 && Math.random() > 0.03) return;
    let best = p.dir, most = ahead;
    Object.keys(DIRS).forEach(d => {
      if (opposite(d, p.dir)) return;
      const r = room(p, d);
      if (r > most) {
        best = d;
        most = r;
      }
    });
    p.dir = best;
  }

  function turn(p, k) {
    if (!p || !p.alive || !DIRS[k]) return;
    const last = p.turns.length ? p.turns[p.turns.length - 1] : p.dir;
    if (k !== last && !opposite(k, last) && p.turns.length < 2) p.turns.push(k);
  }

  function step() {
    const live = party.players.filter(p => p.alive);
    live.forEach(p => {
      if (p.cpu) steer(p);
      else if (p.turns.length) p.dir = p.turns.shift();
      p.nx = p.x + DIRS[p.dir][0];
      p.ny = p.y + DIRS[p.dir][1];
    });
    // Decide every crash before anyone moves, so riding into the same cell takes out both.
    const crashed = live.filter(p => blocked(p.nx, p.ny) || live.some(o => o !== p && o.nx === p.nx && o.ny === p.ny));
    live.forEach(p => {
      if (crashed.indexOf(p) >= 0) {
        p.alive = false;
        return;
      }
      const fx = p.x, fy = p.y;
      p.x = p.nx;
      p.y = p.ny;
      mark(p, fx, fy);
    });
    if (crashed.length) flash = 0.5;
    const left = party.players.filter(p => p.alive);
    if (left.length > 1) return;
    winner = left[0] || null;
    if (winner) winner.wins++;
    mode = 'over';
    timer = 3.5;
  }

  function update(dt) {
    flash = Math.max(0, flash - dt * 2.5);
    if (mode === 'countdown') {
      timer -= dt;
      if (timer <= 0) {
        mode = 'play';
        wait = 0;
      }
    } else if (mode === 'play') {
      wait -= dt;
      while (wait <= 0 && mode === 'play') {
        wait += STEP[settings.speed];
        step();
      }
    } else if (mode === 'over') {
      timer -= dt;
      if (timer <= 0) toLobby();
    }
  }

  function toLobby() {
    mode = 'lobby';
    party.toLobby();
  }

  function drawArena(g) {
    g.strokeStyle = 'rgba(255,255,255,0.32)';
    g.lineWidth = 3;
    g.strokeRect(X0 - 4, Y0 - 4, COLS * CELL + 8, ROWS * CELL + 8);
    g.drawImage(arena, X0, Y0);
    g.drawImage(trail, X0, Y0);
    const players = party.players;
    players.forEach(p => {
      const x = X0 + p.x * CELL, y = Y0 + p.y * CELL;
      g.fillStyle = p.alive ? '#ffffff' : 'rgba(255,255,255,0.3)';
      g.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
    });

    // Scores along the top, each in its rider's colour.
    const span = W / (players.length + 1);
    players.forEach((p, i) => {
      drawText(g, p.name + ' ' + p.wins, span * (i + 1), 70, 4.5, p.color, { style: 'thin', align: 'center', alpha: p.alive || mode !== 'play' ? 1 : 0.35 });
    });

    if (mode === 'countdown') {
      drawText(g, String(Math.ceil(timer)), W / 2, H / 2 - 70, 20, '#ffffff', { align: 'center' });
      players.forEach(p => {
        drawText(g, p.name, X0 + p.x * CELL + (p.dir === 'left' ? -20 : 40), Y0 + p.y * CELL - 4, 3.5, p.color, { style: 'thin', align: p.dir === 'left' ? 'right' : 'left' });
      });
    } else if (mode === 'over') {
      party.drawWinner(g, winner ? winner.name + ' WINS' : 'DRAW', winner ? winner.color : '#ffffff');
    }
  }

  function draw(g) {
    drawBackground(g, '#191c22', '#0c0e11');
    if (mode === 'lobby') party.drawLobby(g);
    else drawArena(g);
    drawLightBar(g);
    if (flash > 0) {
      g.fillStyle = 'rgba(255,255,255,' + flash * 0.4 + ')';
      g.fillRect(0, 0, W, H);
    }
  }

  function key(k, repeat) {
    if (mode === 'lobby') party.lobbyKey(k, repeat, startRound);
    else if (k === 'back') toLobby();
    else if (mode === 'over' && k === 'ok') toLobby();
    else turn(party.find('tv'), k);
  }

  function phone(event, p) {
    if (!party.phone(event, p, startRound) && event === 'pad') turn(party.find(p.id), p.k);
  }

  function phoneState() {
    return party.state(mode);
  }

  function enter() {
    mode = 'lobby';
    party.reset();
  }

  return { enter, update, draw, key, phone, phoneState };
})();
