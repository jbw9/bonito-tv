// Air hockey, 1 on 1 or 2 on 2: seats 1 and 3 defend the left goal, 2 and 4 the
// right (js/party.js). A phone is a touch pad for its side of the table: the paddle
// follows the finger. First to seven.
App.screens.hockey = (() => {
  const X0 = 160, Y0 = 170, TW = 1600, TH = 800, MID_Y = Y0 + TH / 2, GOAL = 300;
  const PUCK_R = 26, PAD_R = 48, MAX_PUCK = 2600, TO_WIN = 7;
  const SPEED = { phone: 3200, tv: 1300, cpu: 1050 }; // paddle px/s
  const SUBSTEPS = 4;
  const party = makeParty('AIR HOCKEY', 4);
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  // Each of party.players also gets side (0 left, 1 right), x, y, tx, ty, vx, vy.
  let mode = 'lobby', puck, score, timer, flash = 0, held = {}, winSide;

  const table = makeCanvas(TW, TH, b => {
    roundRectPath(b, 0, 0, TW, TH, 60);
    b.fillStyle = '#10243a';
    b.fill();
    b.strokeStyle = 'rgba(255,255,255,0.25)';
    b.lineWidth = 4;
    b.beginPath();
    b.moveTo(TW / 2, 0);
    b.lineTo(TW / 2, TH);
    b.stroke();
    b.beginPath();
    b.arc(TW / 2, TH / 2, 110, 0, Math.PI * 2);
    b.stroke();
    [0, TW].forEach(x => {
      b.beginPath();
      b.arc(x, TH / 2, 190, 0, Math.PI * 2);
      b.stroke();
    });
    b.lineWidth = 8;
    b.strokeStyle = 'rgba(255,255,255,0.5)';
    roundRectPath(b, 4, 4, TW - 8, TH - 8, 56);
    b.stroke();
  });

  const minX = p => p.side ? X0 + TW / 2 + PAD_R : X0 + PAD_R;
  const maxX = p => p.side ? X0 + TW - PAD_R : X0 + TW / 2 - PAD_R;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const sidePlayers = side => party.players.filter(p => p.side === side);

  function home(p) {
    const team = sidePlayers(p.side), i = team.indexOf(p);
    p.x = p.tx = p.side ? X0 + TW - 200 : X0 + 200;
    p.y = p.ty = Y0 + TH * (i + 1) / (team.length + 1);
    p.vx = p.vy = 0;
  }

  // The puck waits, still, in front of whoever was scored on.
  function serve(side) {
    puck = { x: X0 + TW / 2 + (side ? 220 : -220), y: MID_Y, vx: 0, vy: 0 };
  }

  function startRound() {
    if (!party.begin()) return;
    party.players.forEach((p, i) => { p.side = i % 2; });
    party.players.forEach(home);
    score = [0, 0];
    held = {};
    serve(Math.random() < 0.5 ? 0 : 1);
    mode = 'countdown';
    timer = 3;
  }

  function toLobby() {
    mode = 'lobby';
    party.toLobby();
  }

  // Goes for the puck while it's on its side, otherwise guards the goal mouth.
  function steer(p) {
    const mine = p.side ? puck.x > X0 + TW / 2 : puck.x < X0 + TW / 2;
    const goalX = p.side ? X0 + TW : X0, back = p.side ? 1 : -1;
    if (mine) {
      p.tx = puck.x + back * PAD_R * 0.6;
      p.ty = puck.y;
    } else {
      p.tx = goalX - back * 160;
      p.ty = clamp(puck.y, MID_Y - GOAL / 2, MID_Y + GOAL / 2);
    }
  }

  function movePaddles(dt) {
    party.players.forEach(p => {
      if (p.cpu) steer(p);
      else if (p.id === 'tv') {
        Object.keys(DIRS).forEach(k => {
          if (!held[k]) return;
          p.tx = p.x + DIRS[k][0] * 200;
          p.ty = p.y + DIRS[k][1] * 200;
        });
        if (!Object.keys(DIRS).some(k => held[k])) {
          p.tx = p.x;
          p.ty = p.y;
        }
      }
      p.tx = clamp(p.tx, minX(p), maxX(p));
      p.ty = clamp(p.ty, Y0 + PAD_R, Y0 + TH - PAD_R);
      const max = SPEED[p.cpu ? 'cpu' : p.id === 'tv' ? 'tv' : 'phone'] * dt;
      const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
      const k = d > max ? max / d : 1;
      p.vx = dx * k / dt;
      p.vy = dy * k / dt;
      p.x += dx * k;
      p.y += dy * k;
    });
  }

  function hit(p) {
    const dx = puck.x - p.x, dy = puck.y - p.y, d = Math.hypot(dx, dy), min = PUCK_R + PAD_R;
    if (d >= min || d === 0) return;
    const nx = dx / d, ny = dy / d;
    puck.x = p.x + nx * min;
    puck.y = p.y + ny * min;
    const along = (puck.vx - p.vx) * nx + (puck.vy - p.vy) * ny;
    if (along < 0) {
      puck.vx -= 1.9 * along * nx;
      puck.vy -= 1.9 * along * ny;
    }
    const v = Math.hypot(puck.vx, puck.vy);
    if (v > MAX_PUCK) {
      puck.vx *= MAX_PUCK / v;
      puck.vy *= MAX_PUCK / v;
    }
  }

  // Returns the side that scored, if the puck went in.
  function movePuck(h) {
    puck.x += puck.vx * h;
    puck.y += puck.vy * h;
    if (puck.y < Y0 + PUCK_R) {
      puck.y = Y0 + PUCK_R;
      puck.vy = Math.abs(puck.vy) * 0.9;
    } else if (puck.y > Y0 + TH - PUCK_R) {
      puck.y = Y0 + TH - PUCK_R;
      puck.vy = -Math.abs(puck.vy) * 0.9;
    }
    const mouth = Math.abs(puck.y - MID_Y) < GOAL / 2;
    if (puck.x < X0 + PUCK_R && !mouth) {
      puck.x = X0 + PUCK_R;
      puck.vx = Math.abs(puck.vx) * 0.9;
    } else if (puck.x > X0 + TW - PUCK_R && !mouth) {
      puck.x = X0 + TW - PUCK_R;
      puck.vx = -Math.abs(puck.vx) * 0.9;
    }
    if (puck.x < X0 - PUCK_R) return 1;
    if (puck.x > X0 + TW + PUCK_R) return 0;
    party.players.forEach(hit);
    return -1;
  }

  function goal(side) {
    score[side]++;
    flash = 0.6;
    if (score[side] >= TO_WIN) {
      winSide = side;
      sidePlayers(side).forEach(p => { p.wins++; });
      mode = 'over';
      timer = 3.5;
      return;
    }
    mode = 'goal';
    timer = 1.4;
  }

  function update(dt) {
    flash = Math.max(0, flash - dt * 2.5);
    if (mode === 'countdown' || mode === 'goal') {
      timer -= dt;
      if (timer > 0) return;
      if (mode === 'goal') {
        party.players.forEach(home);
        serve(puck.x < X0 + TW / 2 ? 0 : 1);
      }
      mode = 'play';
    } else if (mode === 'play') {
      movePaddles(dt);
      for (let i = 0; i < SUBSTEPS; i++) {
        const scored = movePuck(dt / SUBSTEPS);
        if (scored >= 0) return goal(scored);
      }
      const drag = Math.exp(-0.25 * dt);
      puck.vx *= drag;
      puck.vy *= drag;
    } else if (mode === 'over') {
      timer -= dt;
      if (timer <= 0) toLobby();
    }
  }

  function teamName(side) {
    return sidePlayers(side).map(p => p.name).join(' + ');
  }

  function drawDisc(g, x, y, r, color) {
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  function drawTable(g) {
    g.drawImage(table, X0, Y0);
    [0, 1].forEach(side => {
      const team = sidePlayers(side);
      g.fillStyle = team.length ? team[0].color : '#ffffff';
      g.fillRect(side ? X0 + TW - 6 : X0 - 10, MID_Y - GOAL / 2, 16, GOAL);
      drawText(g, teamName(side), side ? W - 160 : 160, 70, 4.5, g.fillStyle, { style: 'thin', align: side ? 'right' : 'left' });
    });
    drawText(g, score[0] + '  ' + score[1], W / 2, 62, 8, '#ffffff', { align: 'center' });

    party.players.forEach(p => {
      drawDisc(g, p.x, p.y, PAD_R, p.color);
      drawDisc(g, p.x, p.y, PAD_R * 0.55, 'rgba(0,0,0,0.25)');
      drawDisc(g, p.x, p.y, PAD_R * 0.4, p.color);
    });
    drawDisc(g, puck.x, puck.y, PUCK_R, '#f4f6f8');
    drawDisc(g, puck.x, puck.y, PUCK_R * 0.6, '#c9cdd3');

    if (mode === 'countdown') drawText(g, String(Math.ceil(timer)), W / 2, MID_Y - 70, 20, '#ffffff', { align: 'center' });
    else if (mode === 'goal') drawText(g, 'GOAL', W / 2, MID_Y - 70, 20, '#ffffff', { align: 'center' });
    else if (mode === 'over') party.drawWinner(g, teamName(winSide) + ' WIN' + (sidePlayers(winSide).length > 1 ? '' : 'S'), sidePlayers(winSide)[0].color);
  }

  function draw(g) {
    drawBackground(g, '#191c22', '#0c0e11');
    if (mode === 'lobby') party.drawLobby(g);
    else drawTable(g);
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
    else if (DIRS[k]) held[k] = true;
  }

  function keyUp(k) {
    held[k] = false;
  }

  // Touch pad: x, y from 0 to 1 across the player's half of the table.
  function phone(event, p) {
    if (party.phone(event, p, startRound) || event !== 'touch') return;
    const me = party.find(p.id);
    if (!me || me.side == null) return;
    me.tx = minX(me) + clamp(+p.x || 0, 0, 1) * (maxX(me) - minX(me));
    me.ty = Y0 + PAD_R + clamp(+p.y || 0, 0, 1) * (TH - PAD_R * 2);
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
