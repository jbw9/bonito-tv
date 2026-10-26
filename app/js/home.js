App.screens.home = (() => {
  const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const ROW_H = 96, LIST_Y = 560, LIST_X = 130;
  const ICONS = {
    sun: ['...#...', '.#...#.', '..###..', '#.###.#', '..###..', '.#...#.', '...#...'],
    moon: ['..###..', '.##....', '##.....', '##.....', '##.....', '.##....', '..###..'],
    cloud: ['.........', '...##....', '..####.#.', '.########', '#########', '#########', '.#######.'],
    rain: ['...##....', '..#####..', '.#######.', '#########', '.........', '.#..#..#.', '#..#..#..'],
    snow: ['...##....', '..#####..', '.#######.', '#########', '.........', '#.#.#.#.#', '.#.#.#.#.'],
    storm: ['...##....', '..#####..', '.#######.', '#########', '....#....', '...##....', '....#....'],
  };

  // Brand logos shown under the weather for the selected entry, keyed by catalog key.
  // Filled in as each image loads.
  const LOGOS = {};
  ['heartive', 'youtube', 'netflix', 'hulu', 'disney', 'prime', 'max', 'peacock', 'appletv', 'paramount', 'spotify', 'popeyes'].forEach(k => {
    const img = new Image();
    img.onload = () => { LOGOS[k] = prepLogo(img); };
    img.src = 'img/logos/' + k + '.png';
  });

  const FOLDER = { key: 'games', name: 'GAMES', color: '#F4F6F8' };
  const SETTINGS = { key: 'settings', name: 'SETTINGS', color: '#F4F6F8' };
  const LOGO_W = 280, LOGO_H = 140;

  let sel = 0, focus = 'list', scrollPos = 0, weather = null, nextFetch = 0, open = false;

  // Home rows: the enabled apps, with the games collapsed into one GAMES folder
  // that lists them underneath while open, and SETTINGS always last.
  function rows() {
    const out = [];
    playableApps().forEach(app => {
      if (app.group !== 'games') return out.push({ app });
      if (!out.some(r => r.folder)) out.push({ app: FOLDER, folder: true });
      if (open) out.push({ app, child: true });
    });
    out.push({ app: SETTINGS, settings: true });
    return out;
  }

  function closeFolder() {
    open = false;
    sel = rows().findIndex(r => r.folder);
  }

  function icon(w) {
    const c = w.code;
    if (c >= 95) return ICONS.storm;
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return ICONS.snow;
    if (c >= 51) return ICONS.rain;
    if (c >= 2) return ICONS.cloud;
    return w.day ? ICONS.sun : ICONS.moon;
  }

  function refreshWeather() {
    const now = Date.now();
    if (now < nextFetch) return;
    nextFetch = now + 15 * 60e3;
    Platform.weather().then(w => { weather = w; }).catch(() => { nextFetch = Date.now() + 2 * 60e3; });
  }

  function two(n) {
    return ('0' + n).slice(-2);
  }

  function timeText(d) {
    let h = d.getHours();
    if (settings.clock === '24h') return two(h) + ':' + two(d.getMinutes());
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + two(d.getMinutes()) + ' ' + ampm;
  }

  // Each logo is shrunk once, in halving steps, to its on-screen size so the TV
  // draws it pixel for pixel.
  function prepLogo(img) {
    const s = Math.min(LOGO_W / img.naturalWidth, LOGO_H / img.naturalHeight);
    const w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
    let src = img, sw = img.naturalWidth, sh = img.naturalHeight;
    while (sw / 2 > w) {
      const half = makeCanvas(Math.round(sw / 2), Math.round(sh / 2), b => {
        b.imageSmoothingQuality = 'high';
        b.drawImage(src, 0, 0, Math.round(sw / 2), Math.round(sh / 2));
      });
      src = half;
      sw = half.width;
      sh = half.height;
    }
    return makeCanvas(w, h, b => {
      b.imageSmoothingQuality = 'high';
      b.drawImage(src, 0, 0, w, h);
    });
  }

  // Right-aligned at x, centred on y.
  function drawLogo(g, logo, x, y) {
    g.drawImage(logo, Math.round(x - logo.width), Math.round(y - logo.height / 2));
  }

  // Small triangle after the GAMES label: right when closed, down when open.
  function drawCaret(g, x, y, color) {
    g.fillStyle = color;
    g.beginPath();
    if (open) {
      g.moveTo(x, y - 8);
      g.lineTo(x + 22, y - 8);
      g.lineTo(x + 11, y + 6);
    } else {
      g.moveTo(x + 4, y - 12);
      g.lineTo(x + 18, y - 1);
      g.lineTo(x + 4, y + 10);
    }
    g.fill();
  }

  function enter() {
    focus = 'list';
    sel = Math.min(sel, rows().length - 1);
    scrollPos = sel;
    refreshWeather();
  }

  function update(dt) {
    // HDMI entries come and go while this screen is open.
    sel = Math.min(sel, rows().length - 1);
    scrollPos += (sel - scrollPos) * Math.min(1, dt * 12);
    refreshWeather();
  }

  function draw(g) {
    drawBackground(g, '#25282e', '#14161a');

    const list = rows();
    list.forEach((row, i) => {
      const d = i - scrollPos;
      if (Math.abs(d) > 3.6) return;
      const y = LIST_Y + d * ROW_H;
      const app = row.app, x = row.child ? LIST_X + 70 : LIST_X;
      let w;
      if (i === sel && focus === 'list') {
        const cell = row.child ? 7.5 : 8.5;
        drawBullet(g, x - 34, y, app.color);
        w = drawText(g, app.name, x, y - 3.5 * cell, cell, app.color);
      } else {
        const cell = row.child ? 5.5 : 6;
        const color = i === sel ? app.color : '#a3a9b1';
        w = drawText(g, app.name, x, y - 3.5 * cell, cell, color, { style: 'thin', alpha: Math.max(0.12, 1 - Math.abs(d) * 0.26) });
      }
      if (row.folder) drawCaret(g, x + w + 28, y, i === sel ? app.color : '#a3a9b1');
    });

    const right = W - 120;
    const name = 'HELLO ' + CONFIG.name;
    drawText(g, name, right, 120, Math.min(10, 1000 / (name.length * 6)), '#ffffff', { align: 'right' });
    const now = new Date();
    drawText(g, timeText(now), right, 230, 12, '#ffffff', { align: 'right' });
    drawText(g, DAYS[now.getDay()] + ' ' + MONTHS[now.getMonth()] + ' ' + now.getDate(), right, 354, 5, '#d3d7dd', { style: 'thin', align: 'right' });
    if (weather) {
      const w = drawText(g, weather.temp + '°', right, 410, 6, '#ffffff', { align: 'right' });
      const ic = icon(weather);
      drawIcon(g, ic, right - w - 30 - ic[0].length * 5, 410 + 3.5 * 6 - 3.5 * 5, 5, '#ffffff');
    }

    const logo = LOGOS[list[sel].app.key];
    if (logo) drawLogo(g, logo, right, 590);

    if (focus === 'music') Jam.drawCode(g);
    Music.draw(g, focus === 'music');

    drawLightBar(g);
  }

  function key(k, repeat, fromPhone) {
    const list = rows(), row = list[sel];
    if (k === 'back') {
      if (focus === 'music') focus = 'list';
      else if (open) closeFolder();
      // A guest's phone can't open the launcher again, so it can't close it either.
      else if (!fromPhone) Platform.exit();
      return;
    }
    if (focus === 'list') {
      if (k === 'up') sel = Math.max(0, sel - 1);
      else if (k === 'down' && sel === list.length - 1 && Music.enabled()) focus = 'music';
      else if (k === 'down') sel = Math.min(list.length - 1, sel + 1);
      else if (k === 'left' && row.child) closeFolder();
      else if (k === 'ok') {
        if (row.folder) open = !open;
        else if (row.settings) App.go('settings');
        else if (row.app.game) App.go(row.app.key);
        else App.go('splash', { app: row.app });
      }
    } else if (focus === 'music') {
      if (k === 'up') focus = 'list';
      else Music.key(k);
    }
  }

  return { enter, update, draw, key };
})();
