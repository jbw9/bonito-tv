// Streaming apps the launcher knows about. `match` is tested against the app
// name the TV reports; `fallbackId` is only used if the TV won't list its apps.
const CATALOG = [
  // HDMI inputs only appear while something is plugged into that port.
  { key: 'hdmi1', name: 'HDMI 1', short: 'HDMI 1', color: '#FF7A1A', hdmi: 1 },
  { key: 'hdmi2', name: 'HDMI 2', short: 'HDMI 2', color: '#FF7A1A', hdmi: 2 },
  { key: 'hdmi3', name: 'HDMI 3', short: 'HDMI 3', color: '#FF7A1A', hdmi: 3 },
  { key: 'hdmi4', name: 'HDMI 4', short: 'HDMI 4', color: '#FF7A1A', hdmi: 4 },
  // Heartive is deployed alongside the launcher (see deploy.sh), so its app id is known.
  { key: 'heartive', name: 'HEARTIVE', short: 'HEARTIVE', color: '#FF7575', appId: 'HrtvTV0001.Heartive' },
  { key: 'youtube', name: 'YOUTUBE', short: 'YOUTUBE', color: '#FF2A1F', match: /^youtube$/, fallbackId: '111299001912' },
  { key: 'netflix', name: 'NETFLIX', short: 'NETFLIX', color: '#E50914', match: /^netflix/, fallbackId: '3201907018807' },
  { key: 'hulu', name: 'HULU', short: 'HULU', color: '#1CE783', match: /^hulu/, fallbackId: '3201601007625' },
  { key: 'disney', name: 'DISNEY+', short: 'DISNEY+', color: '#3D7BFF', match: /disney/, fallbackId: '3201901017640' },
  { key: 'prime', name: 'PRIME VIDEO', short: 'PRIME', color: '#38C6F4', match: /prime video|amazon prime/, fallbackId: '3201910019365' },
  { key: 'max', name: 'MAX', short: 'MAX', color: '#2D5BFF', match: /^(hbo )?max$/, fallbackId: '3202301029760' },
  { key: 'peacock', name: 'PEACOCK', short: 'PEACOCK', color: '#FFD60A', match: /peacock/, fallbackId: '3202006020991' },
  { key: 'appletv', name: 'APPLE TV', short: 'APPLE TV', color: '#B8BEC6', match: /^apple tv/, fallbackId: '3201807016597' },
  { key: 'paramount', name: 'PARAMOUNT+', short: 'PARAMOUNT+', color: '#0064FF', match: /paramount/, fallbackId: '3201710014981' },
  { key: 'spotify', name: 'SPOTIFY', short: 'SPOTIFY', color: '#1DB954', match: /^spotify/, fallbackId: '3201606009684' },
  // Not apps: plain games. `key` is the game's screen.
  { key: 'flappy', name: 'FLAPPY BIRD', short: 'FLAPPY', color: '#F4F6F8', game: true },
  { key: 'dino', name: 'DINO RUN', short: 'DINO', color: '#F4F6F8', game: true },
  { key: 'snake', name: 'SNAKE', short: 'SNAKE', color: '#F4F6F8', game: true },
  { key: 'stack', name: 'STACK', short: 'STACK', color: '#F4F6F8', game: true },
];

const DEFAULT_ON = ['hdmi1', 'hdmi2', 'hdmi3', 'hdmi4', 'heartive', 'youtube', 'netflix', 'flappy', 'dino', 'snake', 'stack'];
