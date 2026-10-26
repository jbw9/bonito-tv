// Game over: play again (the default), exit, or, after a new record, put a name on it.
App.screens.entry = (() => {
  const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('').concat(['SPACE', 'DEL', 'DONE']);
  const COLS = 10, KEY_W = 130, KEY_H = 104, KEYS_X = (W - COLS * KEY_W) / 2, KEYS_Y = 470;
  const ROW_Y = 330, ROW_H = 84, VISIBLE = 6, MAX_LEN = 12;
  const AGAIN = 'PLAY AGAIN', EXIT = 'EXIT', ADD = 'ADD NAME', NEW = '+ NEW NAME';

  let game, score, record, mode, options, sel, typed, keySel;

  function showOver() {
    mode = 'over';
    options = record ? [AGAIN, EXIT, ADD] : [AGAIN, EXIT];
    sel = 0;
  }

  function enter(arg) {
    game = arg.game;
    score = arg.score;
    record = Scores.isRecord(game, score);
    typed = '';
    keySel = 0;
    showOver();
  }

  function playAgain() {
    App.go(game, { play: true });
  }

  function finish(name) {
    Scores.submit(game, name, score);
    playAgain();
  }

  function update() {}

  function drawKey(g, i) {
    const x = KEYS_X + (i % COLS) * KEY_W, y = KEYS_Y + Math.floor(i / COLS) * KEY_H;
    const on = i === keySel;
    g.fillStyle = on ? '#ffffff' : 'rgba(255,255,255,0.06)';
    g.fillRect(x + 6, y + 6, KEY_W - 12, KEY_H - 12);
    const label = KEYS[i], cell = label.length > 1 ? 3.5 : 6;
    drawText(g, label, x + KEY_W / 2, y + KEY_H / 2 - 3.5 * cell, cell, on ? '#0e1013' : '#c9cdd3', { style: label.length > 1 ? 'thin' : 'led', align: 'center' });
  }

  function draw(g) {
    drawBackground(g, '#1d2026', '#0e1013');
    drawText(g, (record ? 'NEW RECORD ' : 'GAME OVER ') + score, W / 2, 110, 10, '#ffffff', { align: 'center' });

    if (mode === 'type') {
      const blink = Math.sin(clock * 6) > 0 && typed.length < MAX_LEN ? '-' : ' ';
      drawText(g, typed + blink, W / 2, 300, 9, '#ffffff', { align: 'center' });
      KEYS.forEach((_, i) => drawKey(g, i));
    } else {
      if (mode === 'pick') drawText(g, 'WHO PLAYED?', W / 2, 230, 5, '#9aa0a8', { style: 'thin', align: 'center' });
      const top = Math.max(0, Math.min(sel - 2, options.length - VISIBLE));
      options.slice(top, top + VISIBLE).forEach((name, j) => {
        const on = top + j === sel, y = ROW_Y + j * ROW_H;
        if (on) drawBullet(g, W / 2 - 330, y + 3.5 * 6.5, '#ffffff');
        drawText(g, name, W / 2 - 290, y, 6.5, on ? '#ffffff' : '#7d838c', { style: 'thin' });
      });
    }

    const hint = mode === 'over' ? 'OK CHOOSE   BACK EXIT' : mode === 'pick' ? 'OK CHOOSE   BACK RETURN' : 'OK TYPE   BACK NAMES';
    drawText(g, hint, W / 2, H - 90, 3.5, '#5d636c', { style: 'thin', align: 'center' });
    drawLightBar(g);
  }

  function press() {
    const label = KEYS[keySel];
    if (label === 'DONE') {
      if (typed.trim()) finish(typed.trim());
    } else if (label === 'DEL') typed = typed.slice(0, -1);
    else if (typed.length < MAX_LEN) typed += label === 'SPACE' ? ' ' : label;
  }

  // Typing from a phone (js/remote.js) goes straight into a new name: letters, '\b' to
  // delete and '\n' to save.
  function type(ch) {
    if (!record) return;
    if (mode !== 'type') {
      if (ch === '\b' || ch === '\n') return;
      mode = 'type';
    }
    if (ch === '\b') typed = typed.slice(0, -1);
    else if (ch === '\n') {
      if (typed.trim()) finish(typed.trim());
    } else if (typed.length < MAX_LEN && (ch === ' ' || KEYS.indexOf(ch.toUpperCase()) >= 0)) typed += ch.toUpperCase();
  }

  function key(k, repeat) {
    if (mode !== 'type') {
      if (k === 'up') sel = Math.max(0, sel - 1);
      else if (k === 'down') sel = Math.min(options.length - 1, sel + 1);
      else if (k === 'ok' && !repeat) {
        const choice = options[sel];
        if (choice === AGAIN) playAgain();
        else if (choice === EXIT) App.home();
        else if (choice === ADD) {
          mode = 'pick';
          options = Scores.names().concat([NEW]);
          sel = Math.max(0, options.indexOf(Platform.load('player', '')));
        } else if (choice === NEW) mode = 'type';
        else finish(choice);
      } else if (k === 'back') {
        if (mode === 'pick') showOver();
        else App.home();
      }
      return;
    }
    const col = keySel % COLS, row = Math.floor(keySel / COLS), rows = Math.ceil(KEYS.length / COLS);
    const rowLen = r => Math.min(COLS, KEYS.length - r * COLS);
    if (k === 'left') keySel = row * COLS + (col + rowLen(row) - 1) % rowLen(row);
    else if (k === 'right') keySel = row * COLS + (col + 1) % rowLen(row);
    else if (k === 'up') keySel = Math.min(KEYS.length - 1, ((row + rows - 1) % rows) * COLS + col);
    else if (k === 'down') keySel = Math.min(KEYS.length - 1, ((row + 1) % rows) * COLS + col);
    else if (k === 'ok') press();
    else if (k === 'back') {
      mode = 'pick';
      options = Scores.names().concat([NEW]);
      sel = options.length - 1;
    }
  }

  return { enter, update, draw, key, type };
})();
