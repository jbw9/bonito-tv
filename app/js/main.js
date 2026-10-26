const W = 1920, H = 1080;
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
let clock = 0; // seconds since boot, drives idle animations

const settings = Object.assign(
  { speed: 'normal', lightbar: true, clock: '12h', apps: {} },
  // New key so TVs that saved the old app list pick up the new defaults.
  Platform.load('launcher', {})
);
CATALOG.forEach(a => {
  if (!(a.key in settings.apps)) settings.apps[a.key] = DEFAULT_ON.indexOf(a.key) >= 0;
});

function saveSettings() {
  Platform.save('launcher', settings);
}

let lastKey = 0; // performance.now() of the last press, for the screensaver

// Presses from the remote and from phones (js/remote.js) both come through here.
function pressKey(k, repeat, fromPhone) {
  lastKey = performance.now();
  App.current.key(k, repeat, fromPhone);
}

function releaseKey(k) {
  if (App.current.keyUp) App.current.keyUp(k);
}

function playableApps() {
  const enabled = CATALOG.filter(a => settings.apps[a.key]);
  const ready = enabled.filter(a => Platform.isAvailable(a));
  if (ready.length) return ready;
  return enabled.length ? enabled : CATALOG.slice(0, 1);
}

const App = {
  screens: {},
  current: null,
  go(name, arg) {
    if (this.current && this.current.leave) this.current.leave();
    this.current = this.screens[name];
    this.current.enter(arg);
  },
  home() {
    Platform.scanInputs();
    this.go('home');
  },
};

// ---- shared scenery -------------------------------------------------------

function makeCanvas(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d'));
  return c;
}

const backdrops = {};
function drawBackground(g, top, edge) {
  const key = top + edge;
  if (!backdrops[key]) {
    backdrops[key] = makeCanvas(W, H, b => {
      const grad = b.createRadialGradient(W / 2, H * 0.45, 100, W / 2, H / 2, W * 0.7);
      grad.addColorStop(0, top);
      grad.addColorStop(1, edge);
      b.fillStyle = grad;
      b.fillRect(0, 0, W, H);
    });
  }
  g.drawImage(backdrops[key], 0, 0);
}

// Rainbow dot-matrix light bar along the top edge. One hue period spans the
// screen width, so scrolling a double-width strip loops seamlessly.
const LIGHTBAR_H = 40;
const lightbar = makeCanvas(W * 2, LIGHTBAR_H + 16, b => {
  const step = 8;
  for (let x = 0; x < W * 2; x += step) {
    const hue = (x / W) * 360;
    b.fillStyle = 'hsl(' + hue + ',100%,60%)';
    for (let row = 0; row < 4; row++) {
      b.beginPath();
      b.arc(x + 4, 6 + row * 9, 2.7, 0, Math.PI * 2);
      b.fill();
    }
    const glow = b.createLinearGradient(0, LIGHTBAR_H - 2, 0, LIGHTBAR_H + 16);
    glow.addColorStop(0, 'hsla(' + hue + ',100%,55%,0.35)');
    glow.addColorStop(1, 'hsla(' + hue + ',100%,55%,0)');
    b.fillStyle = glow;
    b.fillRect(x, LIGHTBAR_H - 2, step, 18);
  }
});

function drawLightBar(g) {
  if (!settings.lightbar) return;
  g.fillStyle = '#07080a';
  g.fillRect(0, 0, W, LIGHTBAR_H);
  const off = (clock * 90) % W;
  g.drawImage(lightbar, -off, 0);
}

function drawGround(g, y, scroll) {
  g.fillStyle = 'rgba(255,255,255,0.32)';
  for (let x = -(scroll % 26); x < W; x += 26) g.fillRect(x, y, 11, 3);
}

function drawBullet(g, x, y, color) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, 7, 0, Math.PI * 2);
  g.fill();
}

// ---- "OPENING <APP>" splash, then hand off to the real app ----------------

App.screens.splash = (() => {
  const HOLD = 1.6;
  let app, t, launched, status;

  const screen = {
    get launched() { return launched; },
    enter(arg) {
      app = arg.app;
      t = 0;
      launched = false;
      status = 'OPENING';
    },
    update(dt) {
      t += dt;
      if (launched || t < HOLD) return;
      launched = true;
      Platform.launch(app).then(result => {
        if (result === 'ok') return;
        if (result === 'input') return App.go('input', app);
        status = result === 'preview' ? 'PREVIEW - NOT ON TV' : 'COULD NOT OPEN';
        setTimeout(() => { if (App.current === screen) App.home(); }, 1800);
      });
    },
    draw(g) {
      g.fillStyle = app.color;
      g.fillRect(0, 0, W, H);
      const ink = isLight(app.color) ? 'rgba(10,12,14,0.82)' : '#ffffff';
      const cell = Math.min(24, 1500 / (app.name.length * 6));
      const a = Math.min(1, t * 4);
      drawText(g, app.name, W / 2, 400, cell, ink, { align: 'center', alpha: a });
      drawText(g, status, W / 2, 400 + cell * 7 + 50, 4, ink, { style: 'thin', align: 'center', alpha: a * 0.85 });
    },
    key(k) {
      if (k === 'back') App.home();
    },
  };
  return screen;
})();

// ---- HDMI input, shown full-screen over the launcher until Back -----------

App.screens.input = (() => {
  let app;
  return {
    enter(arg) {
      app = arg;
    },
    update() {},
    draw(g) {
      // On the TV the HDMI picture covers the canvas; this only shows in the preview.
      g.fillStyle = '#000';
      g.fillRect(0, 0, W, H);
      if (Platform.isTV) return;
      drawText(g, app.name, W / 2, 440, 14, '#ffffff', { align: 'center' });
      drawText(g, 'PREVIEW - BACK TO RETURN', W / 2, 600, 4, '#7d838c', { style: 'thin', align: 'center' });
    },
    key(k) {
      if (k !== 'back') return;
      Platform.hideInput();
      App.home();
    },
  };
})();

// ---- boot -----------------------------------------------------------------

function resize() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = W * s + 'px';
  canvas.style.height = H * s + 'px';
}

function boot() {
  resize();
  window.addEventListener('resize', resize);

  // Screensaver: the Popeyes menu board after 10 minutes without a key press.
  lastKey = performance.now();
  document.addEventListener('keydown', e => {
    lastKey = performance.now();
    const k = Platform.keyName(e);
    if (!k) return;
    e.preventDefault();
    pressKey(k, e.repeat);
  });
  document.addEventListener('keyup', e => {
    const k = Platform.keyName(e);
    if (k) releaseKey(k);
  });

  // Coming back from Netflix etc. lands on a fresh launcher, not the splash.
  document.addEventListener('visibilitychange', () => {
    lastKey = performance.now();
    if (!document.hidden && App.current === App.screens.splash && App.screens.splash.launched) App.home();
  });

  Platform.scanApps();
  App.home();
  Music.start();
  Jam.start();
  Phones.start();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    // Not over an HDMI input, which would stay up after Back, or YouTube, whose key
    // presses never reach the launcher.
    const busy = [App.screens.popeyes, App.screens.splash, App.screens.input, App.screens.youtube].indexOf(App.current) >= 0;
    if (now - lastKey > 10 * 60e3 && !busy) App.go('popeyes');
    App.current.update(dt);
    App.current.draw(ctx);
    // Home draws it itself, with the controls row.
    // The Popeyes menu board stays clear of overlays.
    const bare = App.current === App.screens.splash || App.current === App.screens.popeyes;
    if (!bare && App.current !== App.screens.home) Music.draw(ctx);
    if (!bare) Jam.draw(ctx);
    Phones.draw(ctx);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

window.addEventListener('load', boot);
