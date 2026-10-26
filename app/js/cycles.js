// Light cycles for 2-4. Phones join from the jam page's Games tab (js/remote.js) and
// steer with its pad; arrows on the TV remote take a seat too. Anyone playing alone
// gets a CPU rival. Last one riding wins the round.
App.screens.cycles = (() => {
  const CELL = 18, COLS = 96, ROWS = 44, X0 = (W - COLS * CELL) / 2, Y0 = 140;
  const STEP = { slow: 0.1, normal: 0.08, fast: 0.065 }; // seconds per move
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const COLORS = [['CYAN', '#38C6F4'], ['ORANGE', '#FF7A1A'], ['PINK', '#FF4FA3'], ['YELLOW', '#FFD60A']];
  const STARTS = [[12, 11, 'right'], [COLS - 13, ROWS - 12, 'left'], [12, ROWS - 12, 'right'], [COLS - 13, 11, 'left']];
  const QR_FIT = 380;

  const arena = makeCanvas(COLS * CELL, ROWS * CELL, b => {
    b.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = 0; x <= COLS; x += 4) b.fillRect(x * CELL, 0, 1, ROWS * CELL);
    for (let y = 0; y <= ROWS; y += 4) b.fillRect(0, y * CELL, COLS * CELL, 1);
  });
  const trail = makeCanvas(COLS * CELL, ROWS * CELL, () => {});

  // players: { id, name, color, label, cpu, wins, x, y, dir, turns, alive }
  let mode = 'lobby', players = [], grid, wait, timer, winner, flash = 0, qr = null;

  const opposite = (a, b) => DIRS[a][0] === -DIRS[b][0] && DIRS[a][1] === -DIRS[b][1];
  const blocked = (x, y) => x < 0 || y < 0 || x >= COLS || y >= ROWS || grid[y * COLS + x] > 0;

  function join(id, name) {
    name = String(name || '').toUpperCase().slice(0, 12);
    const p = players.find(q => q.id === id);
    if (p) {
      if (name) p.name = name;
      return;
    }
    if (mode !== 'lobby' || players.length >= COLORS.length) return;
    const free = COLORS.find(c => !players.some(q => q.color === c[1]));
    players.push({ id, name: name || free[0], label: free[0], color: free[1], wins: 0 });
  }

  function toLobby() {
    mode = 'lobby';
    players = players.filter(p => !p.cpu);
  }

  function startRound() {
    if (!players.length) return;
    if (players.length === 1) join('cpu', 'CPU');
    const cpu = players.find(p => p.id === 'cpu');
    if (cpu) cpu.cpu = true;
    grid = new Uint8Array(COLS * ROWS);
    trail.getContext('2d').clearRect(0, 0, trail.width, trail.height);
    players.forEach((p, i) => {
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
    const live = players.filter(p => p.alive);
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
    const left = players.filter(p => p.alive);
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

  function drawLobby(g) {
    drawText(g, 'LIGHT CYCLES', W / 2, 110, 12, '#ffffff', { align: 'center' });
    const slotsX = qr ? 900 : W / 2 - 360;
    if (qr) {
      g.drawImage(qr, 480 - qr.width / 2, 300);
      drawText(g, 'SCAN TO JOIN', 480, 300 + qr.height + 30, 4.5, '#d3d7dd', { style: 'thin', align: 'center' });
    }
    COLORS.forEach((c, i) => {
      const p = players[i], y = 320 + i * 110;
      g.fillStyle = p ? p.color : 'rgba(255,255,255,0.12)';
      g.beginPath();
      g.arc(slotsX, y + 3.5 * 6.5, 16, 0, Math.PI * 2);
      g.fill();
      drawText(g, p ? p.name : 'OPEN SEAT', slotsX + 50, y, 6.5, p ? '#ffffff' : '#5d636c', { style: 'thin' });
      if (p && p.wins) drawText(g, p.wins + (p.wins === 1 ? ' WIN' : ' WINS'), slotsX + 720, y, 6.5, p.color, { style: 'thin', align: 'right' });
    });
    const hint = players.length === 1 ? 'OK START VS CPU' : players.length ? 'OK START' : 'JOIN FROM A PHONE OR PRESS AN ARROW';
    drawText(g, hint + '   BACK EXIT', W / 2, H - 150, 4, '#7d838c', { style: 'thin', align: 'center' });
  }

  function drawArena(g) {
    g.strokeStyle = 'rgba(255,255,255,0.32)';
    g.lineWidth = 3;
    g.strokeRect(X0 - 4, Y0 - 4, COLS * CELL + 8, ROWS * CELL + 8);
    g.drawImage(arena, X0, Y0);
    g.drawImage(trail, X0, Y0);
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
      g.fillStyle = 'rgba(0,0,0,0.6)';
      g.fillRect(0, H / 2 - 110, W, 220);
      drawText(g, winner ? winner.name + ' WINS' : 'DRAW', W / 2, H / 2 - 49, 14, winner ? winner.color : '#ffffff', { align: 'center' });
    }
  }

  function draw(g) {
    drawBackground(g, '#191c22', '#0c0e11');
    if (mode === 'lobby') drawLobby(g);
    else drawArena(g);
    drawLightBar(g);
    if (flash > 0) {
      g.fillStyle = 'rgba(255,255,255,' + flash * 0.4 + ')';
      g.fillRect(0, 0, W, H);
    }
  }

  function key(k, repeat) {
    if (mode === 'lobby') {
      if (k === 'back') App.home();
      else if (k === 'ok' && !repeat) startRound();
      else if (DIRS[k]) join('tv', 'REMOTE');
    } else if (k === 'back') toLobby();
    else if (mode === 'over' && k === 'ok') toLobby();
    else turn(players.find(p => p.id === 'tv'), k);
  }

  // Events from phones (js/remote.js).
  function phone(event, p) {
    if (event === 'join') join(p.id, p.name);
    else if (event === 'leave' && mode === 'lobby') players = players.filter(q => q.id !== p.id);
    else if (event === 'pad') turn(players.find(q => q.id === p.id), p.k);
    else if (event === 'start' && mode === 'lobby') startRound();
  }

  function phoneState() {
    return { mode, players: players.map(p => ({ id: p.id, name: p.name, label: p.label, color: p.color, wins: p.wins, alive: p.alive !== false })) };
  }

  // Seats start empty; phones still on the Games tab take theirs again by themselves.
  function enter() {
    mode = 'lobby';
    players = [];
    if (!qr && Phones.enabled()) qr = Jam.renderQr(qrMatrix(Phones.url('games')), null, QR_FIT);
  }

  return { enter, update, draw, key, phone, phoneState };
})();
