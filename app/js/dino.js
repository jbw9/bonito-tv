App.screens.dino = (() => {
  const GROUND = 930, DINO_X = 300, S = 5;
  const SPEED = { slow: 500, normal: 620, fast: 760 };
  const GRAVITY = 3600, JUMP = -1300, SHORT_HOP = -600, DROP = 3;
  const MENU = ['START', 'SETTINGS'];
  const OBSTACLE = '#C9CDD3';

  const BODY = [
    '...........########.',
    '..........##.#######',
    '..........##########',
    '..........##########',
    '..........#####.....',
    '..........########..',
    '#........#####......',
    '#.......#######.....',
    '##.....#########.#..',
    '###..###########....',
    '##############......',
    '.#############......',
    '..############......',
    '...##########.......',
    '....########........',
  ];
  const LEGS = [
    ['.....###.###', '.....##...##', '.....#......', '.....##.....'],
    ['.....###.###', '.....##...##', '...........#', '...........##'],
  ];
  const DUCK = [
    '..................########',
    '#.......#########.#.######',
    '##....####################',
    '##########################',
    '.#################........',
    '..################........',
    '...#############..##......',
  ];
  const DUCK_LEGS = [
    ['....###..##.', '....##....#.', '....#.......'],
    ['....###..##.', '....##.....#', '...........##'],
  ];
  const PTERO = [
    ['......#..........', '......##.........', '......###........', '..#...####.......', '.##...#####......',
      '################.', '....###########..', '.....#######.....'],
    ['.................', '.................', '.................', '..#..............', '.##..............',
      '################.', '....###########..', '.....######......', '......####.......', '......###........', '......##.........'],
  ];
  // Hit boxes in sprite pixels: [col, row, width, height].
  const STAND_BOX = [[11, 0, 9, 5], [1, 6, 14, 9], [5, 15, 7, 4]];
  const DUCK_BOX = [[0, 1, 26, 6], [4, 7, 7, 3]];
  const PTERO_BOX = [1, 3, 15, 5];
  const PTERO_TOPS = [110, 60]; // above the ground: duck under the first, jump the second

  function sprite(rows) {
    const width = Math.max(...rows.map(r => r.length));
    return makeCanvas(width * S, rows.length * S, b => {
      b.fillStyle = '#f4f6f8';
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) if (row[x] === '#') b.fillRect(x * S, y * S, S, S);
      });
    });
  }
  const standing = LEGS.map(legs => sprite(BODY.concat(legs)));
  const ducking = DUCK_LEGS.map(legs => sprite(DUCK.concat(legs)));

  let mode, sel, dino, obstacles, dist, score, speed, untilNext, timer, flash;

  function reset() {
    dino = { y: GROUND, vy: 0, duck: false };
    obstacles = [];
    dist = 0;
    score = 0;
    speed = SPEED[settings.speed];
    untilNext = 0;
    flash = 0;
  }

  function spawn() {
    let o;
    if (score > 150 && Math.random() < 0.2 + Math.min(score, 1500) / 1500 * 0.2) {
      o = { kind: 'ptero', x: W + 40, top: GROUND - PTERO_TOPS[Math.floor(Math.random() * PTERO_TOPS.length)], w: 17 * S };
    } else {
      const big = Math.random() < 0.4;
      const count = 1 + Math.floor(Math.random() * (big ? 2 : 3));
      const cacti = [];
      for (let i = 0; i < count; i++) cacti.push({ dx: i * (big ? 70 : 54), w: big ? 40 : 30, h: (big ? 100 : 70) + Math.floor(Math.random() * 3) * 5 });
      o = { kind: 'cactus', x: W + 40, cacti, w: cacti[count - 1].dx + cacti[count - 1].w };
    }
    obstacles.push(o);
    // Gaps tighten as the score climbs, on top of the speed-up.
    const tight = Math.min(score, 1500) / 1500 * 0.1;
    untilNext = speed * (0.85 - tight + Math.random() * (0.75 - tight)) + o.w;
  }

  function start() {
    reset();
    mode = 'play';
  }

  function dinoBoxes() {
    const boxes = dino.duck && dino.y >= GROUND ? DUCK_BOX : STAND_BOX;
    const img = dino.duck && dino.y >= GROUND ? ducking[0] : standing[0];
    const top = dino.y - img.height;
    return boxes.map(([c, r, w, h]) => [DINO_X + c * S, top + r * S, w * S, h * S]);
  }

  function obstacleBoxes(o) {
    if (o.kind === 'ptero') {
      const [c, r, w, h] = PTERO_BOX;
      return [[o.x + c * S, o.top + r * S, w * S, h * S]];
    }
    return o.cacti.map(c => [o.x + c.dx + 4, GROUND - c.h + 4, c.w - 8, c.h - 4]);
  }

  function overlaps(a, b) {
    return a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
  }

  function update(dt) {
    flash = Math.max(0, flash - dt * 2.5);
    if (mode === 'play') {
      speed = SPEED[settings.speed] * (1 + Math.min(score, 1500) / 1500 * 0.6);
      if (dino.y < GROUND || dino.vy < 0) {
        dino.vy += GRAVITY * (dino.duck ? DROP : 1) * dt;
        dino.y += dino.vy * dt;
        if (dino.y >= GROUND) {
          dino.y = GROUND;
          dino.vy = 0;
        }
      }
      dist += speed * dt;
      score = Math.floor(dist / 50);
      obstacles.forEach(o => { o.x -= speed * dt; });
      if (obstacles.length && obstacles[0].x + obstacles[0].w < 0) obstacles.shift();
      untilNext -= speed * dt;
      if (untilNext <= 0) spawn();
      const mine = dinoBoxes();
      for (const o of obstacles) {
        if (obstacleBoxes(o).some(b => mine.some(m => overlaps(m, b)))) {
          mode = 'crash';
          timer = 0.45;
          flash = 1;
          return;
        }
      }
    } else if (mode === 'crash') {
      timer -= dt;
      if (timer <= 0) App.go('entry', { game: 'dino', score });
    }
  }

  function drawCactus(g, x, w, h, color) {
    const arm = Math.round(w * 0.45), top = GROUND - h;
    g.fillStyle = color;
    g.fillRect(x, top, w, h);
    g.fillRect(x - arm * 1.3, top + h * 0.45, arm * 1.3, arm);
    g.fillRect(x - arm * 1.3, top + h * 0.2, arm, h * 0.25 + arm);
    g.fillRect(x + w, top + h * 0.3, arm * 1.3, arm);
    g.fillRect(x + w + arm * 0.3, top + h * 0.1, arm, h * 0.2 + arm);
    g.fillStyle = 'rgba(255,255,255,0.2)';
    g.fillRect(x + 6, top, 6, h);
    g.fillStyle = 'rgba(0,0,0,0.2)';
    g.fillRect(x + w - 8, top, 8, h);
  }

  function drawPtero(g, o) {
    const rows = PTERO[Math.floor(clock * 6) % 2];
    g.fillStyle = OBSTACLE;
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] === '#') g.fillRect(o.x + x * S, o.top + y * S, S, S);
    });
  }

  function drawObstacle(g, o) {
    if (o.kind === 'ptero') drawPtero(g, o);
    else o.cacti.forEach(c => drawCactus(g, o.x + c.dx, c.w, c.h, OBSTACLE));
  }

  function drawDino(g) {
    const frame = mode === 'play' && dino.y >= GROUND ? Math.floor(dist / 60) % 2 : 0;
    const img = dino.duck && dino.y >= GROUND ? ducking[frame] : standing[frame];
    g.drawImage(img, DINO_X, dino.y - img.height);
  }

  function draw(g) {
    drawBackground(g, '#191c22', '#0c0e11');
    obstacles.forEach(o => drawObstacle(g, o));
    g.fillStyle = 'rgba(255,255,255,0.32)';
    g.fillRect(0, GROUND - 1, W, 2);
    drawGround(g, GROUND + 14, dist);
    drawDino(g);

    if (mode === 'menu') {
      drawText(g, 'DINO RUN', W / 2, 250, 15, '#ffffff', { align: 'center' });
      MENU.forEach((item, i) => {
        const on = i === sel;
        const alpha = on ? (Math.sin(clock * 6) > -0.3 ? 1 : 0.3) : 1;
        drawText(g, item, W / 2, 500 + i * 80, 6.5, on ? '#ffffff' : '#7d838c', { style: 'thin', align: 'center', alpha });
      });
      Scores.drawBoard(g, 'dino', 690);
    } else {
      drawText(g, String(score), W / 2, LIGHTBAR_H + 30, 8, '#ffffff', { align: 'center' });
    }

    drawLightBar(g);
    if (flash > 0) {
      g.fillStyle = 'rgba(255,255,255,' + flash * 0.55 + ')';
      g.fillRect(0, 0, W, H);
    }
  }

  function key(k, repeat) {
    if (mode === 'menu') {
      if (k === 'up' || k === 'down') sel = (sel + 1) % MENU.length;
      else if (k === 'ok' && !repeat) {
        if (sel === 0) start();
        else App.go('settings', 'dino');
      } else if (k === 'back') App.home();
    } else if (mode === 'play') {
      if ((k === 'up' || k === 'ok') && !repeat && dino.y >= GROUND) {
        dino.duck = false;
        dino.vy = JUMP;
      }
      else if (k === 'down') dino.duck = true;
      else if (k === 'back') {
        reset();
        mode = 'menu';
      }
    }
  }

  function keyUp(k) {
    if (k === 'down') dino.duck = false;
    else if ((k === 'up' || k === 'ok') && dino.vy < SHORT_HOP) dino.vy = SHORT_HOP;
  }

  function enter(arg) {
    reset();
    mode = 'menu';
    sel = 0;
    Scores.load('dino');
    if (arg && arg.play) start();
  }

  // The website's gallery (js/show.js): jump when something low is close, and hold the
  // jump until the top of it so it's a full one; duck under the high pterodactyls.
  function auto() {
    if (mode !== 'play') return null;
    if (dino.y < GROUND) return dino.vy < 0 ? 'ok' : null;
    const o = obstacles.find(o => o.x + o.w > DINO_X);
    if (!o || o.x - DINO_X > speed * 0.32) return null;
    if (o.kind === 'ptero' && o.top < GROUND - 90) return 'down';
    return 'ok';
  }

  return { enter, update, draw, key, keyUp, auto };
})();
