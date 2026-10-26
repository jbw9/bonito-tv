// Background music from Spotify, started at boot so it keeps playing across home, games
// and settings, with now playing and controls. The speaker button switches between the
// launcher's own player (the TV's speakers) and the Echo Dot. Premium only; log in
// once with ./spotify-login.py.
const Music = (() => {
  const API = 'https://api.spotify.com/v1';
  const LOGO = 44;
  const BUTTONS = ['prev', 'toggle', 'next', 'speaker'];
  // Remote media keys, registered with the TV so they reach the launcher.
  const MEDIA = { 10252: 'toggle', 415: 'toggle', 19: 'toggle', 10233: 'next', 10232: 'prev' };
  let token = null, expires = 0;
  let track = null, playing = false, status = '', heldByHide = false;
  let progress = 0, duration = 0, polledAt = 0;
  let btn = 1, logo = null;

  const img = new Image();
  img.onload = () => {
    // The circle fills the image's width; the extra height is transparent margin.
    const top = (img.naturalHeight - img.naturalWidth) / 2;
    const big = makeCanvas(LOGO * 4, LOGO * 4, b => {
      b.imageSmoothingQuality = 'high';
      b.drawImage(img, 0, top, img.naturalWidth, img.naturalWidth, 0, 0, LOGO * 4, LOGO * 4);
    });
    logo = makeCanvas(LOGO, LOGO, b => {
      b.imageSmoothingQuality = 'high';
      b.drawImage(big, 0, 0, LOGO, LOGO);
    });
  };
  img.src = 'img/logos/spotify.png';

  function fail(err) {
    status = 'SPOTIFY: ' + (err && err.message);
    console.error('music', err && err.message);
  }

  // PKCE logins may return a new refresh token on a refresh, and the old one may stop
  // working, so the latest is kept on the TV. It's tied to the config token it came
  // from, so logging in again with ./spotify-login.py takes over.
  function refresh() {
    const saved = Platform.load('spotify-refresh', null);
    const rt = saved && saved.from === CONFIG.spotifyRefreshToken ? saved.token : CONFIG.spotifyRefreshToken;
    return fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(rt) + '&client_id=' + encodeURIComponent(CONFIG.spotifyClientId),
    })
      .then(r => r.json())
      .then(d => {
        if (!d.access_token) throw new Error(d.error_description || d.error || 'login failed');
        token = d.access_token;
        expires = Date.now() + (d.expires_in - 60) * 1000;
        if (d.refresh_token) Platform.save('spotify-refresh', { from: CONFIG.spotifyRefreshToken, token: d.refresh_token });
        return token;
      });
  }

  function getToken() {
    return token && Date.now() < expires ? Promise.resolve(token) : refresh();
  }

  // App-only token (client credentials) so the jam page can search the catalogue
  // directly. It carries no access to the account, so it's safe on guests' phones; the
  // client secret itself stays on the TV.
  function catalogToken() {
    return fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + btoa(CONFIG.spotifyClientId + ':' + CONFIG.spotifyClientSecret),
      },
      body: 'grant_type=client_credentials',
    })
      .then(r => r.json())
      .then(d => {
        if (!d.access_token) throw new Error(d.error_description || d.error || 'catalogue login failed');
        return { token: d.access_token, expires: Date.now() + (d.expires_in - 60) * 1000 };
      });
  }

  function api(method, path, body) {
    return getToken()
      .then(t => fetch(API + path, {
        method,
        headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
        body: body && JSON.stringify(body),
      }))
      .then(r => {
        if (r.status === 200 && method === 'GET') return r.json();
        if (r.ok) return null;
        return r.json().catch(() => ({})).then(d => {
          throw new Error((d.error && d.error.message) || 'HTTP ' + r.status);
        });
      });
  }

  // Accepts a share link or a URI for a playlist or album.
  function contextUri() {
    const m = /(playlist|album)[/:]([A-Za-z0-9]+)/.exec(CONFIG.spotifyPlaylist || '');
    return m && 'spotify:' + m[1] + ':' + m[2];
  }

  // Starts music on a speaker: the configured playlist on shuffle, or else whatever the
  // account last played.
  function play(id) {
    const uri = contextUri();
    const go = uri
      ? api('PUT', '/me/player/play?device_id=' + id, { context_uri: uri })
        .then(() => api('PUT', '/me/player/shuffle?state=true&device_id=' + id))
      : api('PUT', '/me/player', { device_ids: [id], play: true });
    return go.then(() => setTimeout(poll, 600));
  }

  function poll() {
    if (document.hidden) return;
    api('GET', '/me/player').then(p => {
      const t = p && p.item;
      track = t && { name: t.name, artist: t.artists[0].name };
      playing = !!(p && p.is_playing);
      progress = (p && p.progress_ms) || 0;
      duration = (t && t.duration_ms) || 0;
      polledAt = Date.now();
      if (track) status = '';
    }).catch(fail);
  }

  // Without AbortSignal.timeout (older TVs' browsers), Spotify's player hands fetch its
  // own stand-in signal, which fetch rejects. Its licence request then never goes out
  // and every song stops after its unencrypted first ~10 seconds. The TV lets the
  // launcher reach into the player's frame, so fetch there drops the stand-in.
  function fixFetch(w) {
    const f = w.fetch;
    w.fetch = function (url, opts) {
      if (opts && opts.signal && !(opts.signal instanceof w.AbortSignal)) {
        opts = Object.assign({}, opts);
        delete opts.signal;
      }
      return f.call(w, url, opts);
    };
  }

  // The launcher's own player (Web Playback SDK), so the TV's speakers play while
  // the launcher is on screen.
  let tvId = null;
  function startPlayer() {
    window.onSpotifyWebPlaybackSDKReady = () => {
      const frame = document.querySelector('iframe[src*="sdk.scdn.co"]');
      if (frame) fixFetch(frame.contentWindow);
      const player = new Spotify.Player({
        name: 'TV',
        getOAuthToken: cb => getToken().then(cb, fail),
        volume: 0.5,
      });
      player.addListener('ready', e => {
        tvId = e.device_id;
        if (speaker() === 'tv') play(tvId).catch(fail);
      });
      player.addListener('player_state_changed', poll);
      ['initialization_error', 'authentication_error', 'account_error'].forEach(name => {
        player.addListener(name, e => fail(new Error(name.split('_')[0] + ' ' + e.message)));
      });
      player.connect();
    };
    const s = document.createElement('script');
    s.src = 'https://sdk.scdn.co/spotify-player.js';
    s.onerror = () => fail(new Error('could not load player'));
    document.head.appendChild(s);
  }

  function playOnEcho() {
    return api('GET', '/me/player/devices').then(d => {
      const dev = d.devices.find(x => x.type === 'Speaker');
      if (!dev) throw new Error('ECHO DOT NOT FOUND');
      return play(dev.id);
    });
  }

  function speaker() {
    return Platform.load('spotify-speaker', 'tv');
  }

  // Switches between the TV and the Echo Dot, remembered for next boot.
  function switchSpeaker() {
    const to = speaker() === 'tv' ? 'echo' : 'tv';
    Platform.save('spotify-speaker', to);
    if (to === 'echo') playOnEcho().catch(fail);
    else if (tvId) play(tvId).catch(fail);
    else fail(new Error('TV PLAYER NOT READY'));
  }

  // Controls go through the Web API, so they work whichever speaker is playing.
  function control(method, path, optimistic) {
    if (optimistic) optimistic();
    api(method, path).then(() => setTimeout(poll, 600), fail);
  }
  const actions = {
    prev: () => control('POST', '/me/player/previous'),
    toggle: () => control('PUT', playing ? '/me/player/pause' : '/me/player/play', () => { playing = !playing; }),
    next: () => control('POST', '/me/player/next'),
    speaker: switchSpeaker,
  };

  function onKey(e) {
    if (MEDIA[e.keyCode]) actions[MEDIA[e.keyCode]]();
  }

  // Opening Netflix etc. pauses the music; coming back resumes it.
  function onVisibility() {
    if (document.hidden && playing) {
      heldByHide = true;
      actions.toggle();
    } else if (!document.hidden && heldByHide) {
      heldByHide = false;
      actions.toggle();
    }
  }

  function enabled() {
    return !!(CONFIG.spotifyClientId && CONFIG.spotifyRefreshToken);
  }

  function start() {
    if (!enabled()) return;
    // Music starts on the last-picked speaker; the TV waits for its player to be ready.
    startPlayer();
    if (speaker() === 'echo') playOnEcho().catch(fail);
    if (Platform.isTV) {
      try {
        tizen.tvinputdevice.registerKeyBatch(['MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaTrackNext', 'MediaTrackPrevious']);
      } catch (e) {}
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    setInterval(poll, 5000);
  }

  // The home screen's controls row: back, play/pause, next, speaker. Returns false for
  // keys that leave the row.
  function key(k) {
    if (k === 'left' && btn > 0) btn--;
    else if (k === 'right' && btn < BUTTONS.length - 1) btn++;
    else if (k === 'ok') actions[BUTTONS[btn]]();
    else return false;
    return true;
  }

  function drawButton(g, kind, cx, cy, on) {
    if (on) {
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(cx, cy, 26, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = on ? '#ffffff' : '#7d838c';
    g.beginPath();
    if (kind === 'pause') {
      g.rect(cx - 8, cy - 10, 6, 20);
      g.rect(cx + 2, cy - 10, 6, 20);
    } else if (kind === 'speaker') {
      g.rect(cx - 11, cy - 5, 6, 10);
      g.moveTo(cx - 5, cy - 5);
      g.lineTo(cx + 3, cy - 11);
      g.lineTo(cx + 3, cy + 11);
      g.lineTo(cx - 5, cy + 5);
      g.fill();
      g.strokeStyle = g.fillStyle;
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(cx + 4, cy, 8, -0.8, 0.8);
      g.stroke();
      return;
    } else if (kind === 'play') {
      g.moveTo(cx - 6, cy - 11);
      g.lineTo(cx + 10, cy);
      g.lineTo(cx - 6, cy + 11);
    } else {
      const d = kind === 'next' ? 1 : -1;
      g.rect(cx + d * 8 - 2, cy - 10, 4, 20);
      g.moveTo(cx - d * 8, cy - 10);
      g.lineTo(cx + d * 6, cy);
      g.lineTo(cx - d * 8, cy + 10);
    }
    g.fill();
  }

  // The font has no accents, so they're dropped rather than shown as blanks.
  function clean(str) {
    str = str.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return str.length > 30 ? str.slice(0, 28).trim() + '..' : str;
  }

  // Glowing ring around the logo for how far through the song it is. Between polls
  // the position is counted forward locally so the ring moves smoothly.
  function drawRing(g, cx, cy) {
    const r = LOGO / 2 + 7;
    g.save();
    g.lineWidth = 4;
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.stroke();
    if (duration) {
      const at = Math.min(duration, progress + (playing ? Date.now() - polledAt : 0));
      g.lineCap = 'round';
      g.strokeStyle = '#1DB954';
      g.shadowColor = '#1DB954';
      g.shadowBlur = 14;
      g.globalAlpha = playing ? 1 : 0.5;
      g.beginPath();
      g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (at / duration) * Math.PI * 2);
      g.stroke();
    }
    g.restore();
  }

  // Bottom-left corner: the logo with its progress ring and what's playing (or what's
  // wrong). The home screen passes `focused` to add the controls row.
  function draw(g, focused) {
    if (!enabled()) return;
    const cy = H - 64;
    let x = 64 + LOGO / 2 + 24;
    if (logo) {
      g.globalAlpha = playing ? 1 : 0.5;
      g.drawImage(logo, 64 - LOGO / 2, cy - LOGO / 2);
      g.globalAlpha = 1;
    }
    drawRing(g, 64, cy);
    if (focused != null) {
      ['prev', playing ? 'pause' : 'play', 'next', 'speaker'].forEach((kind, i) => drawButton(g, kind, x + 26 + i * 64, cy, focused && i === btn));
      x += BUTTONS.length * 64 + 20;
    }
    let text = track ? clean(track.name + ' - ' + track.artist) : status;
    if (track && focused != null) text += '   ON ' + (speaker() === 'tv' ? 'TV' : 'ECHO DOT');
    const cell = 3.5;
    if (text) drawText(g, text, x, cy - 3.5 * cell, cell, playing ? '#d3d7dd' : '#7d838c', { style: 'thin' });
  }

  return { start, draw, key, enabled, api, catalogToken };
})();
