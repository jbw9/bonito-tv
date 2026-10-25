App.screens.snake = (() => {
  const CELL = 40, COLS = 44, ROWS = 22, X0 = (W - COLS * CELL) / 2, Y0 = 150;
  const STEP = { slow: 0.12, normal: 0.09, fast: 0.07 }; // seconds per move
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const MENU = ['START', 'SETTINGS'];
  const FOOD = '#FF4D4D';

  let mode, sel, snake, dir, turns, food, score, wait, timer, flash;

  function reset() {
    const y = Math.floor(ROWS / 2);
    snake = [[8, y], [7, y], [6, y]];
    dir = 'right';
    turns = [];
    score = 0;
    wait = 0;
    flash = 0;
    placeFood();
  }

  function placeFood() {
    let x, y;
    do {
      x = Math.floor(Math.random() * COLS);
      y = Math.floor(Math.random() * ROWS);
    } while (snake.some(s => s[0] === x && s[1] === y));
    food = { x, y };
  }

  function start() {
    reset();
    mode = 'play';
  }

  function crash() {
    mode = 'crash';
    timer = 0.6;
    flash = 1;
  }

  function step() {
    // Queued turns let quick double-taps (e.g. up then left) both land.
    if (turns.length) dir = turns.shift();
    const head = snake[0], d = DIRS[dir];
    const x = head[0] + d[0], y = head[1] + d[1];
    const eat = x === food.x && y === food.y;
    if (!eat) snake.pop();
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS || snake.some(s => s[0] === x && s[1] === y)) return crash();
    snake.unshift([x, y]);
    if (eat) {
      score++;
      placeFood();
    }
  }

  function update(dt) {
    flash = Math.max(0, flash - dt * 2.5);
    if (mode === 'play') {
      wait -= dt;
      while (wait <= 0 && mode === 'play') {
        wait += STEP[settings.speed] * Math.max(0.6, 1 - score * 0.01);
        step();
      }
    } else if (mode === 'crash') {
      timer -= dt;
      if (timer <= 0) App.go('entry', { game: 'snake', score });
    }
  }

  function cellRect(g, x, y, inset) {
    g.fillRect(X0 + x * CELL + inset, Y0 + y * CELL + inset, CELL - inset * 2, CELL - inset * 2);
  }

  function draw(g) {
    drawBackground(g, '#191c22', '#0c0e11');
    g.strokeStyle = 'rgba(255,255,255,0.32)';
    g.lineWidth = 3;
    g.strokeRect(X0 - 6, Y0 - 6, COLS * CELL + 12, ROWS * CELL + 12);

    if (mode === 'menu') {
      drawText(g, 'SNAKE', W / 2, 250, 15, '#ffffff', { align: 'center' });
      MENU.forEach((item, i) => {
        const on = i === sel;
        const alpha = on ? (Math.sin(clock * 6) > -0.3 ? 1 : 0.3) : 1;
        drawText(g, item, W / 2, 500 + i * 80, 6.5, on ? '#ffffff' : '#7d838c', { style: 'thin', align: 'center', alpha });
      });
      Scores.drawBoard(g, 'snake', 720);
    } else {
      g.fillStyle = FOOD;
      cellRect(g, food.x, food.y, 4 + Math.sin(clock * 8) * 2);

      snake.forEach((s, i) => {
        g.fillStyle = i === 0 ? '#ffffff' : mix('#f4f6f8', '#6b7079', Math.min(0.7, i / (snake.length + 6)));
        cellRect(g, s[0], s[1], i === 0 ? 2 : 4);
      });
      const [hx, hy] = snake[0], d = DIRS[dir];
      g.fillStyle = '#16191e';
      [-1, 1].forEach(side => {
        const ex = X0 + hx * CELL + CELL / 2 + d[0] * 8 + d[1] * side * 9;
        const ey = Y0 + hy * CELL + CELL / 2 + d[1] * 8 - d[0] * side * 9;
        g.fillRect(ex - 3, ey - 3, 6, 6);
      });
      drawText(g, String(score), W / 2, 72, 8, '#ffffff', { align: 'center' });
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
        else App.go('settings');
      } else if (k === 'back') App.home();
    } else if (mode === 'play') {
      if (DIRS[k]) {
        const last = turns.length ? turns[turns.length - 1] : dir;
        const d = DIRS[k], l = DIRS[last];
        if (k !== last && d[0] !== -l[0] && d[1] !== -l[1] && turns.length < 2) turns.push(k);
      } else if (k === 'back') {
        reset();
        mode = 'menu';
      }
    }
  }

  function enter(arg) {
    reset();
    mode = 'menu';
    sel = 0;
    Scores.load('snake');
    if (arg && arg.play) start();
  }

  return { enter, update, draw, key };
})();
