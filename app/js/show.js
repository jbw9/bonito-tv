// The website's gallery (index.html) plays the games by themselves: app/?show=<game>,
// then postMessage({ show: <game> }) to change channel. Pretend phones take seats and
// play through the same calls real phones make (js/remote.js): the party games' own CPU
// steers them, Wordle Race bots type their guesses, and solo games run on autopilot.
// Several times a second the page gets what each phone would be showing, to draw
// beside the TV.
const Show = (() => {
  const on = Platform.param('show') != null;
  const SEATS = { wordle: 3, trivia: 3, hockey: 2, pong: 4, cycles: 4, ttt: 2 };
  const SOLO = ['flappy', 'dino', 'stack'];
  const NAMES = ['JOHN', 'GISELLE', 'PRIYA', 'MARCO', 'AMARA', 'KENJI', 'SOFIA', 'THEO', 'NADIA', 'OMAR', 'LUCIA', 'FINN', 'ROSA', 'DEV'];
  const OPENERS = ['CRANE', 'SLATE', 'TRACE', 'STARE', 'RAISE', 'ADIEU'];
  const CODE = { correct: 'c', present: 'p', absent: 'a' };

  // typing: each Wordle Race bot's own phone, { words, word, draft, next }, as the TV
  // only knows their colours.
  let game, t = 0, wait = 0, seen, since = 0, held = null, names = [], ids = 0, rounds = 0, typing = {}, round, sent = 0;

  function shuffled(list) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function tap(k) {
    pressKey(k, false);
    releaseKey(k);
  }

  // Keeps `k` held down (null for none), like a thumb on the pad.
  function hold(k) {
    if (k === held) return;
    if (held) releaseKey(held);
    if (k) pressKey(k, false);
    held = k;
  }

  // A word that fits every colour the bot has seen so far, as the CPU picks them.
  function fits(words, rows) {
    const out = [];
    for (let i = 0; i < WORDLE_ANSWERS.length; i += 5) {
      const w = WORDLE_ANSWERS.substr(i, 5);
      if (words.every((g, r) => wordleMarks(w, g).map(m => CODE[m]).join('') === rows[r])) out.push(w);
    }
    return out[Math.floor(Math.random() * out.length)];
  }

  // One letter at a time, then Enter, then a think before the next word.
  function race(s, st) {
    if (st.round !== round) {
      round = st.round;
      typing = {};
    }
    st.players.forEach(p => {
      const b = typing[p.id] || (typing[p.id] = { words: [], word: null, draft: '', next: t + Math.random() * 1.5 });
      if (p.solved || p.gaveUp || p.rows.length === 6 || t < b.next) return;
      if (!b.word) b.word = b.words.length ? fits(b.words, p.rows) : OPENERS[Math.floor(Math.random() * OPENERS.length)];
      if (b.draft.length < 5) {
        b.draft += b.word[b.draft.length];
        b.next = t + 0.12 + Math.random() * 0.16;
        return;
      }
      s.phone('guess', { id: p.id, word: b.word });
      b.words.push(b.word);
      b.word = null;
      b.draft = '';
      b.next = t + 1.6 + Math.random() * 2.6;
    });
  }

  // Seats fill one by one, as friends scanning the code would, then the first one starts.
  function party(s) {
    const st = s.phoneState();
    if (st.mode === 'pick') {
      if (t > wait) s.phone('pick', { mode: 'race' });
    } else if (st.mode === 'lobby') {
      if (t < wait) return;
      const n = st.players.length;
      if (!n) names = shuffled(NAMES);
      if (n < SEATS[game]) {
        // Race bots are typed for here; the rest the game's CPU steers.
        s.phone('join', { id: 'bot' + ++ids, name: names[n], bot: game !== 'wordle' });
        wait = t + (rounds ? 0.12 : 0.45);
      } else {
        s.phone('start', { id: st.players[0].id });
        rounds++;
      }
    } else if (game === 'wordle' && st.mode === 'play') race(s, st);
  }

  function post() {
    if (window.parent === window) return;
    const s = App.current;
    window.parent.postMessage({ show: { game, held, state: s.phoneState ? s.phoneState() : null, typing } }, '*');
  }

  function start(key) {
    if (!SEATS[key] && SOLO.indexOf(key) < 0) key = 'wordle';
    hold(null);
    game = key;
    wait = t + 1;
    rounds = 0;
    typing = {};
    round = null;
    App.go(key, { play: true });
  }

  function update(dt) {
    t += dt;
    lastKey = performance.now(); // never the screensaver
    const s = App.current;
    if (s !== seen) {
      seen = s;
      since = t;
    }
    // Game over: a moment on the score, then PLAY AGAIN (the default) without a name.
    if (s === App.screens.entry) {
      if (t - since > 1.8) tap('ok');
    } else if (s.auto) hold(s.auto());
    else if (SEATS[game]) party(s);
    if (t - sent > 0.1) {
      sent = t;
      post();
    }
  }

  if (on) {
    window.addEventListener('message', e => {
      if (e.source === window.parent && e.data && typeof e.data.show === 'string') start(e.data.show);
    });
  }

  return { on, start: () => start(Platform.param('show')), update };
})();
