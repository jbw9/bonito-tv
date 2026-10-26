// Home screen designs, picked under Settings > DESIGN or from a phone (setup/index.html).
// Each one is its own layout in js/home.js; these are the colours the settings screens
// and the lettering use with it. Games keep their own colours.
// dots: round LEDs, square pixels or split-flap tiles. bar: the light bar's colour, a hue
// function for a moving rainbow, or none.
const DESIGNS = [
  {
    key: 'bonito', name: 'BONITO', bg: ['#25282e', '#14161a'],
    ink: '#ffffff', soft: '#d3d7dd', dim: '#a3a9b1', mute: '#7d838c',
    dots: 'round', bar: x => x * 360, barBg: '#07080a',
  },
  {
    key: 'horizon', name: 'HORIZON', bg: ['#4a4a82', '#17182f'],
    ink: '#ffffff', soft: '#e7e8f6', dim: '#b0b3d4', mute: '#8084aa',
    dots: 'round',
  },
  {
    key: 'departures', name: 'DEPARTURES', bg: ['#1b1b1b', '#060606'],
    ink: '#ffc53d', soft: '#e9b84a', dim: '#9d8452', mute: '#6b5d41',
    dots: 'flap', bar: '#ffb020', barBg: '#050505',
  },
  {
    key: 'teletext', name: 'TELETEXT', bg: ['#000000', '#000000'],
    ink: '#ffffff', soft: '#00ffff', dim: '#ffff00', mute: '#00ff00',
    dots: 'square', scan: true,
  },
  {
    key: 'mediabar', name: 'MEDIA BAR', bg: ['#2b3f94', '#0a1131'],
    ink: '#ffffff', soft: '#dfe6ff', dim: '#a5b3e2', mute: '#7484b8',
    dots: 'round',
  },
];

let design = DESIGNS[0];

function setDesign(key) {
  design = DESIGNS.find(d => d.key === key) || DESIGNS[0];
  textCache.clear();
}

// Teletext's CRT: scanlines and darker corners over everything but full-screen video.
let scanlines = null;
function drawScanlines(g) {
  if (!design.scan) return;
  if (!scanlines) {
    scanlines = makeCanvas(W, H, b => {
      b.fillStyle = 'rgba(0,0,0,0.22)';
      for (let y = 0; y < H; y += 4) b.fillRect(0, y, W, 2);
      const v = b.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.62);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,0.55)');
      b.fillStyle = v;
      b.fillRect(0, 0, W, H);
    });
  }
  g.drawImage(scanlines, 0, 0);
}
