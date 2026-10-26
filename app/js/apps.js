// Streaming apps the launcher knows about. `match` is tested against the app
// name the TV reports; `fallbackId` is only used if the TV won't list its apps.
const CATALOG = [
  // Plays inside the launcher with ads stripped (js/youtube.js), not in the TV's YouTube app.
  { key: 'youtube', name: 'YOUTUBE', short: 'YOUTUBE', color: '#FF2A1F', game: true },
  { key: 'netflix', name: 'NETFLIX', short: 'NETFLIX', color: '#E50914', match: /^netflix/, fallbackId: '3201907018807' },
  { key: 'hulu', name: 'HULU', short: 'HULU', color: '#1CE783', match: /^hulu/, fallbackId: '3201601007625' },
  { key: 'disney', name: 'DISNEY+', short: 'DISNEY+', color: '#3D7BFF', match: /disney/, fallbackId: '3201901017640' },
  { key: 'prime', name: 'PRIME VIDEO', short: 'PRIME', color: '#38C6F4', match: /prime video|amazon prime/, fallbackId: '3201910019365' },
  { key: 'max', name: 'MAX', short: 'MAX', color: '#2D5BFF', match: /^(hbo )?max$/, fallbackId: '3202301029760' },
  { key: 'peacock', name: 'PEACOCK', short: 'PEACOCK', color: '#FFD60A', match: /peacock/, fallbackId: '3202006020991' },
  { key: 'appletv', name: 'APPLE TV', short: 'APPLE TV', color: '#B8BEC6', match: /^apple tv/, fallbackId: '3201807016597' },
  { key: 'paramount', name: 'PARAMOUNT+', short: 'PARAMOUNT+', color: '#0064FF', match: /paramount/, fallbackId: '3201710014981' },
  { key: 'crunchyroll', name: 'CRUNCHYROLL', short: 'CRUNCHYROLL', color: '#F47521', match: /crunchyroll/ },
  { key: 'plex', name: 'PLEX', short: 'PLEX', color: '#E5A00D', match: /^plex/ },
  { key: 'tubi', name: 'TUBI', short: 'TUBI', color: '#7408FF', match: /^tubi/ },
  { key: 'twitch', name: 'TWITCH', short: 'TWITCH', color: '#9146FF', match: /^twitch/ },
  { key: 'espn', name: 'ESPN', short: 'ESPN', color: '#D50A0A', match: /^espn/ },
  { key: 'spotify', name: 'SPOTIFY', short: 'SPOTIFY', color: '#1DB954', match: /^spotify/, fallbackId: '3201606009684' },
  // Not apps: plain screens. `key` is the screen; `group: 'games'` puts it in the home screen's GAMES folder.
  { key: 'flappy', name: 'FLAPPY BIRD', short: 'FLAPPY', color: '#F4F6F8', game: true, group: 'games' },
  { key: 'dino', name: 'DINO RUN', short: 'DINO', color: '#F4F6F8', game: true, group: 'games' },
  { key: 'stack', name: 'STACK', short: 'STACK', color: '#F4F6F8', game: true, group: 'games' },
  { key: 'blackjack', name: 'BLACKJACK', short: 'BLACKJACK', color: '#F4F6F8', game: true, group: 'games' },
  { key: 'roulette', name: 'ROULETTE', short: 'ROULETTE', color: '#F4F6F8', game: true, group: 'games' },
  // `keyboard`: phones show a box for typing into it. Wordle is solo or a party game.
  { key: 'wordle', name: 'WORDLE', short: 'WORDLE', color: '#F4F6F8', game: true, group: 'games', keyboard: true, multi: 'wordle' },
  // `multi`: a party game for phones, played with an arrow 'pad', a 'touch' pad, the
  // 'board' to tap, 'choice' buttons, or a 'wordle' guess box.
  { key: 'trivia', name: 'TRIVIA', short: 'TRIVIA', color: '#F4F6F8', game: true, group: 'games', multi: 'choice' },
  { key: 'ttt', name: 'TIC TAC TOE', short: 'TIC TAC TOE', color: '#F4F6F8', game: true, group: 'games', multi: 'board' },
  { key: 'hockey', name: 'AIR HOCKEY', short: 'HOCKEY', color: '#F4F6F8', game: true, group: 'games', multi: 'touch' },
  { key: 'pong', name: 'PONG', short: 'PONG', color: '#F4F6F8', game: true, group: 'games', multi: 'touch' },
  { key: 'cycles', name: 'LIGHT CYCLES', short: 'CYCLES', color: '#F4F6F8', game: true, group: 'games', multi: 'pad' },
  { key: 'popeyes', name: 'POPEYES MENU', short: 'POPEYES', color: '#F26A1B', game: true },
  // HDMI inputs only appear while something is plugged into that port.
  { key: 'hdmi1', name: 'HDMI 1', short: 'HDMI 1', color: '#FF7A1A', hdmi: 1 },
  { key: 'hdmi2', name: 'HDMI 2', short: 'HDMI 2', color: '#FF7A1A', hdmi: 2 },
  { key: 'hdmi3', name: 'HDMI 3', short: 'HDMI 3', color: '#FF7A1A', hdmi: 3 },
  { key: 'hdmi4', name: 'HDMI 4', short: 'HDMI 4', color: '#FF7A1A', hdmi: 4 },
];

const DEFAULT_ON = ['youtube', 'netflix', 'hulu', 'disney', 'prime', 'max', 'peacock', 'appletv', 'paramount', 'crunchyroll', 'plex', 'tubi', 'twitch', 'espn', 'flappy', 'dino', 'stack', 'blackjack', 'roulette', 'wordle', 'trivia', 'ttt', 'hockey', 'pong', 'cycles', 'popeyes', 'hdmi1', 'hdmi2', 'hdmi3', 'hdmi4'];

// Your own apps from config.local.js, first and on by default:
//   apps: [{ key: 'myapp', name: 'MY APP', short: 'MY APP', color: '#FF7575', appId: 'Abc1234567.MyApp' }]
// A logo at img/logos/<key>.png shows when one is selected.
CATALOG.unshift(...(CONFIG.apps || []));
(CONFIG.apps || []).forEach(a => DEFAULT_ON.push(a.key));
