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
    function isAd(x) {
      const reel = x && x.command && x.command.reelWatchEndpoint;
      return !!(x && (x.adSlotRenderer || (reel && reel.adClientParams && reel.adClientParams.isAd)));
    }
    function prune(o) {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) {
        for (let i = o.length - 1; i >= 0; i--) {
          if (isAd(o[i])) o.splice(i, 1);
          else prune(o[i]);
        }
        return;
      }
      for (const k in o) {
        if (AD_KEYS.indexOf(k) >= 0) delete o[k];
        else prune(o[k]);
      }
    }
    const parse = JSON.parse;
    JSON.parse = function () {
      const r = parse.apply(this, arguments);
      prune(r);
      return r;
    };
    const json = Response.prototype.json;
    Response.prototype.json = function () {
      return json.call(this).then(r => { prune(r); return r; });
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
      })
      .catch(err => {
        console.error('youtube', err && err.message);
        status = 'COULD NOT OPEN';
      });
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
    // Only reached before YouTube has loaded; after that the remote talks to the frame.
    key(k) {
      if (k === 'back') App.home();
    },
  };
  return screen;
})();
