App.screens.settings = (() => {
  const SPEEDS = ['slow', 'normal', 'fast'];
  const ROW_Y = 290, ROW_H = 84, LEFT = 200, RIGHT = W - 200, VISIBLE = 7;

  const ROWS = [
    { label: 'APPS', value: () => playableApps().length + ' ON', open: true },
    {
      label: 'GAME SPEED',
      value: () => settings.speed,
      change: d => { settings.speed = SPEEDS[(SPEEDS.indexOf(settings.speed) + d + SPEEDS.length) % SPEEDS.length]; },
    },
    {
      label: 'LIGHT BAR',
      value: () => (settings.lightbar ? 'ON' : 'OFF'),
      change: () => { settings.lightbar = !settings.lightbar; },
    },
    {
      label: 'CLOCK',
      value: () => settings.clock,
      change: () => { settings.clock = settings.clock === '12h' ? '24h' : '12h'; },
    },
    { label: 'RESET BEST', value: () => 'ALL GAMES', action: () => Scores.resetLocal() },
    { label: 'DONE', action: () => leave() },
  ];

  let sel = 0, inApps = false, appSel = 0, from = null;

  // `from`: the game whose menu opened settings, to go back to.
  function enter(arg) {
    sel = 0;
    inApps = false;
    from = arg || null;
  }

  function leave() {
    if (from) App.go(from);
    else App.home();
  }

  function update() {}

  function drawRow(g, y, on, label, value, color, arrows) {
    const ink = on ? '#ffffff' : '#7d838c';
    if (on) drawBullet(g, LEFT - 40, y + 3.5 * 6.5, '#ffffff');
    drawText(g, label, LEFT, y, 6.5, color || ink, { style: 'thin' });
    if (value != null) {
      const text = arrows && on ? '< ' + value + ' >' : value;
      drawText(g, text, RIGHT, y, 6.5, ink, { style: 'thin', align: 'right' });
    }
  }

  function draw(g) {
    drawBackground(g, '#1d2026', '#0e1013');
    drawText(g, inApps ? 'APPS' : 'SETTINGS', LEFT - 40, 110, 10, '#ffffff');

    if (!inApps) {
      ROWS.forEach((row, i) => {
        drawRow(g, ROW_Y + i * ROW_H, i === sel, row.label, row.value ? row.value() : null, null, !!row.change);
      });
    } else {
      const top = Math.max(0, Math.min(appSel - 3, CATALOG.length - VISIBLE));
      CATALOG.slice(top, top + VISIBLE).forEach((app, j) => {
        const i = top + j;
        const on = settings.apps[app.key];
        const value = Platform.isAvailable(app) ? (on ? 'ON' : 'OFF') : app.hdmi ? 'NOTHING PLUGGED IN' : 'NOT INSTALLED';
        drawRow(g, ROW_Y + j * ROW_H, i === appSel, app.name, value, on ? app.color : null, true);
      });
    }

    const hint = inApps ? 'OK TOGGLE   BACK DONE' : 'LEFT/RIGHT CHANGE   OK SELECT   BACK DONE';
    drawText(g, hint, W / 2, H - 90, 3.5, '#5d636c', { style: 'thin', align: 'center' });
    drawLightBar(g);
  }

  function key(k) {
    if (inApps) {
      if (k === 'up') appSel = Math.max(0, appSel - 1);
      else if (k === 'down') appSel = Math.min(CATALOG.length - 1, appSel + 1);
      else if (k === 'ok' || k === 'left' || k === 'right') {
        const app = CATALOG[appSel];
        settings.apps[app.key] = !settings.apps[app.key];
        saveSettings();
      } else if (k === 'back') inApps = false;
      return;
    }
    const row = ROWS[sel];
    if (k === 'up') sel = (sel + ROWS.length - 1) % ROWS.length;
    else if (k === 'down') sel = (sel + 1) % ROWS.length;
    else if ((k === 'left' || k === 'right') && row.change) {
      row.change(k === 'left' ? -1 : 1);
      saveSettings();
    } else if (k === 'ok') {
      if (row.open) {
        inApps = true;
        appSel = 0;
      } else if (row.action) row.action();
      else if (row.change) {
        row.change(1);
        saveSettings();
      }
    } else if (k === 'back') leave();
  }

  return { enter, update, draw, key };
})();
