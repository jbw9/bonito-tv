// App and game icons: a rounded tile in the app's own colours with its logo as is, or
// for games and the launcher's own rows a small pixel picture. Used by every design.
const ICONS = (() => {
  // Pixel pictures. Letters are palette colours, '.' is empty.
  const P = {
    k: '#111317', w: '#ffffff', y: '#f8d838', o: '#f08030', r: '#e8433b', g: '#3fbf5f', b: '#3d8bff',
    c: '#4fe3ff', p: '#ff5fb0', s: '#9aa1ab', d: '#585e68', l: '#d9dde3', n: '#6aaa64', e: '#c9b458', f: '#0f5132',
  };
  const ART = {
    flappy: ['.....kkkk...', '...kkyywwk..', '..kyyywwkwk.', '.kkkkyywwwk.', 'kwwwwkyyyyk.', 'kwwwwkyykkkk', '.kkkyyykrrrk', '.koooykkrrk.', '..kooooykk..', '...kkkkk....'],
    dino: ['......ssssss', '.....ss.ssss', '.....sssssss', '.....sssss..', 's...sssss...', 's..ssssssss.', 'ss.sssss.s..', 'ssssssss....', '.ssssss.....', '..ss.ss.....', '..s...s.....', '..ss..ss....'],
    stack: ['....rrrr....', '............', '...oooooo...', '............', '..yyyyyyyy..', '............', '.gggggggggg.', '............', 'bbbbbbbbbbbb'],
    blackjack: ['wwwwwwww....', 'wkwwwwww....', 'wwwwkwww....', 'wwwkkkwwwwww', 'wwkkkkkwwrww', 'wwkkkkkwrrrw', 'wwwwkwwwrrrw', 'wwwkkkwwwrww', 'wwwwwwwwwwww', '....wwwwwwrw', '....wwwwwwww'],
    roulette: ['....kkkk....', '..kkrrkkrk..', '.krkkrrkkrk.', '.kkrrkkrrkk.', 'krrkkwwkkrrk', 'kkkrrwwrrkkk', 'krrkkwwkkrrk', '.kkrrkkrrkk.', '.krkkggkkrk.', '..kkrrkkrk..', '....kkkk....'],
    wordle: ['nnn.eee.ddd.', 'nnn.eee.ddd.', 'nnn.eee.ddd.', '............', 'ddd.nnn.eee.', 'ddd.nnn.eee.', 'ddd.nnn.eee.', '............', 'nnn.nnn.nnn.', 'nnn.nnn.nnn.', 'nnn.nnn.nnn.'],
    trivia: ['...wwwwww...', '..ww....ww..', '..ww....ww..', '........ww..', '.......ww...', '......ww....', '.....ww.....', '.....ww.....', '............', '.....ww.....', '.....ww.....'],
    ttt: ['c..c.s.....', '.cc..s.ppp.', '.cc..s.p.p.', 'c..c.s.ppp.', 'sssssssssss', '.ppp.s.c..c', '.p.p.s..cc.', '.ppp.s..cc.', 'sssssssssss', 'c..c.s.ppp.', '.cc..s.p.p.'],
    hockey: ['....rrrr....', '...rrrrrr...', '...rrwwrr...', '...rrrrrr...', '....rrrr....', '............', '............', '.....kk.....', '....kkkk....', '.....kk.....'],
    pong: ['w...........', 'w...........', 'w.....ww...w', 'w.....ww...w', 'w...........', 'w...........', '...........w', '...........w', '...........w'],
    cycles: ['cccccccc....', '.......c....', '.......c....', '.......cccc.', '..........c.', 'oooo......c.', '...o......c.', '...o......c.', '...ooooooo..'],
    games: ['..kkkkkkkk..', '.kssssssssk.', 'kssskssssrsk', 'ksskkkssbsgk', 'kssskssssysk', 'kssssssssssk', 'ksskkssskksk', '.kk..kkk..kk'],
    settings: ['....ww.ww...', '..w.wwwww.w.', '.wwwwwwwwww.', '..www..www..', 'www......www', '.ww......ww.', 'www......www', '..www..www..', '.wwwwwwwwww.', '..w.wwwww.w.', '....ww.ww...'],
    connect: ['..kkkkkkkk..', '..kwwwwwwk..', '..kwgggwwk..', '..kwgwgwwk..', '..kwgggwwk..', '..kwwwwwwk..', '..kwwwwwwk..', '..kwwwwwwk..', '..kkkkkkkk..', '..kkkwwkkk..', '..kkkkkkkk..'],
    hdmi: ['.wwwwwwwwww.', 'w..........w', 'w.wwwwwwww.w', 'w.wwwwwwww.w', '.w........w.', '..wwwwwwww..', '............', '....ssss....', '....ssss....', '....ssss....'],
    tv: ['wwwwwwwwwwww', 'w..........w', 'w..........w', 'w..........w', 'w..........w', 'w..........w', 'wwwwwwwwwwww', '.....ww.....', '...wwwwww...'],
    music: ['.....wwwwww.', '.....w....w.', '.....w....w.', '.....w....w.', '.....w....w.', '.....w..www.', '..www..wwww.', '.wwww..www..', '.www........'],
  };
  // Tile colours, picked so each logo shows as it is.
  const TILE = {
    youtube: '#ffffff', netflix: '#000000', hulu: '#0b0c0f', disney: '#0d1b4f', prime: '#1a98ff', max: '#ffffff',
    peacock: '#000000', appletv: '#1c1c1e', paramount: '#ffffff', spotify: '#000000', popeyes: '#fff6ec',
    flappy: '#4ec0ca', dino: '#f4f4f4', stack: '#1d1f3b', blackjack: '#0f5132', roulette: '#0f5132', wordle: '#121213',
    trivia: '#4b2a8c', ttt: '#1b1d23', hockey: '#e8f1ff', pong: '#000000', cycles: '#05070d',
    games: '#2b2f38', settings: '#474b54', connect: '#1DB954', hdmi: '#2b2f38', music: '#1DB954',
  };
  // Logos come as wide wordmarks; these fill the tile edge to edge instead.
  const FULL = { prime: true };

  const logos = {};
  function loadLogo(key) {
    const img = new Image();
    img.onload = () => { logos[key] = img; cache.clear(); };
    img.src = 'img/logos/' + key + '.png';
  }
  ['youtube', 'netflix', 'hulu', 'disney', 'prime', 'max', 'peacock', 'appletv', 'paramount', 'spotify', 'popeyes'].concat((CONFIG.apps || []).map(a => a.key)).forEach(loadLogo);

  function rounded(b, x, y, w, h, r) {
    b.beginPath();
    b.moveTo(x + r, y);
    b.arcTo(x + w, y, x + w, y + h, r);
    b.arcTo(x + w, y + h, x, y + h, r);
    b.arcTo(x, y + h, x, y, r);
    b.arcTo(x, y, x + w, y, r);
    b.closePath();
  }

  // Shrinks in halving steps so a big logo stays sharp at tile size.
  function fit(img, w, h) {
    const s = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const tw = Math.max(1, Math.round(img.naturalWidth * s)), th = Math.max(1, Math.round(img.naturalHeight * s));
    let src = img, sw = img.naturalWidth, sh = img.naturalHeight;
    while (sw / 2 > tw) {
      const half = makeCanvas(Math.round(sw / 2), Math.round(sh / 2), b => {
        b.imageSmoothingQuality = 'high';
        b.drawImage(src, 0, 0, Math.round(sw / 2), Math.round(sh / 2));
      });
      src = half;
      sw = half.width;
      sh = half.height;
    }
    return makeCanvas(tw, th, b => {
      b.imageSmoothingQuality = 'high';
      b.drawImage(src, 0, 0, tw, th);
    });
  }

  function pixels(b, art, x, y, size) {
    const n = Math.max(art.length, art[0].length), px = Math.floor(size / n);
    const ox = x + Math.round((size - px * art[0].length) / 2), oy = y + Math.round((size - px * art.length) / 2);
    art.forEach((row, j) => row.split('').forEach((ch, i) => {
      if (ch === '.') return;
      b.fillStyle = P[ch];
      b.fillRect(ox + i * px, oy + j * px, px, px);
    }));
  }

  // The app's art: its key, or for HDMI inputs the shared plug.
  function artKey(app) {
    return app.hdmi ? 'hdmi' : app.key;
  }

  function tileColor(app) {
    return TILE[artKey(app)] || app.color || '#2b2f38';
  }

  const cache = new Map();
  // A square tile `size` wide with rounded corners.
  function tile(app, size) {
    const key = app.key + '|' + size;
    let c = cache.get(key);
    if (c) return c;
    const r = Math.round(size * 0.22);
    c = makeCanvas(size, size, b => {
      b.save();
      rounded(b, 0, 0, size, size, r);
      b.clip();
      b.fillStyle = tileColor(app);
      b.fillRect(0, 0, size, size);
      const logo = logos[app.key], art = ART[artKey(app)];
      if (logo && FULL[app.key]) b.drawImage(fit(logo, size, size), 0, 0);
      else if (logo) {
        const f = fit(logo, size * 0.72, size * 0.5);
        b.drawImage(f, Math.round((size - f.width) / 2), Math.round((size - f.height) / 2));
      } else if (art) pixels(b, art, size * 0.2, size * 0.2, size * 0.6);
      else {
        // No logo or picture: the name, in the system font, on the app's colour.
        b.fillStyle = isLight(tileColor(app)) ? '#111317' : '#ffffff';
        b.textAlign = 'center';
        b.textBaseline = 'middle';
        const words = app.short.split(' ');
        const fs = Math.round(size * (words.length > 1 ? 0.17 : Math.min(0.24, 1.3 / app.short.length)));
        b.font = '800 ' + fs + 'px "Helvetica Neue", Arial, sans-serif';
        words.forEach((w, i) => b.fillText(w, size / 2, size / 2 + (i - (words.length - 1) / 2) * fs * 1.1));
      }
      // A faint inner edge so dark tiles still read on dark screens.
      b.restore();
      rounded(b, 0.75, 0.75, size - 1.5, size - 1.5, r);
      b.strokeStyle = 'rgba(255,255,255,0.12)';
      b.lineWidth = 1.5;
      b.stroke();
    });
    if (cache.size > 300) cache.clear();
    cache.set(key, c);
    return c;
  }

  // Just the picture, in one colour, for the media bar's category icons.
  function glyph(key, size, color) {
    const ck = 'g|' + key + '|' + size + '|' + color;
    let c = cache.get(ck);
    if (c) return c;
    const art = ART[key];
    c = makeCanvas(size, size, b => {
      if (!art) return;
      const n = Math.max(art.length, art[0].length), px = Math.floor(size / n);
      const ox = Math.round((size - px * art[0].length) / 2), oy = Math.round((size - px * art.length) / 2);
      b.fillStyle = color;
      art.forEach((row, j) => row.split('').forEach((ch, i) => { if (ch !== '.' && ch !== 'k') b.fillRect(ox + i * px, oy + j * px, px, px); }));
    });
    cache.set(ck, c);
    return c;
  }

  return { tile, glyph, rounded };
})();
