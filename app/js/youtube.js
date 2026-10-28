// YouTube inside the launcher, with ads stripped, instead of the TV's own YouTube app.
// The TV lets the launcher fetch YouTube's TV site (youtube.com/tv) despite CORS, so
// its page is written into a frame of our own. The frame shares the launcher's origin,
// which lets the ad blocker run before YouTube's code and lets Back on YouTube's home
// come back here.
App.screens.youtube = (() => {
  const APP = CATALOG.find(a => a.key === 'youtube');
  let frame = null, status = '';

  // Runs inside the frame before YouTube's own scripts.
  function inFrame() {
    // uBlock Origin's json-prune rules for YouTube: drop the ad fields from every
    // response before the player sees them, plus ad tiles in feeds and Shorts.
    const AD_KEYS = ['adPlacements', 'adSlots', 'playerAds'];
    let removed = 0;
    function isAd(x) {
      const reel = x && x.command && x.command.reelWatchEndpoint;
      return !!(x && (x.adSlotRenderer || (reel && reel.adClientParams && reel.adClientParams.isAd)));
    }
    function prune(o) {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) {
        for (let i = o.length - 1; i >= 0; i--) {
          if (isAd(o[i])) removed += o.splice(i, 1).length;
          else prune(o[i]);
        }
        return;
      }
      for (const k in o) {
        if (AD_KEYS.indexOf(k) >= 0) removed += delete o[k];
        else prune(o[k]);
      }
    }
    // Ads are removed out of sight, so a corner notice shows the blocker at work.
    let notice = null, hideAt = 0;
    function clean(r) {
      removed = 0;
      prune(r);
      if (!removed || !document.body) return r;
      if (!notice) {
        notice = document.createElement('div');
        notice.style.cssText = 'position:fixed;top:40px;right:48px;z-index:99999;padding:12px 24px;border-radius:30px;' +
          'background:#FF2A1F;color:#fff;font:bold 26px sans-serif;letter-spacing:2px;transition:opacity .4s';
        notice.textContent = 'AD BLOCKED';
        document.body.appendChild(notice);
      }
      notice.style.opacity = 1;
      hideAt = Date.now() + 3000;
      setTimeout(() => { if (Date.now() >= hideAt) notice.style.opacity = 0; }, 3000);
      return r;
    }
    const parse = JSON.parse;
    JSON.parse = function () {
      return clean(parse.apply(this, arguments));
    };
    const json = Response.prototype.json;
    Response.prototype.json = function () {
      return json.call(this).then(clean);
    };

    // Back on YouTube's home hides the app; here it returns to the launcher instead.
    const leave = () => parent.postMessage('youtube:exit', '*');
    window.close = leave;
    if (window.tizen) {
      const current = tizen.application.getCurrentApplication;
      tizen.application.getCurrentApplication = function () {
        const a = current.call(tizen.application);
        a.exit = a.hide = leave;
        return a;
      };
    }
  }

  // YouTube shows a debug watermark when it isn't served from youtube.com.
  const HEAD = '<base href="https://www.youtube.com/tv">' +
    '<style>yt-debug-watermark{display:none!important}</style>' +
    '<script>(' + inFrame + ')()</script>';

  function open() {
    fetch('https://www.youtube.com/tv')
      .then(r => r.text())
      .then(html => {
        if (App.current !== screen) return;
        frame = document.createElement('iframe');
        frame.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;border:0;background:#000';
        document.body.appendChild(frame);
        const d = frame.contentDocument;
        d.open();
        d.write(html.replace(/<head[^>]*>/, m => m + HEAD));
        d.close();
        frame.focus();
        // Signing in ends by sending the page to youtube.com, which refuses to load in a frame
        // (ERR_BLOCKED_BY_RESPONSE), or by reloading it, which would load the launcher. Either
        // way the frame has left YouTube, so it opens again; the sign-in is already saved.
        const own = frame;
        own.addEventListener('load', () => {
          const doc = own.contentDocument;
          if (frame !== own || (doc && doc.querySelector('base[href="https://www.youtube.com/tv"]'))) return;
          own.remove();
          frame = null;
          open();
        });
      })
      .catch(err => {
        console.error('youtube', err && err.message);
        status = 'COULD NOT OPEN';
      });
  }

  // Phones (js/remote.js) can't reach the frame the way the remote does, so their
  // presses and typing are handed to YouTube as key events of its own.
  const CODES = {
    left: [37, 'ArrowLeft'], up: [38, 'ArrowUp'], right: [39, 'ArrowRight'], down: [40, 'ArrowDown'], ok: [13, 'Enter'],
    back: Platform.isTV ? [10009, 'XF86Back'] : [27, 'Escape'],
  };
  function toFrame(type, code, key) {
    const w = frame.contentWindow, d = frame.contentDocument;
    const e = new w.KeyboardEvent(type, { key, keyCode: code, which: code, charCode: type === 'keypress' ? code : 0, bubbles: true, cancelable: true });
    // Older browsers ignore keyCode in the constructor.
    if (e.keyCode !== code) ['keyCode', 'which'].forEach(name => Object.defineProperty(e, name, { get: () => code }));
    (d.activeElement || d.body).dispatchEvent(e);
  }

  window.addEventListener('message', e => {
    if (e.data === 'youtube:exit' && frame && e.source === frame.contentWindow) App.home();
  });

  const screen = {
    enter() {
      status = Platform.isTV ? 'OPENING' : 'PREVIEW - NOT ON TV';
      Music.hold(true);
      if (Platform.isTV) open();
    },
    leave() {
      if (frame) frame.remove();
      frame = null;
      Music.hold(false);
      window.focus();
    },
    update() {},
    draw(g) {
      g.fillStyle = APP.color;
      g.fillRect(0, 0, W, H);
      drawText(g, APP.name, W / 2, 400, 24, '#ffffff', { align: 'center' });
      drawText(g, status, W / 2, 618, 4, '#ffffff', { style: 'thin', align: 'center', alpha: 0.85 });
    },
    // From the remote only before YouTube has loaded (then it talks to the frame); from
    // phones always.
    key(k) {
      if (frame) toFrame('keydown', CODES[k][0], CODES[k][1]);
      else if (k === 'back') App.home();
    },
    keyUp(k) {
      if (frame) toFrame('keyup', CODES[k][0], CODES[k][1]);
    },
    // Phone typing, for YouTube's search: letters, '\b' to delete and '\n' to enter.
    type(ch) {
      if (!frame) return;
      const [code, key] = ch === '\b' ? [8, 'Backspace'] : ch === '\n' ? [13, 'Enter'] : [ch.toUpperCase().charCodeAt(0), ch];
      toFrame('keydown', code, key);
      if (ch.length === 1 && ch >= ' ') toFrame('keypress', ch.charCodeAt(0), key);
      toFrame('keyup', code, key);
    },
  };
  return screen;
})();
