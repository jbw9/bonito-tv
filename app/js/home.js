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

  // Sections across, items down, for Panorama and Media bar; rebuilt each frame, as
  // inputs come and go.
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

  // ---- Bonito: the dot-matrix list ------------------------------------------
  // After a TV home screen by @tyler_ (instagram.com/tyler_).

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

  // ---- Horizon: a mountain photo, a big clock behind the peak, and a dock ----
  // After a smart TV home by @joshuaseage (instagram.com/joshuaseage). The photo is
  // images.unsplash.com/photo-1483728642387-6c3bdd6c93e5 (Unsplash License); its mask
  // is the mountains alone, cut along the ridge so they can stand in front of the clock.

  const horizon = (() => {
    // Light over the photo by time of day (a blend mode and colour), and the clock's ink.
    const SCENES = {
      night: { tint: ['multiply', 'rgb(88,98,160)'], clock: ['rgba(240,243,255,0.9)', 'rgba(160,170,235,0.5)'] },
      dawn: { tint: ['soft-light', 'rgba(255,150,175,0.6)'], clock: ['rgba(255,247,250,0.95)', 'rgba(255,198,214,0.55)'] },
      day: { tint: null, clock: ['rgba(255,255,255,0.95)', 'rgba(222,236,255,0.65)'] },
      dusk: { tint: ['soft-light', 'rgba(255,125,60,0.6)'], clock: ['rgba(255,242,236,0.95)', 'rgba(255,178,168,0.55)'] },
    };
    const TILE = 112, GAP = 26, DOCK_Y = 812, CARD_W = 300, CARD_H = 140, CARD_Y = 618;
    let scene = null, sceneKey = '', rsel = 0, dockOff = null, loaded = 0;

    const photo = new Image(), mask = new Image();
    [photo, mask].forEach(img => {
      img.onload = () => {
        loaded++;
        sceneKey = '';
      };
    });
    photo.src = 'img/horizon/mountains.jpg';
    mask.src = 'img/horizon/mountains-mask.png';

    function period(h) {
      if (h >= 20 || h < 5) return 'night';
      if (h < 8) return 'dawn';
      if (h < 17) return 'day';
      return 'dusk';
    }

    // Three layers: the tinted photo (behind the clock), its mountains alone (in front
    // of it), and a blurred copy for the glass. Plain teal until the photo has loaded.
    function build(name) {
      const s = SCENES[name], ready = loaded === 2;
      const back = makeCanvas(W, H, b => {
        if (!ready) {
          b.fillStyle = '#29464b';
          b.fillRect(0, 0, W, H);
          return;
        }
        b.drawImage(photo, 0, 0, W, H);
        if (s.tint) {
          b.globalCompositeOperation = s.tint[0];
          b.fillStyle = s.tint[1];
          b.fillRect(0, 0, W, H);
          b.globalCompositeOperation = 'source-over';
        }
        // Shade along the bottom so the dock reads.
        const shade = b.createLinearGradient(0, 560, 0, H);
        shade.addColorStop(0, 'rgba(0,0,0,0)');
        shade.addColorStop(1, 'rgba(0,0,0,0.45)');
        b.fillStyle = shade;
        b.fillRect(0, 560, W, H - 560);
      });
      const front = makeCanvas(W, H, b => {
        if (!ready) return;
        b.drawImage(back, 0, 0);
        b.globalCompositeOperation = 'destination-in';
        b.drawImage(mask, 0, 0, W, H);
      });
      const blur = makeCanvas(W / 24, H / 24, b => {
        b.imageSmoothingQuality = 'high';
        b.drawImage(back, 0, 0, W / 24, H / 24);
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

  // ---- Dial: a radio, with every app a station ------------------------------
  // After Dieter Rams' radios and clocks for Braun: a speaker grille, a clock with an
  // orange second hand, and a tuning scale that slides under a fixed needle.

  const dial = (() => {
    const PANEL = '#e8e5de', FACE = '#f6f5f1', INK = '#1d1c1a', GREY = '#77736b', ORANGE = '#ee6a1f';
    const STEP = 250, SCALE_X = 120, SCALE_Y = 690, SCALE_W = W - 240, SCALE_H = 170;
    const CLOCK_X = W - 310, CLOCK_Y = 360, CLOCK_R = 190, INFO_X = 860;

    const panel = makeCanvas(W, H, b => {
      const grad = b.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#efece6');
      grad.addColorStop(1, '#dcd8cf');
      b.fillStyle = grad;
      b.fillRect(0, 0, W, H);
      // The grille: holes punched in the panel, each with a lit lower lip.
      for (let y = 0; y < 18; y++) {
        for (let x = 0; x < 29; x++) {
          const cx = 132 + x * 22, cy = 242 + y * 22;
          b.fillStyle = 'rgba(255,255,255,0.75)';
          b.beginPath();
          b.arc(cx, cy + 1.2, 6, 0, Math.PI * 2);
          b.fill();
          b.fillStyle = '#2b2a27';
          b.beginPath();
          b.arc(cx, cy, 6, 0, Math.PI * 2);
          b.fill();
        }
      }
    });

    function knob(g, x, y, r, turn) {
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.25)';
      g.shadowBlur = 18;
      g.shadowOffsetY = 6;
      const grad = g.createLinearGradient(x, y - r, x, y + r);
      grad.addColorStop(0, '#f4f2ed');
      grad.addColorStop(1, '#c9c4ba');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.restore();
      g.strokeStyle = INK;
      g.lineWidth = 5;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x + Math.sin(turn) * r * 0.35, y - Math.cos(turn) * r * 0.35);
      g.lineTo(x + Math.sin(turn) * r * 0.8, y - Math.cos(turn) * r * 0.8);
      g.stroke();
    }

    function hand(g, angle, length, width, color) {
      g.strokeStyle = color;
      g.lineWidth = width;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(CLOCK_X - Math.sin(angle) * length * 0.16, CLOCK_Y + Math.cos(angle) * length * 0.16);
      g.lineTo(CLOCK_X + Math.sin(angle) * length, CLOCK_Y - Math.cos(angle) * length);
      g.stroke();
    }

    function drawClock(g, now) {
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.18)';
      g.shadowBlur = 30;
      g.shadowOffsetY = 10;
      g.fillStyle = FACE;
      g.beginPath();
      g.arc(CLOCK_X, CLOCK_Y, CLOCK_R, 0, Math.PI * 2);
      g.fill();
      g.restore();
      for (let i = 0; i < 60; i++) {
        const a = i / 60 * Math.PI * 2, hour = i % 5 === 0, r0 = CLOCK_R * (hour ? 0.8 : 0.88);
        g.strokeStyle = hour ? INK : GREY;
        g.lineWidth = hour ? 7 : 2;
        g.lineCap = 'butt';
        g.beginPath();
        g.moveTo(CLOCK_X + Math.sin(a) * r0, CLOCK_Y - Math.cos(a) * r0);
        g.lineTo(CLOCK_X + Math.sin(a) * CLOCK_R * 0.93, CLOCK_Y - Math.cos(a) * CLOCK_R * 0.93);
        g.stroke();
      }
      const s = now.getSeconds() + now.getMilliseconds() / 1000, m = now.getMinutes() + s / 60, h = now.getHours() % 12 + m / 60;
      hand(g, h / 12 * Math.PI * 2, CLOCK_R * 0.52, 12, INK);
      hand(g, m / 60 * Math.PI * 2, CLOCK_R * 0.78, 8, INK);
      hand(g, s / 60 * Math.PI * 2, CLOCK_R * 0.86, 3, ORANGE);
      g.fillStyle = ORANGE;
      g.beginPath();
      g.arc(CLOCK_X, CLOCK_Y, 9, 0, Math.PI * 2);
      g.fill();
    }

    function about(row) {
      if (row.folder) return open ? 'OK puts the games away' : 'OK tunes into ' + playableApps().filter(a => a.group === 'games').length + ' games';
      if (row.connect) return 'Remote, Spotify and games on your phone';
      if (row.settings) return 'Apps, design, clock';
      return kind(row.app);
    }

    function draw(g) {
      g.drawImage(panel, 0, 0);
      const now = new Date(), h = now.getHours();
      g.textBaseline = 'alphabetic';
      g.textAlign = 'left';
      g.fillStyle = INK;
      g.font = font(500, 40);
      const hello = h < 5 || h >= 18 ? 'Good evening' : h < 12 ? 'Good morning' : 'Good afternoon';
      g.fillText(hello + ', ' + title(CONFIG.name), 120, 150);

      drawClock(g, now);
      g.textAlign = 'center';
      g.font = font(500, 28);
      g.fillStyle = GREY;
      g.fillText(DAY_NAMES[now.getDay()] + ' ' + now.getDate() + ' ' + MONTH_NAMES[now.getMonth()], CLOCK_X, CLOCK_Y + CLOCK_R + 62);
      if (weather) {
        g.fillStyle = INK;
        g.fillText(weather.temp + '°  ' + skyWords(weather), CLOCK_X, CLOCK_Y + CLOCK_R + 100);
      }

      // What the needle is on.
      const list = rows(), row = list[sel];
      g.textAlign = 'left';
      let top = 250;
      if (row.connect) {
        const qr = phoneQr(260);
        g.drawImage(qr, INFO_X, 200);
        top = 200 + qr.height - 150;
      } else g.drawImage(ICONS.tile(row.app, 150), INFO_X, top);
      g.fillStyle = INK;
      g.font = font(600, 76);
      g.fillText(row.folder ? 'Games' : title(row.app.name), INFO_X, top + 250, CLOCK_X - CLOCK_R - INFO_X - 40);
      g.fillStyle = GREY;
      g.font = font(500, 30);
      g.fillText(about(row) + '  ·  ' + (88 + sel * 1.6).toFixed(1) + ' FM', INFO_X, top + 302);

      // The scale, slid so the picked station sits under the needle.
      g.save();
      ICONS.rounded(g, SCALE_X, SCALE_Y, SCALE_W, SCALE_H, 14);
      g.fillStyle = FACE;
      g.fill();
      g.clip();
      const mid = W / 2;
      for (let i = -1; i <= list.length; i++) {
        for (let k = 0; k < 5; k++) {
          const x = mid + (i - scrollPos + k / 5) * STEP;
          if (x < SCALE_X - 10 || x > SCALE_X + SCALE_W + 10) continue;
          const major = k === 0 && i >= 0 && i < list.length;
          g.fillStyle = major ? INK : '#b9b4aa';
          g.fillRect(x - (major ? 2 : 1), SCALE_Y + 18, major ? 4 : 2, major ? 46 : 22);
        }
      }
      g.textAlign = 'center';
      list.forEach((r, i) => {
        const x = mid + (i - scrollPos) * STEP;
        if (x < SCALE_X - STEP || x > SCALE_X + SCALE_W + STEP) return;
        g.fillStyle = GREY;
        g.font = font(500, 20);
        g.fillText((88 + i * 1.6).toFixed(1), x, SCALE_Y + 92);
        g.fillStyle = i === sel ? INK : GREY;
        g.font = font(i === sel ? 600 : 500, 28);
        g.fillText(r.folder ? 'Games' : title(r.app.short), x, SCALE_Y + 140, STEP - 20);
      });
      // The scale fades out at both ends, like the window of a real dial.
      [[SCALE_X, 1], [SCALE_X + SCALE_W, -1]].forEach(([x, d]) => {
        const fade = g.createLinearGradient(x, 0, x + d * 220, 0);
        fade.addColorStop(0, FACE);
        fade.addColorStop(1, 'rgba(246,245,241,0)');
        g.fillStyle = fade;
        g.fillRect(Math.min(x, x + d * 220), SCALE_Y, 220, SCALE_H);
      });
      g.restore();
      ICONS.rounded(g, SCALE_X + 0.5, SCALE_Y + 0.5, SCALE_W - 1, SCALE_H - 1, 14);
      g.strokeStyle = '#c8c3b9';
      g.lineWidth = 2;
      g.stroke();
      g.save();
      g.shadowColor = 'rgba(238,106,31,0.55)';
      g.shadowBlur = 14;
      // Down to the ticks, so the station names under it stay readable.
      g.fillStyle = focus === 'list' ? ORANGE : '#c9a48c';
      g.fillRect(mid - 3, SCALE_Y - 16, 6, 92);
      g.restore();

      knob(g, W - 360, 975, 40, 0.6);
      knob(g, W - 200, 975, 56, scrollPos * 0.7);
      g.textAlign = 'left';
      Music.draw(g, focus === 'music');
    }

    return { axis: 'h', draw };
  })();

  // ---- Panorama: words too big for the screen --------------------------------
  // After the Zune HD and Windows Phone: the section names run off the edge and slide
  // past as you go left and right; the lists are plain words.

  const panorama = (() => {
    const LIST_X = 110, LIST_Y = 500, ROW_H = 96, SHOWN = 5;
    let cat = 0, strip = 0, catAt = 0, items = {}, glowAt = 0, glowKey = '';

    function draw(g) {
      const m = menu();
      cat = Math.min(cat, m.length - 1);
      const c = m[cat], i = Math.min(items[c.key] || 0, c.items.length - 1), it = c.items[i];
      const now = new Date();

      g.fillStyle = '#060608';
      g.fillRect(0, 0, W, H);
      // A glow in the colour of whatever's picked, rising in as it changes.
      const key = it.app.key;
      if (key !== glowKey) {
        glowKey = key;
        glowAt = clock;
      }
      const glow = g.createRadialGradient(W * 0.8, H * 0.7, 0, W * 0.8, H * 0.7, 950);
      const [r, gr, b] = hexRgb(it.app.color === '#F4F6F8' ? '#5b6cff' : it.app.color);
      const a = 0.42 * Math.min(1, (clock - glowAt) * 2.5);
      glow.addColorStop(0, 'rgba(' + r + ',' + gr + ',' + b + ',' + a + ')');
      glow.addColorStop(1, 'rgba(' + r + ',' + gr + ',' + b + ',0)');
      g.fillStyle = glow;
      g.fillRect(0, 0, W, H);

      g.textBaseline = 'alphabetic';
      g.textAlign = 'left';
      g.fillStyle = '#ffffff';
      g.font = font(700, 22);
      g.globalAlpha = 0.7;
      g.fillText('B O N I T O', 112, 92);
      g.globalAlpha = 1;
      g.textAlign = 'right';
      g.font = font(300, 46);
      g.fillText(timeText(now), W - 110, 100);
      g.font = font(400, 24);
      g.globalAlpha = 0.65;
      g.fillText(DAY_NAMES[now.getDay()] + ' ' + now.getDate() + ' ' + MONTH_NAMES[now.getMonth()] + (weather ? '   ' + weather.temp + '° ' + skyWords(weather).toLowerCase() : ''), W - 110, 140);
      g.globalAlpha = 1;

      // The section names in one long strip, the picked one at the left edge.
      g.textAlign = 'left';
      g.font = font(200, 250);
      const starts = [];
      let x = 0;
      m.forEach(s => {
        starts.push(x);
        x += g.measureText(s.name.toLowerCase()).width + 110;
      });
      strip += (starts[cat] - strip) * 0.14;
      m.forEach((s, j) => {
        g.globalAlpha = j === cat ? 1 : 0.22;
        g.fillText(s.name.toLowerCase(), 96 + starts[j] - strip, 380);
      });
      g.globalAlpha = 1;

      // The list slides in from the right when the section changes.
      const t = Math.min(1, (clock - catAt) * 3.5), ease = 1 - Math.pow(1 - t, 3);
      const top = Math.max(0, Math.min(i - 2, c.items.length - SHOWN));
      g.save();
      g.translate((1 - ease) * 140, 0);
      g.globalAlpha = ease;
      c.items.slice(top, top + SHOWN).forEach((row, j) => {
        const on = top + j === i && focus === 'list', y = LIST_Y + j * ROW_H;
        g.fillStyle = on ? '#ffffff' : 'rgba(255,255,255,0.42)';
        g.font = font(on ? 400 : 300, 64);
        g.fillText(row.connect ? 'connect phone' : row.settings ? 'settings' : title(row.app.name).toLowerCase(), LIST_X, y);
      });
      g.restore();

      // The picked app's tile, or the phone code.
      if (it.connect) {
        const qr = phoneQr(340);
        g.drawImage(qr, W - 150 - qr.width, 470);
      } else if (!it.settings) {
        g.save();
        g.shadowColor = 'rgba(0,0,0,0.5)';
        g.shadowBlur = 50;
        g.shadowOffsetY = 20;
        g.drawImage(ICONS.tile(it.app, 300), W - 450, 470);
        g.restore();
      }

      Music.draw(g, focus === 'music');
    }

    function key(k) {
      if (focus !== 'list') return false;
      const m = menu(), c = m[cat], i = Math.min(items[c.key] || 0, c.items.length - 1);
      if (k === 'left' || k === 'right') {
        const next = Math.max(0, Math.min(m.length - 1, cat + (k === 'left' ? -1 : 1)));
        if (next !== cat) catAt = clock;
        cat = next;
      } else if (k === 'up') items[c.key] = Math.max(0, i - 1);
      else if (k === 'down' && i === c.items.length - 1) { if (Music.enabled()) focus = 'music'; }
      else if (k === 'down') items[c.key] = i + 1;
      else if (k === 'ok') activate(c.items[i]);
      else return false;
      return true;
    }

    return { draw, key };
  })();

  // ---- Media bar: categories across, items down, on a moving wave -----------
  // After the game console menus of the late 2000s.

  const mediabar = (() => {
    const CAT_X = 400, CAT_Y = 210, CAT_GAP = 250, ITEM_Y = 420, ITEM_H = 108;
    const isApp = r => !r.folder && !r.child && !r.connect && !r.settings;
    let cat = 0, catPos = 0;
    const item = {}, itemPos = {};

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

  const LAYOUTS = { bonito, horizon, dial, panorama, mediabar };
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
