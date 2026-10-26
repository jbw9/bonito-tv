App.screens.stack = (() => {
  const LAYER_H = 56, BASE_Y = 960, BASE_W = 640, LEFT = 160, RIGHT = W - 160;
  const SPEED = { slow: 520, normal: 680, fast: 840 };
  const PERFECT = 8; // px of slack that still counts as a clean drop
  const GRAVITY = 2600;
  const MENU = ['START', 'SETTINGS'];

  let mode, sel, layers, block, dir, debris, cam, score, timer, flash, hue;

  function reset() {
    layers = [{ x: (W - BASE_W) / 2, w: BASE_W, color: '#3a3f47' }];
    debris = [];
    cam = 0;
    score = 0;
    dir = 1;
    hue = Math.floor(Math.random() * 360);
    block = null;
    flash = 0;
  }

  function newBlock() {
    // Each layer shifts the hue a little, like the original.
    const top = layers[layers.length - 1];
    // Random side and entry point so the timing can't be memorised.
    dir = Math.random() < 0.5 ? 1 : -1;
    const x = LEFT + Math.random() * (RIGHT - LEFT - top.w);
    block = { x, w: top.w, color: 'hsl(' + (hue + score * 9) % 360 + ',70%,58%)' };
  }

  function start() {
    reset();
    mode = 'play';
    newBlock();
  }

  function layerY(i) {
    return BASE_Y - i * LAYER_H + cam;
  }

  function drop() {
    const top = layers[layers.length - 1];
    if (Math.abs(block.x - top.x) <= PERFECT) block.x = top.x;
    const x1 = Math.max(block.x, top.x), x2 = Math.min(block.x + block.w, top.x + top.w);
    const y = layerY(layers.length);
    if (x2 <= x1) {
      // Missed the tower: the whole block falls and it's game over.
      debris.push({ x: block.x, y, w: block.w, color: block.color, vy: 0 });
      mode = 'crash';
      timer = 0.7;
      flash = 1;
      block = null;
      return;
    }
    if (block.x < x1) debris.push({ x: block.x, y, w: x1 - block.x, color: block.color, vy: 0 });
    if (block.x + block.w > x2) debris.push({ x: x2, y, w: block.x + block.w - x2, color: block.color, vy: 0 });
    layers.push({ x: x1, w: x2 - x1, color: block.color });
    score++;
    newBlock();
  }

  function update(dt) {
    flash = Math.max(0, flash - dt * 2.5);
    cam += (Math.max(0, layers.length - 8) * LAYER_H - cam) * Math.min(1, dt * 6);
    debris.forEach(d => {
      d.vy += GRAVITY * dt;
      d.y += d.vy * dt;
    });
    debris = debris.filter(d => d.y < H + 200);
    if (mode === 'play') {
      block.x += dir * (SPEED[settings.speed] + Math.min(score, 50) * 14) * dt;
      if (block.x < LEFT) {
        block.x = LEFT;
        dir = 1;
      } else if (block.x + block.w > RIGHT) {
        block.x = RIGHT - block.w;
        dir = -1;
      }
    } else if (mode === 'crash') {
      timer -= dt;
      if (timer <= 0) App.go('entry', { game: 'stack', score });
    }
  }

  function drawSlab(g, x, y, w, color) {
    g.fillStyle = color;
    g.fillRect(x, y, w, LAYER_H - 4);
    g.fillStyle = 'rgba(255,255,255,0.2)';
    g.fillRect(x, y, w, 6);
    g.fillStyle = 'rgba(0,0,0,0.2)';
    g.fillRect(x, y + LAYER_H - 12, w, 8);
  }

  function draw(g) {
    drawBackground(g, '#191c22', '#0c0e11');
    layers.forEach((l, i) => {
      const y = layerY(i);
      if (y < H && y > -LAYER_H) drawSlab(g, l.x, y, l.w, l.color);
    });
    if (block) drawSlab(g, block.x, layerY(layers.length), block.w, block.color);
    debris.forEach(d => drawSlab(g, d.x, d.y, d.w, d.color));

    if (mode === 'menu') {
      drawText(g, 'STACK', W / 2, 200, 15, '#ffffff', { align: 'center' });
      MENU.forEach((item, i) => {
        const on = i === sel;
        const alpha = on ? (Math.sin(clock * 6) > -0.3 ? 1 : 0.3) : 1;
        drawText(g, item, W / 2, 420 + i * 80, 6.5, on ? '#ffffff' : '#7d838c', { style: 'thin', align: 'center', alpha });
      });
      Scores.drawBoard(g, 'stack', 620);
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
        else App.go('settings');
      } else if (k === 'back') App.home();
    } else if (mode === 'play') {
      if ((k === 'ok' || k === 'up' || k === 'down') && !repeat) drop();
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
    Scores.load('stack');
    if (arg && arg.play) start();
  }

  return { enter, update, draw, key };
})();
