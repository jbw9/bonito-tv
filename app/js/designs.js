// Home screen designs, picked under Settings > DESIGN or from a phone (setup/index.html).
// Each one is its own layout in js/home.js; these are the colours the settings screens
// and the lettering use with it. Games keep their own colours.
// bar: the light bar's colour, a hue function for a moving rainbow, or none.
const DESIGNS = [
  {
    key: 'bonito', name: 'BONITO', bg: ['#25282e', '#14161a'],
    ink: '#ffffff', soft: '#d3d7dd', dim: '#a3a9b1', mute: '#7d838c',
    bar: x => x * 360, barBg: '#07080a',
  },
  {
    key: 'horizon', name: 'HORIZON', bg: ['#4a4a82', '#17182f'],
    ink: '#ffffff', soft: '#e7e8f6', dim: '#b0b3d4', mute: '#8084aa',
  },
  {
    key: 'dial', name: 'DIAL', bg: ['#ebe8e1', '#d5d1c8'],
    ink: '#1d1c1a', soft: '#3b3935', dim: '#6f6b63', mute: '#9a968d',
  },
  {
    key: 'panorama', name: 'PANORAMA', bg: ['#16161b', '#040405'],
    ink: '#ffffff', soft: '#d8d8de', dim: '#8b8b93', mute: '#5c5c64',
  },
  {
    key: 'mediabar', name: 'MEDIA BAR', bg: ['#2b3f94', '#0a1131'],
    ink: '#ffffff', soft: '#dfe6ff', dim: '#a5b3e2', mute: '#7484b8',
  },
];

let design = DESIGNS[0];

function setDesign(key) {
  design = DESIGNS.find(d => d.key === key) || DESIGNS[0];
  textCache.clear();
}
