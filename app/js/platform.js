// Everything that differs between the Samsung TV (Tizen) and a desktop browser preview.
const Platform = (() => {
  const isTV = typeof window.tizen !== 'undefined' && !!window.tizen.application;
  const installed = {}; // catalog key -> Tizen app id
  const hdmiSources = {}; // HDMI port number -> connected video source
  let scanned = false;

  function scanApps() {
    return new Promise(resolve => {
      if (!isTV) return resolve();
      try {
        tizen.application.getAppsInfo(list => {
          list.forEach(info => {
            const name = String(info.name || '').trim().toLowerCase();
            CATALOG.forEach(app => {
              if (app.appId ? info.id === app.appId : app.match && !installed[app.key] && app.match.test(name)) installed[app.key] = info.id;
            });
          });
          scanned = true;
          resolve();
        }, () => resolve());
      } catch (e) {
        resolve();
      }
    });
  }

  let watching = false;
  function setInputs(info) {
    Object.keys(hdmiSources).forEach(n => { delete hdmiSources[n]; });
    info.connected.forEach(src => {
      if (src.type === 'HDMI') hdmiSources[src.number] = src;
    });
  }

  function scanInputs() {
    if (!isTV) return;
    try {
      tizen.systeminfo.getPropertyValue('VIDEOSOURCE', setInputs, err => console.error('VIDEOSOURCE failed', err && err.message));
      // Plugging a device in while the launcher is open updates the list straight away.
      if (!watching) {
        tizen.systeminfo.addPropertyValueChangeListener('VIDEOSOURCE', setInputs);
        watching = true;
      }
    } catch (e) {}
  }

  function isAvailable(app) {
    if (app.game) return true;
    if (app.hdmi) return isTV ? !!hdmiSources[app.hdmi] : app.hdmi <= 2;
    return !isTV || !scanned || !!installed[app.key];
  }

  // Shows an HDMI input full-screen on top of the launcher.
  function showInput(app) {
    return new Promise(resolve => {
      if (!isTV) return resolve('input');
      try {
        tizen.tvwindow.setSource(hdmiSources[app.hdmi], () => {
          tizen.tvwindow.show(() => resolve('input'), err => {
            console.error('tvwindow.show failed', err && err.message);
            resolve('error');
          }, ['0px', '0px', '1920px', '1080px'], 'MAIN');
        }, err => {
          console.error('setSource failed', err && err.message);
          resolve('error');
        });
      } catch (e) {
        resolve('error');
      }
    });
  }

  function hideInput() {
    if (!isTV) return;
    try {
      tizen.tvwindow.hide(() => {}, () => {}, 'MAIN');
    } catch (e) {}
  }

  // Resolves 'ok', 'input' (HDMI now showing), 'preview' (desktop browser) or 'error'.
  function launch(app) {
    if (app.hdmi) return showInput(app);
    return new Promise(resolve => {
      if (!isTV) {
        console.log('[preview] would launch', app.name);
        return resolve('preview');
      }
      const id = installed[app.key] || app.appId || app.fallbackId;
      try {
        tizen.application.launch(id, () => resolve('ok'), err => {
          console.error('launch failed', id, err && err.message);
          resolve('error');
        });
      } catch (e) {
        resolve('error');
      }
    });
  }

  // TV volume, changed by 'up', 'down' or 'mute' (which flips it). Returns
  // { level, muted }, or null off the TV.
  function volume(change) {
    if (!isTV) return null;
    try {
      const a = tizen.tvaudiocontrol;
      if (change === 'mute') a.setMute(!a.isMute());
      else if (change === 'up') a.setVolumeUp();
      else if (change === 'down') a.setVolumeDown();
      return { level: a.getVolume(), muted: a.isMute() };
    } catch (e) {
      return null;
    }
  }

  function exit() {
    if (isTV) tizen.application.getCurrentApplication().exit();
  }

  // Remote keys on Tizen; keyboard equivalents for the desktop preview.
  const KEYS = { 37: 'left', 38: 'up', 39: 'right', 40: 'down', 13: 'ok', 32: 'ok', 10009: 'back', 8: 'back', 27: 'back' };
  function keyName(e) {
    return KEYS[e.keyCode] || null;
  }

  function load(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  function getJSON(url) {
    return fetch(url).then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  let place = null;
  async function locate() {
    if (CONFIG.city) {
      const g = await getJSON('https://geocoding-api.open-meteo.com/v1/search?count=1&name=' + encodeURIComponent(CONFIG.city));
      if (g.results && g.results.length) return { lat: g.results[0].latitude, lon: g.results[0].longitude };
    }
    const ip = await getJSON('https://ipapi.co/json/');
    return { lat: ip.latitude, lon: ip.longitude };
  }

  async function weather() {
    if (!place) place = await locate();
    const unit = CONFIG.units === 'celsius' ? 'celsius' : 'fahrenheit';
    const w = await getJSON('https://api.open-meteo.com/v1/forecast?latitude=' + place.lat + '&longitude=' + place.lon +
      '&current=temperature_2m,weather_code,is_day&temperature_unit=' + unit);
    return { temp: Math.round(w.current.temperature_2m), code: w.current.weather_code, day: !!w.current.is_day };
  }

  return { isTV, scanApps, scanInputs, isAvailable, launch, hideInput, volume, exit, keyName, load, save, weather };
})();
