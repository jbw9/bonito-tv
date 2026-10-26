// Settings. Put your own in app/config.local.js (not committed) so they survive updates:
//   Object.assign(window.CONFIG, { name: 'ALEX', city: 'Brooklyn' });
// Redeploy after editing (./deploy.sh <tv-ip>).
window.CONFIG = {
  title: 'SEEKER FLAP',
  name: 'THERE',         // shown as "HELLO <NAME>" on the home screen
  city: '',              // e.g. 'Brooklyn'. Blank = detect from the TV's IP address
  units: 'fahrenheit',   // or 'celsius'
  // Optional shared leaderboards: a Supabase project set up with supabase.sql. The
  // publishable key is meant to be public. Leave blank to keep scores on the TV only.
  supabaseUrl: '',
  supabaseKey: '',
  // Optional background music from Spotify (Premium only). Run ./spotify-login.py once;
  // it adds the first two to config.local.js. spotifyPlaylist: a playlist or album link
  // to start on shuffle at boot. Blank = carry on with whatever you last played.
  spotifyClientId: '',
  spotifyRefreshToken: '',
  spotifyPlaylist: '',
  // Optional jam: guests scan a QR code on the home screen to add songs. Needs the
  // Supabase project above (with supabase.sql run) and jam/index.html hosted, e.g. on
  // GitHub Pages: 'https://<user>.github.io/tv-setup/jam/'. With spotifyClientSecret
  // (from the Spotify app's dashboard; it stays on the TV) guests' search is instant.
  jamUrl: '',
  spotifyClientSecret: '',
};
