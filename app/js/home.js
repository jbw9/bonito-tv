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

  let sel = 0, focus = 'list', scrollPos = 0, weather = null, nextFetch = 0;

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

  function drawGear(g, x, y, r, color) {
    g.save();
    g.translate(x, y);
    g.strokeStyle = color;
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(0, 0, r * 0.42, 0, Math.PI * 2);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      g.moveTo(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62);
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.stroke();
    g.restore();
  }

  function enter() {
    focus = 'list';
    sel = Math.min(sel, playableApps().length - 1);
    scrollPos = sel;
    refreshWeather();
  }

  function update(dt) {
    // HDMI entries come and go while this screen is open.
    sel = Math.min(sel, playableApps().length - 1);
    scrollPos += (sel - scrollPos) * Math.min(1, dt * 12);
    refreshWeather();
  }

  function draw(g) {
    drawBackground(g, '#25282e', '#14161a');

    const apps = playableApps();
    apps.forEach((app, i) => {
      const d = i - scrollPos;
      if (Math.abs(d) > 3.6) return;
      const y = LIST_Y + d * ROW_H;
      if (i === sel && focus === 'list') {
        const cell = 8.5;
        drawBullet(g, LIST_X - 34, y, app.color);
        drawText(g, app.name, LIST_X, y - 3.5 * cell, cell, app.color);
      } else {
        const cell = 6;
        const color = i === sel ? app.color : '#a3a9b1';
        drawText(g, app.name, LIST_X, y - 3.5 * cell, cell, color, { style: 'thin', alpha: Math.max(0.12, 1 - Math.abs(d) * 0.26) });
      }
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

    const gearOn = focus === 'gear';
    if (gearOn) {
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(right - 26, H - 110, 46, 0, Math.PI * 2);
      g.stroke();
    }
    drawGear(g, right - 26, H - 110, 28, gearOn ? '#ffffff' : '#6b7079');

    drawLightBar(g);
  }

  function key(k) {
    const count = playableApps().length;
    if (k === 'back') return Platform.exit();
    if (focus === 'list') {
      if (k === 'up') sel = Math.max(0, sel - 1);
      else if (k === 'down') sel = Math.min(count - 1, sel + 1);
      else if (k === 'right') focus = 'gear';
      else if (k === 'ok') {
        const app = playableApps()[sel];
        if (app.game) App.go(app.key);
        else App.go('splash', { app });
      }
    } else {
      if (k === 'left' || k === 'up') focus = 'list';
      else if (k === 'ok') App.go('settings');
    }
  }

  return { enter, update, draw, key };
})();
