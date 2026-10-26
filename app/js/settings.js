App.screens.settings = (() => {
  const SPEEDS = ['slow', 'normal', 'fast'];
  const ROW_Y = 290, ROW_H = 84, LEFT = 200, RIGHT = W - 200, VISIBLE = 7;

  const ROWS = [
    { label: 'APPS', value: () => playableApps().length + ' ON', open: true },
    {
      label: 'DESIGN',
      value: () => design.name,
      change: d => {
        setDesign(DESIGNS[(DESIGNS.indexOf(design) + d + DESIGNS.length) % DESIGNS.length].key);
        settings.design = design.key;
      },
    },
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
    ...(Phones.enabled() ? [{ label: 'PHONE SETUP', value: () => 'NAME, CITY, SPOTIFY', action: () => App.go('setup') }] : []),
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
    const ink = on ? design.ink : design.dim;
    if (on) drawBullet(g, LEFT - 40, y + 3.5 * 6.5, design.ink);
    drawText(g, label, LEFT, y, 6.5, color || ink, { style: 'thin' });
    if (value != null) {
      const text = arrows && on ? '< ' + value + ' >' : value;
      drawText(g, text, RIGHT, y, 6.5, ink, { style: 'thin', align: 'right' });
    }
  }

  function draw(g) {
    drawBackground(g, design.bg[0], design.bg[1]);
    drawText(g, inApps ? 'APPS' : 'SETTINGS', LEFT - 40, 110, 10, design.ink);

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
        g.globalAlpha = on ? 1 : 0.45;
        g.drawImage(ICONS.tile(app, 56), LEFT - 130, ROW_Y + j * ROW_H - 10);
        g.globalAlpha = 1;
        drawRow(g, ROW_Y + j * ROW_H, i === appSel, app.name, value, on ? app.color : null, true);
      });
    }

    const hint = inApps ? 'OK TOGGLE   BACK DONE' : 'LEFT/RIGHT CHANGE   OK SELECT   BACK DONE';
    drawText(g, hint, W / 2, H - 90, 3.5, design.mute, { style: 'thin', align: 'center' });
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

// Settings from a phone: a QR code for setup/index.html, which sends the name, city,
// units, design and a Spotify login. They're only taken while this screen is up, so
// only someone in front of the TV can change them.
App.screens.setup = (() => {
  const FIELDS = ['name', 'city', 'units', 'spotifyClientId', 'spotifyRefreshToken', 'spotifyClientSecret', 'spotifyPlaylist'];
  let qr = null, saved = false;

  function enter() {
    saved = false;
    if (!qr) qr = Jam.renderQr(qrMatrix(Phones.url('setup')), null, 520);
  }

  function draw(g) {
    drawBackground(g, design.bg[0], design.bg[1]);
    drawText(g, 'PHONE SETUP', 160, 110, 10, design.ink);
    const lines = saved ? ['SAVED. STARTING AGAIN..'] : ['SCAN THE CODE WITH YOUR', 'PHONE TO SET YOUR NAME,', 'CITY, DESIGN AND SPOTIFY.', '', 'THE TV TAKES THEM WHILE', 'THIS SCREEN IS OPEN.'];
    lines.forEach((line, i) => drawText(g, line, 160, 330 + i * 70, 5, i < 3 ? design.soft : design.dim, { style: 'thin' }));
    g.drawImage(qr, W - 160 - qr.width, 280);
    drawText(g, 'ROOM ' + ROOM, W - 160 - qr.width / 2, 280 + qr.height + 30, 3.5, design.mute, { style: 'thin', align: 'center' });
    drawText(g, 'BACK DONE', W / 2, H - 90, 3.5, design.mute, { style: 'thin', align: 'center' });
    drawLightBar(g);
  }

  function phone(event, p) {
    if (event !== 'setup' || saved) return;
    const profile = Platform.load('profile', {});
    FIELDS.forEach(k => { if (typeof p[k] === 'string') profile[k] = p[k].slice(0, 400); });
    Platform.save('profile', profile);
    if (DESIGNS.some(d => d.key === p.design)) {
      settings.design = p.design;
      saveSettings();
    }
    saved = true;
    Phones.send('setup-saved', {});
    // A fresh start picks up the new Spotify login and city everywhere.
    setTimeout(() => location.reload(), 1500);
  }

  function key(k) {
    if (k === 'back') App.go('settings');
  }

  return { enter, update() {}, draw, key, phone };
})();
