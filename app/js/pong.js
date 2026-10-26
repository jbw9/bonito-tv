// Pong for 2-4 on a square court, one paddle per side (seats: js/party.js); sides
// nobody holds are walls. A phone is a touch pad: the paddle follows the finger along
// its side. Five lives each; last one standing wins.
App.screens.pong = (() => {
  const S = 820, X0 = (W - S) / 2, Y0 = 160, PAD_L = 170, PAD_T = 18, BALL_R = 13, LIVES = 5;
  const BALL_SPEED = 620, MAX_BALL = 1500, BEND = 1.05; // radians at the paddle's tip
  const SPEED = { phone: 3.2, tv: 1.3, cpu: 0.95 }; // paddle courts/s
  // Left, right, top, bottom: the axis a ball crosses, where, and which way is in.
  const SIDES = [
    { axis: 'x', along: 'y', at: X0, dir: 1 },
    { axis: 'x', along: 'y', at: X0 + S, dir: -1 },
    { axis: 'y', along: 'x', at: Y0, dir: 1 },
    { axis: 'y', along: 'x', at: Y0 + S, dir: -1 },
  ];
  const ORIGIN = { x: X0, y: Y0 };
  const LO = PAD_L / 2 / S, HI = 1 - LO;
  const party = makeParty('PONG', 4);

  // Each of party.players also gets side (its seat), pos and target (0-1 along its
  // side) and lives.
  let mode = 'lobby', ball, timer, flash = 0, held = {}, winner;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const holder = side => party.players.find(p => p.side === side && p.lives > 0);

  function serve() {
    const live = party.players.filter(p => p.lives > 0);
    const to = SIDES[live[Math.floor(Math.random() * live.length)].side];
    const a = (Math.random() * 2 - 1) * 0.6;
    ball = { x: X0 + S / 2, y: Y0 + S / 2, speed: BALL_SPEED };
    ball['v' + to.axis] = -to.dir * Math.cos(a) * BALL_SPEED;
    ball['v' + to.along] = Math.sin(a) * BALL_SPEED;
    mode = 'serve';
    timer = 1;
  }

  function startRound() {
    if (!party.begin()) return;
    party.players.forEach((p, i) => Object.assign(p, { side: i, pos: 0.5, target: 0.5, lives: LIVES }));
    held = {};
    serve();
    mode = 'countdown';
    timer = 3;
  }

  function toLobby() {
    mode = 'lobby';
    party.toLobby();
  }

  // Follows the ball while it's coming its way, otherwise drifts back to the middle.
  function steer(p) {
    const s = SIDES[p.side];
    const coming = s.dir * ball['v' + s.axis] < 0;
    p.target = coming ? (ball[s.along] - ORIGIN[s.along]) / S : 0.5;
  }

  function movePaddles(dt) {
    party.players.forEach(p => {
      if (p.lives <= 0) return;
      if (p.cpu) steer(p);
      else if (p.id === 'tv') {
        // Up/down on the left and right, left/right along the top and bottom.
        const s = SIDES[p.side];
        const less = s.along === 'y' ? held.up : held.left, more = s.along === 'y' ? held.down : held.right;
        p.target = less ? 0 : more ? 1 : p.pos;
      }
      p.target = clamp(p.target, LO, HI);
      const max = SPEED[p.cpu ? 'cpu' : p.id === 'tv' ? 'tv' : 'phone'] * dt;
      p.pos += clamp(p.target - p.pos, -max, max);
    });
  }

  function miss(p) {
    p.lives--;
    flash = 0.5;
    const live = party.players.filter(q => q.lives > 0);
    if (live.length > 1) return serve();
    winner = live[0];
    winner.wins++;
    mode = 'over';
    timer = 3.5;
  }

  function moveBall(h) {
    ball.x += ball.vx * h;
    ball.y += ball.vy * h;
    for (let i = 0; i < SIDES.length; i++) {
      const s = SIDES[i], p = holder(i);
      const depth = s.dir * (ball[s.axis] - s.at); // distance inside the court
      if (p && depth < -BALL_R * 2) return miss(p);
      if (depth >= BALL_R || s.dir * ball['v' + s.axis] >= 0) continue;
      if (!p) {
        ball[s.axis] = s.at + s.dir * BALL_R;
        ball['v' + s.axis] *= -1;
        continue;
      }
      // Off the paddle at an angle set by where it hit, a little faster each time.
      const off = (ball[s.along] - (ORIGIN[s.along] + p.pos * S)) / (PAD_L / 2 + BALL_R);
      if (Math.abs(off) > 1 || depth < 0) continue;
      ball.speed = Math.min(MAX_BALL, ball.speed * 1.05);
      ball[s.axis] = s.at + s.dir * BALL_R;
      ball['v' + s.axis] = s.dir * Math.cos(off * BEND) * ball.speed;
      ball['v' + s.along] = Math.sin(off * BEND) * ball.speed;
    }
  }

  function update(dt) {
    flash = Math.max(0, flash - dt * 2.5);
    if (mode === 'countdown' || mode === 'serve') {
      movePaddles(dt);
      timer -= dt;
      if (timer <= 0) mode = 'play';
    } else if (mode === 'play') {
      movePaddles(dt);
      for (let i = 0; i < 3 && mode === 'play'; i++) moveBall(dt / 3);
    } else if (mode === 'over') {
      timer -= dt;
      if (timer <= 0) toLobby();
    }
  }

  // Name and lives just outside each side.
  function drawLabel(g, p) {
    const text = p.name + ' ' + (p.lives > 0 ? p.lives : 'OUT');
    const ink = p.lives > 0 ? p.color : '#5d636c';
    if (p.side === 0) drawText(g, text, X0 - 50, Y0 + S / 2 - 14, 4.5, ink, { style: 'thin', align: 'right' });
    else if (p.side === 1) drawText(g, text, X0 + S + 50, Y0 + S / 2 - 14, 4.5, ink, { style: 'thin' });
    else if (p.side === 2) drawText(g, text, W / 2, Y0 - 62, 4.5, ink, { style: 'thin', align: 'center' });
    else drawText(g, text, W / 2, Y0 + S + 34, 4.5, ink, { style: 'thin', align: 'center' });
  }

  function drawCourt(g) {
    g.fillStyle = 'rgba(255,255,255,0.03)';
    g.fillRect(X0, Y0, S, S);
    g.fillStyle = 'rgba(255,255,255,0.08)';
    for (let y = Y0; y < Y0 + S; y += 40) g.fillRect(X0 + S / 2 - 2, y + 10, 4, 20);
    SIDES.forEach((s, i) => {
      const p = holder(i);
      if (!p) {
        // Walls: solid edges in grey.
        g.fillStyle = 'rgba(255,255,255,0.32)';
        if (s.axis === 'x') g.fillRect(s.dir > 0 ? X0 - 8 : X0 + S, Y0 - 8, 8, S + 16);
        else g.fillRect(X0 - 8, s.dir > 0 ? Y0 - 8 : Y0 + S, S + 16, 8);
        return;
      }
      const c = ORIGIN[s.along] + p.pos * S - PAD_L / 2;
      g.fillStyle = p.color;
      if (s.axis === 'x') g.fillRect(s.dir > 0 ? X0 - PAD_T : X0 + S, c, PAD_T, PAD_L);
      else g.fillRect(c, s.dir > 0 ? Y0 - PAD_T : Y0 + S, PAD_L, PAD_T);
    });
    party.players.forEach(p => drawLabel(g, p));
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    g.fill();

    if (mode === 'countdown') drawText(g, String(Math.ceil(timer)), W / 2, Y0 + S / 2 - 70, 20, '#ffffff', { align: 'center' });
    else if (mode === 'over') party.drawWinner(g, winner.name + ' WINS', winner.color);
  }

  function draw(g) {
    drawBackground(g, '#191c22', '#0c0e11');
    if (mode === 'lobby') party.drawLobby(g);
    else drawCourt(g);
    drawLightBar(g);
    if (flash > 0) {
      g.fillStyle = 'rgba(255,255,255,' + flash * 0.4 + ')';
      g.fillRect(0, 0, W, H);
    }
  }

  function key(k, repeat) {
    if (mode === 'lobby') return party.lobbyKey(k, repeat, startRound);
    if (k === 'back') toLobby();
    else if (mode === 'over' && k === 'ok') toLobby();
    else held[k] = true;
  }

  function keyUp(k) {
    held[k] = false;
  }

  // Touch pad: x, y from 0 to 1 across the court as seen on the TV; the paddle
  // takes whichever runs along its side.
  function phone(event, p) {
    if (party.phone(event, p, startRound) || event !== 'touch') return;
    const me = party.find(p.id);
    if (!me || me.side == null) return;
    me.target = +(SIDES[me.side].along === 'y' ? p.y : p.x) || 0;
  }

  function phoneState() {
    return party.state(mode);
  }

  function enter() {
    mode = 'lobby';
    party.reset();
  }

  return { enter, update, draw, key, keyUp, phone, phoneState };
})();
