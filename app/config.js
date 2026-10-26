// Settings. Put your own in app/config.local.js (not committed) so they survive updates:
//   Object.assign(window.CONFIG, { name: 'ALEX', city: 'Brooklyn' });
// Redeploy after editing (./deploy.sh <tv-ip>). Name, city, units, design and the Spotify
// login can also be set from a phone, no redeploy: Settings > PHONE SETUP on the TV.
window.CONFIG = {
  title: 'BONITO',
  name: 'THERE',         // shown as "HELLO <NAME>" on the home screen
  city: '',              // e.g. 'Brooklyn'. Blank = detect from the TV's IP address
  units: 'fahrenheit',   // or 'celsius'
  design: 'bonito',      // or 'horizon', 'dial', 'panorama', 'mediabar' (js/designs.js)
  // Shared leaderboards and the phone link (remote, games, jam) go through this Supabase
  // project, set up with supabase.sql and free for anyone to use; each TV gets its own
  // room in it. The publishable key is meant to be public. Swap in your own project if
  // you like, or blank both to keep scores on the TV and phones off.
  supabaseUrl: 'https://jbvkjvdthuzofvmhwctv.supabase.co',
  supabaseKey: 'sb_publishable_hbxcjbYF5H8py5gGLokxPg_tD9nGsNl',
  // Optional background music from Spotify (Premium only). Log in from PHONE SETUP, or run
  // ./spotify-login.py once, which adds the first two to config.local.js. spotifyPlaylist: a playlist or album link
  // to start on shuffle at boot. Blank = carry on with whatever you last played.
  spotifyClientId: '',
  spotifyRefreshToken: '',
  spotifyPlaylist: '',
  // The phone page (jam/index.html) that the home screen's QR code opens: remote, games
  // and, with Spotify set up, the jam. With spotifyClientSecret (from the Spotify app's
  // dashboard; it stays on the TV) guests' search is instant.
  jamUrl: 'https://jbw9.github.io/bonito-tv/jam/',
  spotifyClientSecret: '',
};
