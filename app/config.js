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
};
