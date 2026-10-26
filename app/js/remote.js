// Phones as remotes and game controllers. jam/index.html's Remote and Games tabs talk
// to the TV over Supabase Realtime broadcast: a websocket, so a press lands in a tenth
// of a second, where the jam's request rows (polled every second) would feel laggy.
// Nothing is stored; the TV broadcasts what it's showing and phones send presses back.
const Phones = (() => {
  const TOPIC = 'realtime:tv-HOME'; // one TV, one fixed room, as in js/jam.js
  const KEYS = ['up', 'down', 'left', 'right', 'ok', 'back'];
  let ws = null, joined = false, ref = 0, sent = '', sentAt = 0;

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
    if (event === 'hello') sent = '';
    else if (event === 'key' && KEYS.indexOf(p.k) >= 0) {
      if (p.down === false) releaseKey(p.k);
      else pressKey(p.k, !!p.repeat, true);
    } else if (event === 'open') {
      if (!playableApps().some(a => a.game && a.key === p.game)) return;
      leaveInput();
      lastKey = performance.now();
      App.go(p.game);
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
      screen: Object.keys(App.screens).find(n => App.screens[n] === App.current),
      games: playableApps().filter(a => a.group === 'games').map(a => ({ key: a.key, name: a.name, multi: !!a.multi })),
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
    setInterval(publish, 250);
    // Realtime drops sockets that go quiet for a minute.
    setInterval(() => { if (ws && ws.readyState === 1) raw({ topic: 'phoenix', event: 'heartbeat', payload: {} }); }, 25000);
  }

  return { start, enabled, url };
})();
