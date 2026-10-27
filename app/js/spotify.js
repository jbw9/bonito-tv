// Spotify, full screen: the album cover, what's playing with its progress and controls, and
// what's up next. LYRICS turns it into karaoke: the song's words from LRCLIB (lrclib.net,
// free, no key), timed to the music with the current line lit. QUEUE lists what's coming,
// guests' picks first (js/jam.js). The SPOTIFY tile opens it
// when the launcher has its own Spotify login (js/music.js); otherwise it opens the app.
if (Music.enabled()) CATALOG.find(a => a.key === 'spotify').game = true;

App.screens.spotify = (() => {
  const BUTTONS = ['shuffle', 'prev', 'toggle', 'next', 'repeat', 'lyrics', 'queue', 'speaker'];
  const GREEN = '#1DB954';
  const SOFT = '#c3c8cf';
  const DIM = '#8a9099';
  const COVER = 600;
  const THUMB = 120;
  // Lyrics: one size for every line, rows wrapped to fit, and lit a little early so the
  // words are up before they're sung.
  const CELL = 8;
  const ROW = 7 * CELL + 22;
  const GAP = 36;
  const LEAD = 300;
  const LRCLIB = 'https://lrclib.net/api/';

  let btn = 2, view = null, now = Music.now(); // view: null (the cover), 'lyrics' or 'queue'
  let artUrl = null, cover = null, thumb = null, backdrop = null;
  const lyrics = new Map(); // track id -> { lines, note }
  let scroll = 0, scrolledFor = null;

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  // The cover with its shadow, a small copy for the lyrics header, and the backdrop: the
  // cover shrunk to a few pixels and stretched back up, a soft wash of its colours. Drawn
  // once per cover, since shadows and big scaled images are slow on a TV every frame.
  function loadArt(url) {
    if (url === artUrl) return;
    artUrl = url;
    cover = thumb = backdrop = null;
    if (!url) return;
    const img = new Image();
    img.onload = () => {
      if (artUrl !== url) return;
      const pad = 80;
      cover = makeCanvas(COVER + pad * 2, COVER + pad * 2, b => {
        b.shadowColor = 'rgba(0,0,0,0.6)';
        b.shadowBlur = 50;
        b.shadowOffsetY = 18;
        roundRect(b, pad, pad, COVER, COVER, 16);
        b.fillStyle = '#000';
        b.fill();
        b.shadowColor = 'transparent';
        b.clip();
        b.imageSmoothingQuality = 'high';
        b.drawImage(img, pad, pad, COVER, COVER);
      });
      cover.pad = pad;
      thumb = makeCanvas(THUMB, THUMB, b => {
        roundRect(b, 0, 0, THUMB, THUMB, 10);
        b.clip();
        b.imageSmoothingQuality = 'high';
        b.drawImage(img, 0, 0, THUMB, THUMB);
      });
      const tiny = makeCanvas(12, 12, b => b.drawImage(img, 0, 0, 12, 12));
      backdrop = makeCanvas(W, H, b => {
        b.imageSmoothingQuality = 'high';
        b.drawImage(tiny, -W * 0.1, -H * 0.1, W * 1.2, H * 1.2);
        b.fillStyle = 'rgba(8,10,12,0.64)';
        b.fillRect(0, 0, W, H);
      });
    };
    img.src = url;
  }

  // The dot font is capitals, digits and some punctuation, with no accents. Accented letters
  // lose their accents; other scripts are kept whole for the system font (js/font.js), since
  // stripping marks from them would break Korean syllables apart.
  function clean(s) {
    s = s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').toUpperCase();
    return Array.from(s, ch => {
      const plain = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
      return GLYPHS[plain] ? plain : ch < '\x80' ? '' : ch;
    }).join('').replace(/\s+/g, ' ').trim();
  }

  // Shrinks text to fit `width` down to `min`, then cuts it short.
  function fit(text, max, min, width) {
    text = clean(text);
    const cell = Math.max(min, Math.min(max, width / (textWidth(text, 1) + 1)));
    if (textWidth(text, cell) <= width) return { cell, text };
    const chars = Array.from(text);
    while (chars.length && textWidth(chars.join('').trim() + '..', cell) > width) chars.pop();
    return { cell, text: chars.join('').trim() + '..' };
  }

  function wrap(text, width) {
    const fits = s => textWidth(s, CELL) <= width;
    const rows = [];
    let row = '';
    text.split(' ').forEach(word => {
      const next = row ? row + ' ' + word : word;
      if (fits(next)) {
        row = next;
        return;
      }
      if (row) rows.push(row);
      row = '';
      // Chinese and Japanese have no spaces, so a word too long for a row breaks anywhere.
      Array.from(word).forEach(ch => {
        if (row && !fits(row + ch)) {
          rows.push(row);
          row = '';
        }
        row += ch;
      });
    });
    if (row) rows.push(row);
    return rows;
  }

  // "[01:23.45] words" lines in time order. Lines without words are the pauses between
  // verses, shown as dots so something is still lit.
  function parse(lrc) {
    const lines = [];
    lrc.split('\n').forEach(line => {
      const m = /^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/.exec(line.trim());
      if (m) lines.push({ at: (Number(m[1]) * 60 + Number(m[2])) * 1000, text: m[3] });
    });
    return place(lines.sort((a, b) => a.at - b.at));
  }

  // Words without times: spread over the song, so they still scroll along with it.
  function spread(plain, duration) {
    const lines = plain.split('\n').filter(l => l.trim());
    return place(lines.map((text, i) => ({ at: duration * i / lines.length, text })));
  }

  // Wrapped and stacked top to bottom.
  function place(lines) {
    lines.forEach(l => { l.rows = wrap(clean(l.text) || '. . .', W - 320); });
    let top = 0;
    lines.forEach(l => {
      l.top = top;
      l.h = l.rows.length * ROW;
      top += l.h + GAP;
    });
    return lines;
  }

  const query = params => Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&');

  // Not found is an answer; anything else (LRCLIB says 503 when it's busy) is an error.
  function json(r) {
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  // LRCLIB turns requests away when it's busy (429, 503), often several in a row, so a
  // search waits and asks again before giving up.
  function search(params, tries = 4) {
    return fetch(LRCLIB + 'search?' + query(params)).then(r => {
      if ((r.status === 429 || r.status === 503) && tries > 1) {
        return new Promise(done => setTimeout(done, (5 - tries) * 2000)).then(() => search(params, tries - 1));
      }
      return json(r);
    }).then(list => Array.isArray(list) ? list : []);
  }

  // An exact match needs the album and length to agree with LRCLIB's; failing that, the
  // first search hit with timed lyrics, by exact title and then loosely, then any words at all. The exact lookup also says
  // it's busy while it looks for a song LRCLIB doesn't have, so only the search decides.
  function fetchLyrics(t, duration) {
    if (lyrics.has(t.id)) return;
    const entry = { lines: null, timed: false, note: 'FINDING LYRICS' };
    lyrics.set(t.id, entry);
    fetch(LRCLIB + 'get?' + query({ track_name: t.name, artist_name: t.artist, album_name: t.album, duration: Math.round(duration / 1000) }))
      .then(json)
      .catch(() => null)
      .then(d => (d && (d.syncedLyrics || d.instrumental) ? d
        : search({ track_name: t.name, artist_name: t.artist })
          // LRCLIB often files "Song (feat. X)" and "Song - X Remix" under the plain title.
          .then(list => list.some(x => x.syncedLyrics) ? list
            : search({ q: t.name.replace(/\s*[([](feat|ft|with)\b[^)\]]*[)\]]/i, '').replace(/\s+-\s.*$/, '') + ' ' + t.artist })
              .then(more => list.concat(more)))
          .then(list => list.find(x => x.syncedLyrics) || (d && d.plainLyrics ? d : list.find(x => x.plainLyrics)) || {})))
      .then(d => {
        entry.timed = !!d.syncedLyrics;
        if (d.syncedLyrics) entry.lines = parse(d.syncedLyrics);
        else if (d.plainLyrics) entry.lines = spread(d.plainLyrics, duration);
        else entry.note = d.instrumental ? 'INSTRUMENTAL' : 'NO LYRICS FOR THIS SONG';
      })
      .catch(() => {
        entry.note = "COULDN'T GET THE LYRICS - TRYING AGAIN";
        setTimeout(() => { if (lyrics.get(t.id) === entry) lyrics.delete(t.id); }, 30e3);
      });
  }

  function lineAt(lines, at) {
    let i = -1;
    while (i + 1 < lines.length && lines[i + 1].at <= at) i++;
    return i;
  }

  const time = ms => {
    const s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  function drawProgress(g, x, y, w) {
    g.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(g, x, y, w, 8, 4);
    g.fill();
    if (now.duration) {
      g.fillStyle = GREEN;
      roundRect(g, x, y, Math.max(8, w * now.progress / now.duration), 8, 4);
      g.fill();
    }
    drawText(g, time(now.progress), x, y + 26, 3.5, DIM, { style: 'thin' });
    drawText(g, time(now.duration), x + w, y + 26, 3.5, DIM, { style: 'thin', align: 'right' });
  }

  function drawSymbol(g, kind, cx, cy, color) {
    g.fillStyle = color;
    g.beginPath();
    if (kind === 'pause') {
      g.rect(cx - 12, cy - 15, 9, 30);
      g.rect(cx + 3, cy - 15, 9, 30);
    } else if (kind === 'play') {
      g.moveTo(cx - 9, cy - 17);
      g.lineTo(cx + 15, cy);
      g.lineTo(cx - 9, cy + 17);
    } else if (kind === 'shuffle' || kind === 'repeat' || kind === 'repeat1') {
      g.strokeStyle = color;
      g.lineWidth = 3.5;
      g.lineCap = g.lineJoin = 'round';
      if (kind === 'shuffle') {
        // Two crossing paths, each ending in an arrow.
        g.moveTo(cx - 17, cy - 10);
        g.bezierCurveTo(cx - 2, cy - 10, cx + 2, cy + 10, cx + 13, cy + 10);
        g.moveTo(cx - 17, cy + 10);
        g.bezierCurveTo(cx - 2, cy + 10, cx + 2, cy - 10, cx + 13, cy - 10);
        g.stroke();
        arrow(g, cx + 18, cy - 10);
        arrow(g, cx + 18, cy + 10);
      } else {
        // A loop with an arrow on its top edge; repeat one adds a 1 in the middle.
        g.moveTo(cx + 4, cy - 11);
        g.lineTo(cx - 9, cy - 11);
        g.arcTo(cx - 17, cy - 11, cx - 17, cy - 3, 8);
        g.lineTo(cx - 17, cy + 3);
        g.arcTo(cx - 17, cy + 11, cx - 9, cy + 11, 8);
        g.lineTo(cx + 9, cy + 11);
        g.arcTo(cx + 17, cy + 11, cx + 17, cy + 3, 8);
        g.lineTo(cx + 17, cy - 3);
        g.arcTo(cx + 17, cy - 11, cx + 9, cy - 11, 8);
        g.stroke();
        arrow(g, cx + 10, cy - 11);
        if (kind === 'repeat1') {
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(cx - 3.5, cy - 3);
          g.lineTo(cx + 0.5, cy - 6);
          g.lineTo(cx + 0.5, cy + 6);
          g.stroke();
        }
      }
      return;
    } else {
      const d = kind === 'next' ? 1 : -1;
      g.rect(cx + d * 11 - 2.5, cy - 13, 5, 26);
      g.moveTo(cx - d * 11, cy - 13);
      g.lineTo(cx + d * 8, cy);
      g.lineTo(cx - d * 11, cy + 13);
    }
    g.fill();
  }

  // A small arrowhead pointing right, tip at x, y.
  function arrow(g, x, y) {
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x - 8, y - 6);
    g.lineTo(x - 8, y + 6);
    g.closePath();
    g.fill();
  }

  // The speaker pill names where the music is playing; OK moves it to the other one.
  const LABEL = { lyrics: () => 'LYRICS', queue: () => 'QUEUE', speaker: () => now.speaker === 'echo' ? 'ON ECHO' : 'ON TV' };
  const LIT = { shuffle: () => now.shuffle, repeat: () => now.repeat !== 'off', lyrics: () => view === 'lyrics', queue: () => view === 'queue' };
  const PILL = 3;

  // Each button's centre and width, from `x`.
  function layout(x) {
    return BUTTONS.map(b => {
      const w = b === 'toggle' ? 92 : b in LABEL ? textWidth(LABEL[b](), PILL) + 36 : 64;
      const at = { b, x: x + w / 2, w };
      x += w + 22;
      return at;
    });
  }
  const controlsWidth = () => layout(0).reduce((sum, c) => sum + c.w + 22, -22);

  function drawControls(g, x, cy) {
    layout(x).forEach(({ b, x: cx, w }, i) => {
      const on = i === btn;
      if (b === 'toggle') {
        g.fillStyle = on ? '#ffffff' : 'rgba(255,255,255,0.82)';
        g.beginPath();
        g.arc(cx, cy, 46, 0, Math.PI * 2);
        g.fill();
        if (on) {
          g.strokeStyle = 'rgba(255,255,255,0.35)';
          g.lineWidth = 3;
          g.beginPath();
          g.arc(cx, cy, 56, 0, Math.PI * 2);
          g.stroke();
        }
        drawSymbol(g, now.playing ? 'pause' : 'play', cx, cy, '#0b0d10');
      } else if (b in LABEL) {
        roundRect(g, cx - w / 2, cy - 26, w, 52, 26);
        g.fillStyle = on ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.06)';
        g.fill();
        if (on) {
          g.strokeStyle = 'rgba(255,255,255,0.6)';
          g.lineWidth = 2;
          g.stroke();
        }
        drawText(g, LABEL[b](), cx, cy - 3.5 * PILL, PILL, b in LIT && LIT[b]() ? GREEN : on ? '#ffffff' : SOFT, { align: 'center' });
      } else {
        if (on) {
          g.fillStyle = 'rgba(255,255,255,0.16)';
          g.beginPath();
          g.arc(cx, cy, 34, 0, Math.PI * 2);
          g.fill();
        }
        // Shuffle and repeat are green with a dot underneath while on, as in Spotify.
        const lit = b in LIT && LIT[b]();
        drawSymbol(g, b === 'repeat' && now.repeat === 'track' ? 'repeat1' : b, cx, cy, lit ? GREEN : on ? '#ffffff' : SOFT);
        if (lit) {
          g.fillStyle = GREEN;
          g.beginPath();
          g.arc(cx, cy + 25, 3, 0, Math.PI * 2);
          g.fill();
        }
      }
    });
  }

  function drawListening(g) {
    const t = now.track;
    const top = (H - COVER) / 2 - 10;
    if (cover) g.drawImage(cover, 170 - cover.pad, top - cover.pad);
    else {
      g.fillStyle = 'rgba(255,255,255,0.06)';
      roundRect(g, 170, top, COVER, COVER, 16);
      g.fill();
    }
    const x = 870, w = W - x - 140;
    drawText(g, now.speaker === 'echo' ? 'PLAYING ON ECHO DOT' : 'NOW PLAYING', x, top + 30, 3.5, GREEN, { style: 'thin' });
    const title = fit(t.name, 11, 6, w);
    drawText(g, title.text, x, top + 80, title.cell, '#ffffff');
    let y = top + 80 + 7 * title.cell + 34;
    const artist = fit(t.artists, 5.5, 4, w);
    drawText(g, artist.text, x, y, artist.cell, '#e6e8eb', { style: 'thin' });
    y += 7 * artist.cell + 22;
    const album = fit(t.album, 4, 3.5, w);
    drawText(g, album.text, x, y, album.cell, DIM, { style: 'thin' });
    drawProgress(g, x, top + 360, w);
    drawControls(g, x, top + 470);
    const next = Jam.upNext().slice(0, 2);
    if (!next.length) return;
    drawText(g, 'UP NEXT', x, top + 556, 3.5, GREEN, { style: 'thin' });
    next.forEach((n, i) => {
      const line = fit(n.name + ' - ' + n.artist, 4, 4, w);
      drawText(g, line.text, x, top + 594 + i * 40, line.cell, SOFT, { style: 'thin' });
    });
  }

  // Lyrics and the queue: the song small in the corner, the progress and controls below.
  function drawFrame(g) {
    const t = now.track;
    if (thumb) g.drawImage(thumb, 80, 70);
    const title = fit(t.name, 6, 4, W - 600);
    drawText(g, title.text, 80 + THUMB + 30, 88, title.cell, '#ffffff');
    const artist = fit(t.artists, 4, 3.5, W - 600);
    drawText(g, artist.text, 80 + THUMB + 30, 88 + 7 * title.cell + 20, artist.cell, SOFT, { style: 'thin' });
    drawProgress(g, 160, 900, W - 320);
    drawControls(g, (W - controlsWidth()) / 2, 1000);
  }

  // Queue covers, kept by address.
  const smallArt = new Map();
  function artFor(url) {
    if (!url) return null;
    let img = smallArt.get(url);
    if (!img) {
      if (smallArt.size > 60) smallArt.clear();
      img = new Image();
      img.src = url;
      smallArt.set(url, img);
    }
    return img.complete && img.naturalWidth ? img : null;
  }

  function drawQueue(g) {
    drawFrame(g);
    const list = Jam.upNext().slice(0, 6), x = 160, w = W - 320;
    drawText(g, 'UP NEXT', x, 250, 4, GREEN, { style: 'thin' });
    if (!list.length) return drawText(g, 'NOTHING QUEUED', x, 320, 5, SOFT, { style: 'thin' });
    list.forEach((n, i) => {
      const y = 306 + i * 92;
      const img = artFor(n.image);
      g.save();
      roundRect(g, x, y, 68, 68, 8);
      g.fillStyle = 'rgba(255,255,255,0.08)';
      g.fill();
      if (img) {
        g.clip();
        g.drawImage(img, x, y, 68, 68);
      }
      g.restore();
      const by = n.by ? 'ADDED BY ' + clean(n.by) : '';
      const room = w - 100 - (by ? textWidth(by, 3.5) + 40 : 0);
      const name = fit(n.name, 5, 4, room);
      drawText(g, name.text, x + 96, y + 4, name.cell, '#ffffff');
      const artist = fit(n.artist, 3.5, 3.5, room);
      drawText(g, artist.text, x + 96, y + 46, artist.cell, SOFT, { style: 'thin' });
      if (by) drawText(g, by, x + w, y + 22, 3.5, GREEN, { style: 'thin', align: 'right' });
    });
  }

  function drawKaraoke(g) {
    drawFrame(g);
    const entry = lyrics.get(now.track.id);
    if (!entry || !entry.lines) {
      drawText(g, entry ? entry.note : 'FINDING LYRICS', W / 2, 480, 6, SOFT, { align: 'center', style: 'thin' });
    } else {
      // Untimed words scroll along but none is lit, since which one is being sung isn't known.
      const i = entry.timed ? lineAt(entry.lines, now.progress + LEAD) : -2;
      if (!entry.timed) drawText(g, 'THESE LYRICS AREN\'T TIMED TO THE SONG', W - 80, 100, 3, DIM, { style: 'thin', align: 'right' });
      const mid = 500;
      g.save();
      g.beginPath();
      g.rect(0, 220, W, 640);
      g.clip();
      entry.lines.forEach((l, k) => {
        const y = mid - scroll + l.top;
        if (y + l.h < 200 || y > 880) return;
        // Lines fade the further they are from the middle of the screen.
        const fade = Math.max(0, 1 - Math.abs(y + l.h / 2 - mid) / 380);
        l.rows.forEach((row, r) => {
          drawText(g, row, W / 2, y + r * ROW, CELL, k === i ? '#ffffff' : SOFT, { align: 'center', alpha: k === i ? 1 : 0.12 + 0.5 * fade });
        });
      });
      g.restore();
    }
  }

  return {
    enter() {
      btn = 2;
      Music.poll();
    },
    update(dt) {
      now = Music.now();
      loadArt(now.track && now.track.image);
      if (view !== 'lyrics' || !now.track) return;
      fetchLyrics(now.track, now.duration);
      const entry = lyrics.get(now.track.id);
      if (!entry.lines) return;
      const i = lineAt(entry.lines, now.progress + LEAD);
      const target = i < 0 ? -ROW : entry.lines[i].top + (entry.lines[i].h - 22) / 2;
      // A new song starts in place; after that the words glide up line by line.
      if (scrolledFor !== now.track.id) {
        scrolledFor = now.track.id;
        scroll = target;
      }
      scroll += (target - scroll) * Math.min(1, dt * 6);
    },
    draw(g) {
      if (backdrop) g.drawImage(backdrop, 0, 0);
      else drawBackground(g, '#1d2026', '#08090b');
      if (!now.track) {
        drawText(g, 'NOTHING PLAYING', W / 2, 420, 9, '#ffffff', { align: 'center' });
        if (now.status) drawText(g, now.status, W / 2, 520, 4, SOFT, { align: 'center', style: 'thin' });
        drawControls(g, (W - controlsWidth()) / 2, 700);
      } else if (view === 'lyrics') drawKaraoke(g);
      else if (view === 'queue') drawQueue(g);
      else drawListening(g);
    },
    key(k) {
      if (k === 'back') return App.home();
      if (k === 'left' && btn > 0) btn--;
      else if (k === 'right' && btn < BUTTONS.length - 1) btn++;
      else if (k === 'ok' && (BUTTONS[btn] === 'lyrics' || BUTTONS[btn] === 'queue')) {
        view = view === BUTTONS[btn] ? null : BUTTONS[btn];
        scrolledFor = null;
      } else if (k === 'ok') Music.act(BUTTONS[btn]);
    },
  };
})();
