App.screens.flappy = (() => {
  const TOP = LIGHTBAR_H, GROUND = 968, BIRD_X = 460, R = 15;
  const PIPE_W = 124, CAP_W = 150, CAP_H = 38, GAP = 310, MIN_GAP = 210;
  const PIPE_COLOR = '#5EC64A';
  const SPEED = { slow: 250, normal: 330, fast: 430 };
  const GRAVITY = 2500, FLAP = -760, MAX_FALL = 1100;
  const MENU = ['START', 'SETTINGS'];

  const BIRD = [
    '..wwww...',
    '.wwwwwew.',
    'gwwwwwwwo',
    'ggwwwwwoo',
    '.gwwwwww.',
    '..wwww...',
  ];
  const BIRD_COLORS = { w: '#f4f6f8', g: '#b4bcc6', e: '#16191e', o: '#d6dbe1' };
  const birdSprite = makeCanvas(BIRD[0].length * 4, BIRD.length * 4, b => {
    BIRD.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '.') continue;
        b.fillStyle = BIRD_COLORS[row[x]];
        b.fillRect(x * 4, y * 4, 4, 4);
      }
    });
  });

  let mode, sel, bird, pipes, score, scroll, timer, flash;

  function reset() {
    bird = { y: 520, vy: 0 };
    pipes = [];
    score = 0;
    scroll = 0;
    flash = 0;
  }

  function spawn(x) {
    // The gap closes with every point and the next gap may sit further from the
    // last one, so early pipes are gentle and later ones demand big swings.
    const margin = 110, gap = Math.max(MIN_GAP, GAP - score * 4);
    const lo = TOP + margin + gap / 2, hi = GROUND - margin - gap / 2;
    const prev = pipes.length ? pipes[pipes.length - 1].gapY : (lo + hi) / 2;
    const reach = Math.min(hi - lo, 360, 160 + score * 10);
    const gapY = Math.max(lo, Math.min(hi, prev + (Math.random() * 2 - 1) * reach));
    pipes.push({ x, gapY, gap, scored: false, next: 480 + Math.random() * 180 });
  }

  function start() {
    reset();
    mode = 'play';
    bird.vy = FLAP;
    spawn(W + 200);
  }

  function rects(p) {
    const capX = p.x - (CAP_W - PIPE_W) / 2;
    const gapTop = p.gapY - p.gap / 2, gapBot = p.gapY + p.gap / 2;
    return [
      [p.x, 0, PIPE_W, gapTop - CAP_H],
      [capX, gapTop - CAP_H, CAP_W, CAP_H],
      [capX, gapBot, CAP_W, CAP_H],
      [p.x, gapBot + CAP_H, PIPE_W, GROUND - gapBot - CAP_H],
    ];
  }

  function hits(p) {
    const r = R * 0.85;
    return rects(p).some(([x, y, w, h]) => {
      const dx = BIRD_X - Math.max(x, Math.min(BIRD_X, x + w));
      const dy = bird.y - Math.max(y, Math.min(bird.y, y + h));
      return dx * dx + dy * dy < r * r;
    });
  }

  // Hitting a pipe or the ground: the bird drops, then it's game over.
  function die() {
    mode = 'dead';
    timer = 1.1;
    flash = 0.6;
  }

  function update(dt) {
    flash = Math.max(0, flash - dt * 2.5);
    if (mode === 'play') {
      const speed = SPEED[settings.speed] + Math.min(score, 40) * 5;
      bird.vy = Math.min(MAX_FALL, bird.vy + GRAVITY * dt);
      bird.y += bird.vy * dt;
      if (bird.y < TOP + R) {
        bird.y = TOP + R;
        bird.vy = 0;
      }
      scroll += speed * dt;
      pipes.forEach(p => { p.x -= speed * dt; });
      if (pipes.length && pipes[0].x < -CAP_W) pipes.shift();
      const last = pipes[pipes.length - 1];
      if (last.x < W + 200 - last.next) spawn(last.x + last.next);
      for (const p of pipes) {
        if (!p.scored && p.x + PIPE_W < BIRD_X - R) {
          p.scored = true;
          score++;
        }
        if (hits(p)) return die();
      }
      if (bird.y + R >= GROUND) {
        bird.y = GROUND - R;
        die();
      }
    } else if (mode === 'dead') {
      timer -= dt;
      bird.vy = Math.min(MAX_FALL, bird.vy + GRAVITY * dt);
      bird.y = Math.min(GROUND - R, bird.y + bird.vy * dt);
      if (timer <= 0) App.go('entry', { game: 'flappy', score });
    }
  }

  function drawPipeBody(g, x, y, w, h, color) {
    if (h <= 0) return;
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,0.2)';
    g.fillRect(x + 10, y, 14, h);
    g.fillStyle = 'rgba(0,0,0,0.2)';
    g.fillRect(x + w - 24, y, 24, h);
  }

  function drawPair(g, p) {
    const [topBody, topCap, botCap, botBody] = rects(p);
    drawPipeBody(g, ...topBody, PIPE_COLOR);
    drawPipeBody(g, ...botBody, PIPE_COLOR);
    drawPipeBody(g, ...topCap, PIPE_COLOR);
    drawPipeBody(g, ...botCap, PIPE_COLOR);
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.fillRect(topCap[0], topCap[1], CAP_W, 4);
    g.fillRect(botCap[0], botCap[1] + CAP_H - 4, CAP_W, 4);
  }

  function drawBird(g, x, y, rot) {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.drawImage(birdSprite, -birdSprite.width / 2, -birdSprite.height / 2);
    g.restore();
  }

  function draw(g) {
    drawBackground(g, '#191c22', '#0c0e11');
    pipes.forEach(p => drawPair(g, p));
    drawGround(g, GROUND, scroll);

    if (mode === 'menu') {
      const title = CONFIG.title;
      const cell = Math.min(15, 1500 / (title.length * 6));
      drawText(g, title, W / 2, 250, cell, '#ffffff', { align: 'center' });
      const left = W / 2 - textWidth(title, cell) / 2;
      drawBird(g, left + 40, 250 + cell * 7 + 70 + Math.sin(clock * 3) * 14, -0.15);
      MENU.forEach((item, i) => {
        const on = i === sel;
        const alpha = on ? (Math.sin(clock * 6) > -0.3 ? 1 : 0.3) : 1;
        drawText(g, item, W / 2, 560 + i * 80, 6.5, on ? '#ffffff' : '#7d838c', { style: 'thin', align: 'center', alpha });
      });
      Scores.drawBoard(g, 'flappy', 740);
    } else {
      drawBird(g, BIRD_X, bird.y, Math.max(-0.5, Math.min(1.3, bird.vy / 900)));
      drawText(g, String(score), W / 2, TOP + 30, 8, '#ffffff', { align: 'center' });
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
        else App.go('settings', 'flappy');
      } else if (k === 'back') App.home();
    } else if (mode === 'play') {
      if ((k === 'up' || k === 'ok') && !repeat) bird.vy = FLAP;
      else if (k === 'back') {
        reset();
        mode = 'menu';
      }
    }
  }

  function enter(arg) {
    reset();
    mode = 'menu';
    sel = 0;
    Scores.load('flappy');
    if (arg && arg.play) start();
  }

  return { enter, update, draw, key };
})();
