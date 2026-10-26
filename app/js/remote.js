// Phones as remotes and game controllers. jam/index.html's Remote and Games tabs talk
// to the TV over Supabase Realtime broadcast: a websocket, so a press lands in a tenth
// of a second, where the jam's request rows (polled every second) would feel laggy.
// Nothing is stored; the TV broadcasts what it's showing and phones send presses back.
const Phones = (() => {
  const TOPIC = 'realtime:tv-HOME'; // one TV, one fixed room, as in js/jam.js
  const KEYS = ['up', 'down', 'left', 'right', 'ok', 'back'];
  let ws = null, joined = false, ref = 0, sent = '', sentAt = 0, shownAt = 0, vol = null, volAt = -1e9;

  function enabled() {
    return !!(CONFIG.jamUrl && CONFIG.supabaseUrl);
  }

  // The jam page, opened on a tab: 'remote', 'spotify' or 'games'.
  function url(tab) {
    return CONFIG.jamUrl + (tab ? '#' + tab : '');
  }

  function raw(msg) {
    msg.ref = String(++ref);
    ws.send(JSON.stringify(msg));
  }

  function send(event, payload) {
    if (joined) raw({ topic: TOPIC, event: 'broadcast', payload: { type: 'broadcast', event, payload } });
  }

  function connect() {
    ws = new WebSocket(CONFIG.supabaseUrl.replace(/^http/, 'ws') + '/realtime/v1/websocket?vsn=1.0.0&apikey=' + encodeURIComponent(CONFIG.supabaseKey));
    ws.onopen = () => raw({ topic: TOPIC, event: 'phx_join', payload: { config: { broadcast: { self: false }, presence: { key: '' }, private: false } } });
    ws.onmessage = m => {
      const msg = JSON.parse(m.data);
      if (msg.event === 'phx_reply' && msg.topic === TOPIC && msg.payload.status === 'ok') {
        joined = true;
        sent = '';
      } else if (msg.event === 'broadcast') receive(msg.payload.event, msg.payload.payload || {});
    };
    ws.onclose = () => {
      ws = null;
      joined = false;
      setTimeout(connect, 3000);
    };
  }

  function leaveInput() {
    if (App.current === App.screens.input) Platform.hideInput();
  }

  function receive(event, p) {
    // Phones address the app they last heard from (Heartive has its own link), and
    // presses queued up while the launcher was hidden behind another app are dropped.
    if (p.app && p.app !== 'launcher') return;
    if (event !== 'hello' && (document.hidden || performance.now() - shownAt < 1000)) return;
    if (event === 'hello') sent = '';
    else if (event === 'key' && KEYS.indexOf(p.k) >= 0) {
      if (p.down === false) releaseKey(p.k);
      else pressKey(p.k, !!p.repeat, true);
    } else if (event === 'open') {
      if (!playableApps().some(a => a.game && a.key === p.game)) return;
      leaveInput();
      lastKey = performance.now();
      App.go(p.game);
    } else if (event === 'type') {
      lastKey = performance.now();
      if (!App.current.type) return;
      for (let i = 0; i < (p.back | 0); i++) App.current.type('\b');
      String(p.text || '').split('').forEach(ch => App.current.type(ch));
      if (p.enter) App.current.type('\n');
    } else if (event === 'volume') {
      vol = Platform.volume(p.change);
      volAt = performance.now();
    } else if (event === 'home') {
      leaveInput();
      lastKey = performance.now();
      App.home();
    } else if (App.current.phone) App.current.phone(event, p);
  }

  // What phones need to draw their tabs: the screen, the games to pick from, and the
  // open game's own state (players, round). Sent on change, and every 20s so phones
  // can tell the TV is on.
  function publish() {
    const state = {
      app: 'launcher',
      volume: Platform.volume(),
      screen: Object.keys(App.screens).find(n => App.screens[n] === App.current),
      games: playableApps().filter(a => a.group === 'games').map(a => ({ key: a.key, name: a.name, multi: a.multi || false, keyboard: !!a.keyboard })),
      game: App.current.phoneState ? App.current.phoneState() : null,
    };
    const json = JSON.stringify(state);
    if (json === sent && Date.now() - sentAt < 20000) return;
    sent = json;
    sentAt = Date.now();
    send('state', state);
  }

  function start() {
    if (!enabled()) return;
    connect();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      shownAt = performance.now();
      sent = ''; // phones learn straight away that the launcher is back in front
    });
    setInterval(publish, 250);
    // Realtime drops sockets that go quiet for a minute.
    setInterval(() => { if (ws && ws.readyState === 1) raw({ topic: 'phoenix', event: 'heartbeat', payload: {} }); }, 25000);
  }

  // The volume for a moment after a phone changes it, as the TV shows no bar of its own.
  function draw(g) {
    if (!vol || performance.now() - volAt > 2000) return;
    const x = W / 2 - 260, y = 70;
    g.fillStyle = 'rgba(10,12,14,0.85)';
    roundRectPath(g, x, y, 520, 76, 38);
    g.fill();
    drawText(g, vol.muted ? 'MUTED' : 'VOLUME ' + vol.level, x + 40, y + 38 - 3.5 * 4, 4, '#ffffff', { style: 'thin' });
    g.fillStyle = 'rgba(255,255,255,0.2)';
    g.fillRect(x + 260, y + 34, 220, 8);
    g.fillStyle = vol.muted ? '#7d838c' : '#ffffff';
    g.fillRect(x + 260, y + 34, 220 * Math.min(100, vol.level) / 100, 8);
  }

  return { start, enabled, url, draw };
})();
