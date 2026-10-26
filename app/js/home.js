// The home screen. What's on it (apps, the GAMES folder, CONNECT PHONE, SETTINGS), the
// clock and weather are shared; each design (js/designs.js) lays them out its own way
// below and may move around them its own way too.
App.screens.home = (() => {
  const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const SKY = {
    sun: ['...#...', '.#...#.', '..###..', '#.###.#', '..###..', '.#...#.', '...#...'],
    moon: ['..###..', '.##....', '##.....', '##.....', '##.....', '.##....', '..###..'],
    cloud: ['.........', '...##....', '..####.#.', '.########', '#########', '#########', '.#######.'],
    rain: ['...##....', '..#####..', '.#######.', '#########', '.........', '.#..#..#.', '#..#..#..'],
    snow: ['...##....', '..#####..', '.#######.', '#########', '.........', '#.#.#.#.#', '.#.#.#.#.'],
    storm: ['...##....', '..#####..', '.#######.', '#########', '....#....', '...##....', '....#....'],
  };
  const SANS = '"Helvetica Neue", SamsungOne, Roboto, "Segoe UI", Arial, sans-serif';

  // Brand logos shown beside the selected entry, keyed by catalog key, as they load.
  const LOGOS = {};
  ['youtube', 'netflix', 'hulu', 'disney', 'prime', 'max', 'peacock', 'appletv', 'paramount', 'spotify', 'popeyes'].concat((CONFIG.apps || []).map(a => a.key)).forEach(k => {
    const img = new Image();
    img.onload = () => { LOGOS[k] = prepLogo(img); };
    img.src = 'img/logos/' + k + '.png';
  });

  const FOLDER = { key: 'games', name: 'GAMES', short: 'GAMES', color: '#F4F6F8' };
  const SETTINGS = { key: 'settings', name: 'SETTINGS', short: 'SETTINGS', color: '#F4F6F8' };
  const CONNECT = { key: 'connect', name: 'CONNECT PHONE', short: 'PHONE', color: '#1DB954' };
  const LOGO_W = 280, LOGO_H = 140;

  // focus: 'list' (the design's main row or column), 'music' (the controls row) or a
  // design's own extra row. changed: when the selection last moved, for animations.
  let sel = 0, focus = 'list', scrollPos = 0, weather = null, nextFetch = 0, open = false, changed = 0;
  const qrs = {}; // the phone page's QR code per size, made the first time it shows

  // Home rows: the enabled apps, with the games collapsed into one GAMES folder
  // that lists them underneath while open, then CONNECT PHONE (when set up) and SETTINGS.
  function rows() {
    const out = [];
    playableApps().forEach(app => {
      if (app.group !== 'games') return out.push({ app });
      if (!out.some(r => r.folder)) out.push({ app: FOLDER, folder: true });
      if (open) out.push({ app, child: true });
    });
    if (Phones.enabled()) out.push({ app: CONNECT, connect: true });
    out.push({ app: SETTINGS, settings: true });
    return out;
  }

  function closeFolder() {
    open = false;
    sel = rows().findIndex(r => r.folder);
  }

  function activate(row) {
    if (row.folder) open = !open;
    else if (row.settings) App.go('settings');
    else if (row.connect) return;
    else {
      remember(row.app);
      if (row.app.game) App.go(row.app.key);
      else App.go('splash', { app: row.app });
    }
  }

  // Recently opened apps and games, newest first, for designs that show them.
  function remember(app) {
    settings.recent = [app.key].concat((settings.recent || []).filter(k => k !== app.key)).slice(0, 8);
    saveSettings();
  }

  function recentApps() {
    const playable = playableApps();
    return (settings.recent || []).map(k => playable.find(a => a.key === k)).filter(Boolean);
  }

  function skyIcon(w) {
    const c = w.code;
    if (c >= 95) return SKY.storm;
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return SKY.snow;
    if (c >= 51) return SKY.rain;
    if (c >= 2) return SKY.cloud;
    return w.day ? SKY.sun : SKY.moon;
  }

  // Open-Meteo's weather codes in words.
  function skyWords(w) {
    const c = w.code;
    if (c >= 95) return 'Thunderstorms';
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'Snow';
    if (c >= 61) return 'Rain';
    if (c >= 51) return 'Drizzle';
    if (c >= 45) return 'Fog';
    if (c === 3) return 'Cloudy';
    if (c === 2) return 'Partly cloudy';
    return c === 1 ? 'Mostly clear' : 'Clear';
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

  function timeText(d, bare) {
    let h = d.getHours();
    if (settings.clock === '24h') return two(h) + ':' + two(d.getMinutes());
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + two(d.getMinutes()) + (bare ? '' : ' ' + ampm);
  }

  // Catalog names are in capitals for the dot-matrix lettering; designs in a normal
  // typeface want them as written.
  const AS_IS = { TV: 'TV', HDMI: 'HDMI', YOUTUBE: 'YouTube' };
  function title(name) {
    return name.split(' ').map(w => AS_IS[w] || w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  }

  function kind(app) {
    if (app.hdmi) return 'Input';
    if (app.multi) return 'Party game';
    if (app.group === 'games') return 'Game';
    return 'App';
  }

  function phoneQr(size) {
    if (!qrs[size]) qrs[size] = Jam.renderQr(qrMatrix(Phones.url()), null, size);
    return qrs[size];
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

  function font(weight, px) {
    return weight + ' ' + px + 'px ' + SANS;
  }

  // Frosted glass: the scene behind, shrunk and blown back up, under a pale wash.
  function glass(g, blur, x, y, w, h, r, wash) {
    g.save();
    ICONS.rounded(g, x, y, w, h, r);
    g.clip();
    g.imageSmoothingEnabled = true;
    g.drawImage(blur, 0, 0, W, H);
    g.fillStyle = wash || 'rgba(255,255,255,0.16)';
    g.fillRect(x, y, w, h);
    g.restore();
    ICONS.rounded(g, x + 0.5, y + 0.5, w - 1, h - 1, r);
    g.strokeStyle = 'rgba(255,255,255,0.28)';
    g.lineWidth = 1.5;
    g.stroke();
  }

  // ---- Bonito: the dot-matrix list ------------------------------------------

  const bonito = (() => {
    const ROW_H = 96, LIST_Y = 560, LIST_X = 130;

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

    function draw(g) {
      drawBackground(g, design.bg[0], design.bg[1]);

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
          const color = i === sel ? app.color : design.dim;
          w = drawText(g, app.name, x, y - 3.5 * cell, cell, color, { style: 'thin', alpha: Math.max(0.12, 1 - Math.abs(d) * 0.26) });
        }
        if (row.folder) drawCaret(g, x + w + 28, y, i === sel ? app.color : design.dim);
      });

      const right = W - 120;
      const name = 'HELLO ' + CONFIG.name;
      drawText(g, name, right, 120, Math.min(10, 1000 / (name.length * 6)), design.ink, { align: 'right' });
      const now = new Date();
      drawText(g, timeText(now), right, 230, 12, design.ink, { align: 'right' });
      drawText(g, DAYS[now.getDay()] + ' ' + MONTHS[now.getMonth()] + ' ' + now.getDate(), right, 354, 5, design.soft, { style: 'thin', align: 'right' });
      if (weather) {
        const w = drawText(g, weather.temp + '°', right, 410, 6, design.ink, { align: 'right' });
        const ic = skyIcon(weather);
        drawIcon(g, ic, right - w - 30 - ic[0].length * 5, 410 + 3.5 * 6 - 3.5 * 5, 5, design.ink);
      }

      // CONNECT PHONE shows the phone page's QR code where the app logo goes.
      const row = list[sel];
      if (row.connect) {
        const qr = phoneQr(460);
        g.drawImage(qr, right - qr.width, 470);
        drawText(g, 'REMOTE, SPOTIFY AND GAMES', right - qr.width / 2, 470 + qr.height + 26, 3.5, design.soft, { style: 'thin', align: 'center' });
        drawText(g, 'ROOM ' + ROOM, right - qr.width / 2, 470 + qr.height + 66, 3.5, design.mute, { style: 'thin', align: 'center' });
      } else if (LOGOS[row.app.key]) {
        const logo = LOGOS[row.app.key];
        g.drawImage(logo, Math.round(right - logo.width), Math.round(590 - logo.height / 2));
      }

      Music.draw(g, focus === 'music');
      drawLightBar(g);
    }

    return { axis: 'v', draw };
  })();

  // ---- Horizon: a landscape, a big clock behind the mountain, and a dock ----
  // After a smart TV home seen on Instagram: the scene is drawn here, by time of day.

  const horizon = (() => {
    const SCENES = {
      night: {
        sky: ['#060a1d', '#182050', '#3a3c78'], far: '#2a2f62', mid: '#1b1f46', front: ['#2a2c5c', '#0c0e23'],
        snow: 'rgba(205,215,255,0.55)', clock: ['rgba(240,243,255,0.9)', 'rgba(160,170,235,0.5)'], stars: true,
      },
      dawn: {
        sky: ['#2c2b6e', '#c66c9c', '#ffc59c'], far: '#9d6b9f', mid: '#6d4b85', front: ['#5b3f79', '#22163b'],
        snow: 'rgba(255,228,236,0.8)', clock: ['rgba(255,247,250,0.95)', 'rgba(255,198,214,0.55)'], sun: '#ffe1b4',
      },
      day: {
        sky: ['#2c6bcd', '#78afec', '#d4eaff'], far: '#93b3d8', mid: '#6087b3', front: ['#4f719b', '#1d3351'],
        snow: 'rgba(255,255,255,0.92)', clock: ['rgba(255,255,255,0.95)', 'rgba(222,236,255,0.65)'], sun: '#fffbe6',
      },
      dusk: {
        sky: ['#1d2262', '#b0487d', '#ff9c63'], far: '#8b4b7d', mid: '#5d3064', front: ['#4b2959', '#1b0e2b'],
        snow: 'rgba(255,212,200,0.75)', clock: ['rgba(255,242,236,0.95)', 'rgba(255,178,168,0.55)'], sun: '#ffb26f',
      },
    };
    const TILE = 112, GAP = 26, DOCK_Y = 812, CARD_W = 300, CARD_H = 140, CARD_Y = 618;
    const PEAK_X = W * 0.53, PEAK_Y = 410;
    let scene = null, sceneKey = '', rsel = 0, dockOff = null;

    function period(h) {
      if (h >= 20 || h < 5) return 'night';
      if (h < 8) return 'dawn';
      if (h < 17) return 'day';
      return 'dusk';
    }

    // A mountain ridge as a path closed along the bottom: rolling sines, plus a peak.
    function ridge(base, amp, seed, peak) {
      const p = new Path2D();
      p.moveTo(0, H);
      for (let x = 0; x <= W; x += 6) {
        let y = base + amp * (0.6 * Math.sin(x * 0.0021 + seed) + 0.3 * Math.sin(x * 0.0061 + seed * 2.3) + 0.12 * Math.sin(x * 0.019 + seed * 4.1));
        if (peak) {
          const t = Math.max(0, 1 - Math.abs(x - peak.x) / peak.w);
          y -= peak.h * Math.pow(t, 1.25) * (1 + 0.05 * Math.sin(x * 0.05 + seed));
        }
        p.lineTo(x, y);
      }
      p.lineTo(W, H);
      p.closePath();
      return p;
    }

    // Three layers: the sky and far hills (behind the clock), the big peak and the
    // foreground (in front of it), and a blurred copy of both for the glass.
    function build(name) {
      const s = SCENES[name];
      const back = makeCanvas(W, H, b => {
        const sky = b.createLinearGradient(0, 0, 0, H * 0.8);
        sky.addColorStop(0, s.sky[0]);
        sky.addColorStop(0.55, s.sky[1]);
        sky.addColorStop(1, s.sky[2]);
        b.fillStyle = sky;
        b.fillRect(0, 0, W, H);
        if (s.stars) {
          let seed = 7;
          const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
          b.fillStyle = '#ffffff';
          for (let i = 0; i < 260; i++) {
            b.globalAlpha = 0.25 + rnd() * 0.7;
            b.fillRect(rnd() * W, rnd() * H * 0.6, 1.2 + rnd() * 1.6, 1.2 + rnd() * 1.6);
          }
          b.globalAlpha = 1;
        }
        if (s.sun) {
          const sun = b.createRadialGradient(W * 0.22, H * 0.56, 10, W * 0.22, H * 0.56, 520);
          sun.addColorStop(0, s.sun);
          sun.addColorStop(1, 'rgba(255,255,255,0)');
          b.fillStyle = sun;
          b.fillRect(0, 0, W, H);
        }
        b.fillStyle = s.far;
        b.fill(ridge(640, 70, 1.3, { x: W * 0.18, w: 520, h: 120 }));
        b.fillStyle = s.mid;
        b.fill(ridge(700, 60, 4.2, { x: W * 0.86, w: 600, h: 160 }));
      });
      const front = makeCanvas(W, H, b => {
        const peak = ridge(800, 30, 2.7, { x: PEAK_X, w: 680, h: 800 - PEAK_Y });
        const rock = b.createLinearGradient(0, PEAK_Y, 0, H);
        rock.addColorStop(0, s.front[0]);
        rock.addColorStop(1, s.front[1]);
        b.fillStyle = rock;
        b.fill(peak);
        // Snow on the upper slopes, fading out downhill.
        b.save();
        b.clip(peak);
        const snow = b.createLinearGradient(0, PEAK_Y, 0, PEAK_Y + 200);
        snow.addColorStop(0, s.snow);
        snow.addColorStop(1, 'rgba(255,255,255,0)');
        b.fillStyle = snow;
        b.fillRect(0, PEAK_Y - 10, W, 210);
        b.restore();
        // A dark tree line, then shade so the dock reads.
        b.fillStyle = s.front[1];
        b.fill(ridge(900, 18, 5.5));
        b.beginPath();
        for (let x = -20; x < W + 20; x += 22) {
          const top = 862 + 22 * Math.sin(x * 0.013) + 14 * Math.sin(x * 0.11);
          b.moveTo(x, 940);
          b.lineTo(x + 11, top);
          b.lineTo(x + 22, 940);
        }
        b.fill();
        const shade = b.createLinearGradient(0, 560, 0, H);
        shade.addColorStop(0, 'rgba(0,0,0,0)');
        shade.addColorStop(1, 'rgba(0,0,0,0.45)');
        b.fillStyle = shade;
        b.fillRect(0, 560, W, H - 560);
      });
      const blur = makeCanvas(W / 24, H / 24, b => {
        b.imageSmoothingQuality = 'high';
        b.drawImage(back, 0, 0, W / 24, H / 24);
        b.drawImage(front, 0, 0, W / 24, H / 24);
      });
      return { s, back, front, blur };
    }

    function pill(g, text, x, y, on) {
      g.font = font(600, 26);
      const w = g.measureText(text).width + 48;
      if (on) {
        ICONS.rounded(g, x, y, w, 52, 26);
        g.fillStyle = 'rgba(255,255,255,0.92)';
        g.fill();
      } else glass(g, scene.blur, x, y, w, 52, 26);
      g.fillStyle = on ? '#16182b' : '#ffffff';
      g.textBaseline = 'middle';
      g.textAlign = 'left';
      g.fillText(text, x + 24, y + 27);
      return w;
    }

    function shadowText(g, text, x, y) {
      g.shadowColor = 'rgba(0,0,0,0.35)';
      g.shadowBlur = 10;
      g.fillText(text, x, y);
      g.shadowBlur = 0;
    }

    function cards() {
      const recent = recentApps();
      return recent.length ? { label: 'Jump back in', apps: recent.slice(0, 4) } : { label: 'Try these', apps: ['youtube', 'flappy', 'wordle', 'trivia'].map(k => playableApps().find(a => a.key === k)).filter(Boolean) };
    }

    function draw(g) {
      const now = new Date();
      const p = period(now.getHours());
      if (sceneKey !== p) {
        scene = build(p);
        sceneKey = p;
      }
      g.drawImage(scene.back, 0, 0);

      // The clock, behind the peak.
      g.save();
      g.translate(W / 2, 560);
      g.scale(0.84, 1);
      g.font = font(200, 400);
      g.textAlign = 'center';
      g.textBaseline = 'alphabetic';
      const ink = g.createLinearGradient(0, -300, 0, 0);
      ink.addColorStop(0, scene.s.clock[0]);
      ink.addColorStop(1, scene.s.clock[1]);
      g.fillStyle = ink;
      g.fillText(timeText(now, true), 0, 0);
      g.restore();
      g.drawImage(scene.front, 0, 0);

      // Date and weather above the clock.
      g.font = font(500, 30);
      g.textBaseline = 'middle';
      g.fillStyle = '#ffffff';
      const date = DAY_NAMES[now.getDay()] + ' ' + now.getDate() + ' ' + MONTH_NAMES[now.getMonth()];
      const sky = weather ? weather.temp + '°   ' + skyWords(weather) : '';
      const dw = g.measureText(date).width, sw = weather ? g.measureText(sky).width + 56 : 0;
      let x = W / 2 - (dw + sw) / 2;
      g.textAlign = 'left';
      shadowText(g, date, x, 148);
      if (weather) {
        const ic = skyIcon(weather);
        drawIcon(g, ic, x + dw + 28, 148 - ic.length * 2, 4, '#ffffff');
        shadowText(g, sky, x + dw + 40 + ic[0].length * 4, 148);
      }

      // Who's here, and the room phones join.
      const pw = pill(g, CONFIG.name.charAt(0) + CONFIG.name.slice(1).toLowerCase(), 80, 64, true);
      pill(g, 'Room ' + ROOM, 80 + pw + 14, 64, false);
      glass(g, scene.blur, W - 132, 64, 52, 52, 26);
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(W - 106, 90, 12, 0, Math.PI * 2);
      g.fill();
      if (p === 'night' || p === 'dusk') {
        g.fillStyle = 'rgba(70,74,120,1)';
        g.beginPath();
        g.arc(W - 100, 85, 11, 0, Math.PI * 2);
        g.fill();
      }

      // Recently opened, on glass cards.
      const c = cards();
      g.font = font(600, 28);
      g.fillStyle = '#ffffff';
      shadowText(g, c.label, 120, CARD_Y - 30);
      c.apps.forEach((app, i) => {
        const cx = 120 + i * (CARD_W + 24), on = focus === 'recent' && i === rsel;
        glass(g, scene.blur, cx, CARD_Y, CARD_W, CARD_H, 22, on ? 'rgba(255,255,255,0.34)' : null);
        if (on) {
          ICONS.rounded(g, cx - 4, CARD_Y - 4, CARD_W + 8, CARD_H + 8, 26);
          g.strokeStyle = '#ffffff';
          g.lineWidth = 4;
          g.stroke();
        }
        g.drawImage(ICONS.tile(app, 80), cx + 24, CARD_Y + 30);
        g.fillStyle = '#ffffff';
        g.font = font(600, 28);
        g.fillText(title(app.short), cx + 124, CARD_Y + 58);
        g.globalAlpha = 0.75;
        g.font = font(400, 22);
        g.fillText(kind(app), cx + 124, CARD_Y + 92);
        g.globalAlpha = 1;
      });

      // The dock, scrolled to keep the selected tile in view.
      const list = rows(), span = TILE + GAP, total = list.length * span - GAP, maxW = W - 280;
      const panelW = Math.min(total, maxW) + 48, panelX = (W - panelW) / 2;
      const want = total <= maxW ? 0 : Math.max(0, Math.min(total - maxW, sel * span - maxW / 2 + TILE / 2));
      dockOff = dockOff == null ? want : dockOff + (want - dockOff) * 0.2;
      glass(g, scene.blur, panelX, DOCK_Y, panelW, TILE + 40, 36, 'rgba(255,255,255,0.12)');
      g.save();
      ICONS.rounded(g, panelX, DOCK_Y - 80, panelW, TILE + 140, 36);
      g.clip();
      list.forEach((row, i) => {
        const tx = panelX + 24 + i * span - dockOff, on = focus === 'list' && i === sel;
        if (tx < panelX - TILE || tx > panelX + panelW) return;
        const size = on ? 124 : TILE, ty = DOCK_Y + 20 - (on ? 14 : 0);
        g.globalAlpha = row.child || !open || row.folder ? 1 : 0.55;
        g.drawImage(ICONS.tile(row.app, size), tx - (size - TILE) / 2, ty);
        g.globalAlpha = 1;
        if (on) {
          ICONS.rounded(g, tx - (size - TILE) / 2 - 5, ty - 5, size + 10, size + 10, 32);
          g.strokeStyle = '#ffffff';
          g.lineWidth = 4;
          g.stroke();
        }
      });
      g.restore();
      const row = list[sel];
      if (focus === 'list') {
        g.font = font(600, 26);
        g.textAlign = 'center';
        g.fillStyle = '#ffffff';
        const lx = Math.max(160, Math.min(W - 160, panelX + 24 + sel * span - dockOff + TILE / 2));
        shadowText(g, row.folder ? (open ? 'Games' : 'Games  ›') : title(row.app.name), lx, DOCK_Y - 32);
        g.textAlign = 'left';
      }

      // CONNECT PHONE: the QR code on its own card.
      if (row.connect && focus === 'list') {
        const qr = phoneQr(300);
        glass(g, scene.blur, W - 160 - qr.width - 40, CARD_Y - 300, qr.width + 40, qr.height + 110, 26);
        g.drawImage(qr, W - 160 - qr.width - 20, CARD_Y - 280);
        g.fillStyle = '#ffffff';
        g.font = font(500, 24);
        g.textAlign = 'center';
        g.fillText('Scan to use your phone', W - 160 - qr.width / 2 - 20, CARD_Y - 280 + qr.height + 46);
        g.textAlign = 'left';
      }

      Music.draw(g, focus === 'music');
    }

    // Up from the dock reaches the cards; Back or Down returns.
    function key(k) {
      const c = cards().apps;
      if (focus === 'recent') {
        if (k === 'left') rsel = Math.max(0, rsel - 1);
        else if (k === 'right') rsel = Math.min(c.length - 1, rsel + 1);
        else if (k === 'down') focus = 'list';
        else if (k === 'ok' && c[rsel]) activate({ app: c[rsel] });
        return true;
      }
      if (focus === 'list' && k === 'up') {
        if (c.length) {
          focus = 'recent';
          rsel = Math.min(rsel, c.length - 1);
        }
        return true;
      }
      return false;
    }

    return { axis: 'h', draw, key };
  })();

  // ---- Departures: an airport split-flap board ------------------------------

  const departures = (() => {
    const PLANE = ['.......#....', '.......##...', '#......###..', '##....#####.', '############', '##....#####.', '#......###..', '.......##...', '.......#....'];
    const ROWS = 8, ROW_Y = 300, ROW_H = 84, NAME_W = 14;
    const FLAPS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const COLS = { time: 150, icon: 350, name: 440, gate: 1130, remarks: 1300 };

    function pad(str, n) {
      str = str.slice(0, n);
      while (str.length < n) str += ' ';
      return str;
    }

    // Letters flick through the alphabet and land one after another, left to right.
    function flip(str, since) {
      const t = clock - since;
      if (t > 0.12 + str.length * 0.03) return str;
      let out = '';
      for (let i = 0; i < str.length; i++) {
        out += t > 0.12 + i * 0.03 || str[i] === ' ' ? str[i] : FLAPS[Math.floor(clock * 40 + i * 7) % FLAPS.length];
      }
      return out;
    }

    function gate(row, i) {
      if (row.app.hdmi) return 'H' + row.app.hdmi;
      if (row.child || row.folder) return 'G' + two(i);
      return 'A' + two(i);
    }

    function remarks(row, on) {
      if (row.connect) return 'SCAN QR';
      if (row.folder) return on ? (open ? 'OK CLOSES' : 'OK OPENS') : 'GAMES';
      if (row.app.hdmi) return 'ARRIVED';
      return on ? 'BOARDING' : 'ON TIME';
    }

    function draw(g) {
      drawBackground(g, design.bg[0], design.bg[1]);
      const now = new Date();
      drawIcon(g, PLANE, 120, 92, 7, design.ink);
      drawText(g, 'DEPARTURES', 240, 84, 9, design.ink);
      drawText(g, two(now.getHours()) + ':' + two(now.getMinutes()), W - 120, 84, 9, design.ink, { align: 'right' });
      let info = DAYS[now.getDay()] + ' ' + now.getDate() + ' ' + MONTHS[now.getMonth()];
      if (weather) info += '     ' + (CONFIG.city ? CONFIG.city + ' ' : '') + weather.temp + '° ' + skyWords(weather);
      drawText(g, info, 240, 178, 3.5, design.dim, { style: 'thin' });
      drawText(g, 'WELCOME ' + CONFIG.name, W - 120, 178, 3.5, design.dim, { style: 'thin', align: 'right' });

      [['TIME', 'time'], ['DESTINATION', 'name'], ['GATE', 'gate'], ['REMARKS', 'remarks']].forEach(c => drawText(g, c[0], COLS[c[1]], 246, 3.2, design.mute, { style: 'thin' }));
      g.fillStyle = design.mute;
      g.fillRect(120, 280, W - 240, 2);

      const list = rows();
      const top = Math.max(0, Math.min(sel - 3, list.length - ROWS));
      // Departures every five minutes from the next five-minute mark.
      const first = Math.ceil((now.getHours() * 60 + now.getMinutes() + 1) / 5) * 5;
      list.slice(top, top + ROWS).forEach((row, j) => {
        const i = top + j, y = ROW_Y + j * ROW_H, on = i === sel && focus === 'list';
        if (on) {
          g.fillStyle = 'rgba(255,197,61,0.1)';
          g.fillRect(120, y - 6, W - 240, ROW_H - 10);
          g.fillStyle = design.ink;
          g.fillRect(120, y - 6, 6, ROW_H - 10);
        } else if (j % 2) {
          g.fillStyle = 'rgba(255,255,255,0.025)';
          g.fillRect(120, y - 6, W - 240, ROW_H - 10);
        }
        const ink = on ? design.ink : design.soft, m = (first + i * 5) % 1440;
        drawText(g, two(Math.floor(m / 60)) + ':' + two(m % 60), COLS.time, y + 6, 5, ink);
        g.drawImage(ICONS.tile(row.app, 60), COLS.icon, y + 2);
        const name = pad((row.child ? '  ' : '') + row.app.name, NAME_W);
        drawText(g, on ? flip(name, changed) : name, COLS.name, y + 6, 5, ink);
        drawText(g, gate(row, i + 1), COLS.gate, y + 6, 5, ink);
        const r = pad(remarks(row, on), 9);
        const blink = on && r.trim() === 'BOARDING' ? 0.55 + 0.45 * Math.cos(clock * 5) : 1;
        drawText(g, on ? flip(r, changed) : r, COLS.remarks, y + 6, 5, on ? '#7dff9a' : ink, { alpha: blink });
      });
      if (list.length > ROWS) drawText(g, (top + 1) + '-' + Math.min(list.length, top + ROWS) + ' OF ' + list.length, W - 120, 980, 3, design.mute, { style: 'thin', align: 'right' });

      // CONNECT PHONE pins its QR code over the right of the board.
      if (list[sel].connect) {
        const qr = phoneQr(360);
        g.fillStyle = '#0b0b0b';
        g.fillRect(W - 120 - qr.width - 40, 300, qr.width + 40, qr.height + 100);
        g.drawImage(qr, W - 120 - qr.width - 20, 320);
        drawText(g, 'ROOM ' + ROOM, W - 140 - qr.width / 2, 340 + qr.height + 10, 3.5, design.dim, { style: 'thin', align: 'center' });
      }

      Music.draw(g, focus === 'music');
      drawLightBar(g);
    }

    return { axis: 'v', draw };
  })();

  // ---- Teletext: a page of the old TV text service --------------------------

  const teletext = (() => {
    const BLUE = '#0000ff', CYAN = '#00ffff', YELLOW = '#ffff00', WHITE = '#ffffff', GREEN = '#00ff00', RED = '#ff0000', MAGENTA = '#ff00ff';
    const ROWS = 9, ROW_Y = 372, ROW_H = 62, CELL = 5;
    const mosaics = {};

    // Pages: apps from 101, the games folder 200 and its games from 201, inputs 300s.
    function page(list, row, i) {
      if (row.folder) return 200;
      if (row.child) return 200 + list.filter((r, j) => r.child && j <= i).length;
      if (row.app.hdmi) return 300 + row.app.hdmi;
      if (row.connect) return 400;
      if (row.settings) return 500;
      return 100 + list.filter((r, j) => !r.folder && !r.child && !r.app.hdmi && j <= i).length;
    }

    // The app's tile in big chunky blocks, like a teletext picture.
    function mosaic(app) {
      if (!mosaics[app.key]) {
        const small = makeCanvas(52, 52, b => b.drawImage(ICONS.tile(app, 104), 0, 0, 52, 52));
        mosaics[app.key] = makeCanvas(312, 312, b => {
          b.imageSmoothingEnabled = false;
          b.drawImage(small, 0, 0, 312, 312);
        });
      }
      return mosaics[app.key];
    }

    function band(g, y, h, color) {
      g.fillStyle = color;
      g.fillRect(80, y, W - 160, h);
    }

    function draw(g) {
      g.fillStyle = '#000000';
      g.fillRect(0, 0, W, H);
      const now = new Date();
      drawText(g, 'P100', 100, 44, 4.5, WHITE);
      drawText(g, '100 BONITO', 340, 44, 4.5, WHITE);
      drawText(g, DAYS[now.getDay()] + ' ' + now.getDate() + ' ' + MONTHS[now.getMonth()], 1080, 44, 4.5, WHITE);
      drawText(g, two(now.getHours()) + ':' + two(now.getMinutes()) + '/' + two(now.getSeconds()), W - 100, 44, 4.5, YELLOW, { align: 'right' });

      // Title in double height on a blue band, with a strip of block graphics.
      band(g, 108, 168, BLUE);
      g.save();
      g.imageSmoothingEnabled = false;
      g.translate(130, 128);
      g.scale(1, 1.75);
      drawText(g, 'BONITO', 0, 0, 10, YELLOW);
      g.restore();
      for (let i = 0; i < 15; i++) {
        g.fillStyle = [CYAN, MAGENTA, GREEN, YELLOW][i % 4];
        if ((i * 7) % 5 < 3) g.fillRect(820 + i * 36, 140 + ((i * 3) % 4) * 24, 30, 22);
      }
      if (weather) {
        const ic = skyIcon(weather);
        drawIcon(g, ic, W - 400, 156, 9, YELLOW);
        drawText(g, weather.temp + '°', W - 130, 168, 8, WHITE, { align: 'right' });
      }

      drawText(g, 'HELLO ' + CONFIG.name, 100, 300, CELL, CYAN);
      if (weather) drawText(g, (CONFIG.city ? CONFIG.city + ' ' : '') + skyWords(weather), W - 100, 300, CELL, GREEN, { align: 'right' });

      const list = rows();
      const top = Math.max(0, Math.min(sel - 4, list.length - ROWS));
      list.slice(top, top + ROWS).forEach((row, j) => {
        const i = top + j, y = ROW_Y + j * ROW_H, on = i === sel && focus === 'list';
        const name = (row.child ? '  ' : '') + row.app.name + (row.folder ? (open ? ' -' : ' +') : '');
        const num = String(page(list, row, i));
        if (on) {
          g.fillStyle = CYAN;
          g.fillRect(80, y - 10, 1060, ROW_H - 4);
        }
        const x = 100;
        const w = drawText(g, name, x, y, CELL, on ? '#000000' : WHITE);
        const dots = Math.max(1, Math.floor((1060 - x - w - 30 * CELL) / (6 * CELL)));
        drawText(g, '.'.repeat(dots), x + w + 6 * CELL, y, CELL, on ? BLUE : CYAN);
        drawText(g, num, 1100, y, CELL, on ? '#000000' : YELLOW, { align: 'right' });
      });

      const row = list[sel];
      if (row.connect) {
        const qr = phoneQr(312);
        g.drawImage(qr, W - 100 - qr.width, ROW_Y - 10);
        drawText(g, 'ROOM ' + ROOM, W - 100 - qr.width / 2, ROW_Y + qr.height + 20, 4, YELLOW, { align: 'center' });
      } else if (!row.settings) {
        g.drawImage(mosaic(row.app), W - 412, ROW_Y - 10);
        drawText(g, kind(row.app).toUpperCase(), W - 256, ROW_Y + 330, 4, GREEN, { align: 'center' });
      }

      // Fastext row along the bottom.
      const hints = [['UP/DOWN', RED], ['OK OPENS', GREEN], ['BACK', YELLOW], ['ROOM ' + ROOM, CYAN]];
      hints.forEach((h, i) => drawText(g, h[0], 100 + i * 440, H - 150, 4.5, h[1]));

      Music.draw(g, focus === 'music');
    }

    return { axis: 'v', draw };
  })();

  // ---- Media bar: categories across, items down, on a moving wave -----------
  // After the game console menus of the late 2000s.

  const mediabar = (() => {
    const CAT_X = 400, CAT_Y = 210, CAT_GAP = 250, ITEM_Y = 420, ITEM_H = 108;
    const isApp = r => !r.folder && !r.child && !r.connect && !r.settings;
    let cat = 0, catPos = 0;
    const item = {}, itemPos = {};

    // The menu, rebuilt from the home rows each frame (inputs come and go).
    function menu() {
      const all = playableApps();
      const out = [
        { key: 'tv', name: 'TV & Video', items: all.filter(a => a.group !== 'games').map(app => ({ app })) },
        { key: 'games', name: 'Games', items: all.filter(a => a.group === 'games').map(app => ({ app })) },
      ];
      if (Phones.enabled()) out.push({ key: 'connect', name: 'Phone', items: [{ app: CONNECT, connect: true }] });
      out.push({ key: 'settings', name: 'Settings', items: [{ app: SETTINGS, settings: true }] });
      return out.filter(c => c.items.length);
    }

    function wave(g) {
      const grad = g.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, design.bg[0]);
      grad.addColorStop(1, design.bg[1]);
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      g.lineWidth = 1.5;
      for (let r = 0; r < 2; r++) {
        for (let l = 0; l < 14; l++) {
          g.strokeStyle = 'rgba(255,255,255,' + (0.08 + 0.03 * Math.sin(l)) + ')';
          g.beginPath();
          for (let x = 0; x <= W; x += 16) {
            const y = H * (0.62 + r * 0.08) + (90 - r * 30) * Math.sin(x * 0.0026 + clock * (0.25 + r * 0.1) + l * 0.07 + r * 2) + l * (5 + r * 3) * Math.sin(x * 0.0012 + clock * 0.2);
            if (x) g.lineTo(x, y);
            else g.moveTo(x, y);
          }
          g.stroke();
        }
      }
    }

    function draw(g) {
      wave(g);
      const m = menu();
      cat = Math.min(cat, m.length - 1);
      catPos += (cat - catPos) * 0.2;
      const now = new Date();

      g.textBaseline = 'middle';
      g.fillStyle = '#ffffff';
      g.font = font(300, 30);
      g.textAlign = 'right';
      g.fillText(now.getDate() + '/' + (now.getMonth() + 1) + '   ' + timeText(now), W - 110, 96);
      if (weather) {
        g.globalAlpha = 0.8;
        g.font = font(300, 24);
        g.fillText(weather.temp + '°  ' + skyWords(weather), W - 110, 136);
        g.globalAlpha = 1;
      }
      g.textAlign = 'left';

      m.forEach((c, i) => {
        const x = CAT_X + (i - catPos) * CAT_GAP, on = i === cat;
        const size = on ? 104 : 80;
        g.globalAlpha = on ? 1 : 0.55;
        g.drawImage(ICONS.glyph(c.key, size, '#ffffff'), x - size / 2, CAT_Y - size / 2);
        g.globalAlpha = 1;
        if (on) {
          g.font = font(400, 30);
          g.textAlign = 'center';
          g.fillText(c.name, x, CAT_Y + 90);
          g.textAlign = 'left';
        }
      });

      const c = m[cat], k = c.key;
      item[k] = Math.min(item[k] || 0, c.items.length - 1);
      itemPos[k] = itemPos[k] == null ? item[k] : itemPos[k] + (item[k] - itemPos[k]) * 0.22;
      c.items.forEach((it, i) => {
        const d = i - itemPos[k];
        // The selected item sits under the bar; ones before it move up above.
        const y = d >= 0 ? ITEM_Y + d * ITEM_H + (d > 0.5 ? 30 : d * 60) : CAT_Y - 140 + (d + 1) * ITEM_H * 0.8;
        if (y < 40 || y > H - 110) return;
        const on = i === item[k] && focus === 'list', size = on ? 100 : 72;
        g.globalAlpha = on ? 1 : d < 0 ? 0.35 : 0.75;
        g.drawImage(ICONS.tile(it.app, size), CAT_X - size / 2, y - size / 2);
        g.font = font(on ? 400 : 300, on ? 40 : 32);
        if (on) {
          g.shadowColor = 'rgba(255,255,255,0.9)';
          g.shadowBlur = 16;
        }
        g.fillText(it.folder ? 'Games' : title(it.app.name), CAT_X + 90, y - (on ? 14 : 0));
        g.shadowBlur = 0;
        if (on) {
          g.font = font(300, 24);
          g.globalAlpha = 0.8;
          g.fillText(it.connect ? 'Remote, Spotify and games on your phone' : it.settings ? 'Apps, design, clock' : kind(it.app), CAT_X + 90, y + 28);
        }
        g.globalAlpha = 1;
      });

      if (c.items[item[k]].connect) {
        const qr = phoneQr(380);
        g.drawImage(qr, W - 200 - qr.width, ITEM_Y - 60);
        g.font = font(300, 26);
        g.textAlign = 'center';
        g.fillText('Room ' + ROOM, W - 200 - qr.width / 2, ITEM_Y + qr.height - 20);
        g.textAlign = 'left';
      }

      Music.draw(g, focus === 'music');
    }

    function key(k) {
      if (focus !== 'list') return false;
      const m = menu(), c = m[cat], i = item[c.key] || 0;
      if (k === 'left') cat = Math.max(0, cat - 1);
      else if (k === 'right') cat = Math.min(m.length - 1, cat + 1);
      else if (k === 'up') item[c.key] = Math.max(0, i - 1);
      else if (k === 'down' && i === c.items.length - 1) { if (Music.enabled()) focus = 'music'; }
      else if (k === 'down') item[c.key] = i + 1;
      else if (k === 'ok') activate(c.items[i]);
      else return false;
      return true;
    }

    return { draw, key };
  })();

  const LAYOUTS = { bonito, horizon, departures, teletext, mediabar };
  const layout = () => LAYOUTS[design.key] || bonito;

  function enter() {
    focus = 'list';
    sel = Math.min(sel, rows().length - 1);
    scrollPos = sel;
    changed = clock;
    refreshWeather();
  }

  function update(dt) {
    // HDMI entries come and go while this screen is open.
    sel = Math.min(sel, rows().length - 1);
    scrollPos += (sel - scrollPos) * Math.min(1, dt * 12);
    refreshWeather();
  }

  function draw(g) {
    layout().draw(g);
  }

  function key(k, repeat, fromPhone) {
    const L = layout(), list = rows(), row = list[sel], before = sel;
    if (k === 'back') {
      if (focus !== 'list') focus = 'list';
      else if (open) closeFolder();
      // A guest's phone can't open the launcher again, so it can't close it either.
      else if (!fromPhone) Platform.exit();
      return;
    }
    if (focus === 'music') {
      if (k === 'up') focus = 'list';
      else Music.key(k);
      return;
    }
    if (L.key && L.key(k)) return;
    const across = L.axis === 'h';
    if (k === (across ? 'left' : 'up')) sel = Math.max(0, sel - 1);
    else if (k === 'down' && (across || sel === list.length - 1)) { if (Music.enabled()) focus = 'music'; }
    else if (k === (across ? 'right' : 'down')) sel = Math.min(list.length - 1, sel + 1);
    else if (!across && k === 'left' && row.child) closeFolder();
    else if (k === 'ok') activate(row);
    if (sel !== before) changed = clock;
  }

  return { enter, update, draw, key };
})();
