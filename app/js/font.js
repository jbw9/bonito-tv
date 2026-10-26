// 5x7 dot-matrix glyphs. '#' = lit pixel.
const GLYPHS = {
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  'B': ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  'C': ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  'D': ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  'E': ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  'F': ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  'G': ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  'H': ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  'I': ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  'J': ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  'K': ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  'L': ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  'M': ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  'N': ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
  'O': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  'P': ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  'Q': ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  'R': ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  'T': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  'U': ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  'V': ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  'W': ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  'X': ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  'Y': ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  'Z': ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  ':': ['.....', '..#..', '..#..', '.....', '..#..', '..#..', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.....', '..#..'],
  ',': ['.....', '.....', '.....', '.....', '.....', '..#..', '.#...'],
  "'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '<': ['...#.', '..#..', '.#...', '#....', '.#...', '..#..', '...#.'],
  '>': ['.#...', '..#..', '...#.', '....#', '...#.', '..#..', '.#...'],
  '$': ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  '°': ['.##..', '#..#.', '#..#.', '.##..', '.....', '.....', '.....'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
  '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'],
  '%': ['##...', '##..#', '...#.', '..#..', '.#...', '#..##', '...##'],
};

const textCache = new Map();

function textWidth(str, cell) {
  return Math.max(0, String(str).length * 6 - 1) * cell;
}

function isLit(rows, x, y) {
  return y >= 0 && y < rows.length && x >= 0 && x < rows[y].length && rows[y][x] === '#';
}

// Round LED dots; unlit cells glow faintly like a real dot-matrix panel.
function drawLedRows(g, rows, ox, oy, cell, color, dimAlpha) {
  const r = cell * 0.36;
  const lit = new Path2D();
  const dim = new Path2D();
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const cx = ox + (x + 0.5) * cell;
      const cy = oy + (y + 0.5) * cell;
      const p = rows[y][x] === '#' ? lit : dim;
      p.moveTo(cx + r, cy);
      p.arc(cx, cy, r, 0, Math.PI * 2);
    }
  }
  g.fillStyle = color;
  if (dimAlpha) {
    g.globalAlpha = dimAlpha;
    g.fill(dim);
    g.globalAlpha = 1;
  }
  g.fill(lit);
}

// Lit pixels joined by thin strokes, giving the hairline secondary font.
function drawThinRows(g, rows, ox, oy, cell, color) {
  g.strokeStyle = color;
  g.lineWidth = Math.max(1.5, cell * 0.24);
  g.lineCap = 'round';
  g.beginPath();
  const pt = (x, y) => [ox + (x + 0.5) * cell, oy + (y + 0.5) * cell];
  const seg = (x1, y1, x2, y2) => {
    const a = pt(x1, y1), b = pt(x2, y2);
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
  };
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      if (!isLit(rows, x, y)) continue;
      let joined = false;
      if (isLit(rows, x + 1, y)) { seg(x, y, x + 1, y); joined = true; }
      if (isLit(rows, x, y + 1)) { seg(x, y, x, y + 1); joined = true; }
      if (isLit(rows, x + 1, y + 1) && !isLit(rows, x + 1, y) && !isLit(rows, x, y + 1)) { seg(x, y, x + 1, y + 1); joined = true; }
      if (isLit(rows, x - 1, y + 1) && !isLit(rows, x - 1, y) && !isLit(rows, x, y + 1)) { seg(x, y, x - 1, y + 1); joined = true; }
      const hasNeighbor = joined || isLit(rows, x - 1, y) || isLit(rows, x, y - 1) ||
        isLit(rows, x - 1, y - 1) || isLit(rows, x + 1, y - 1);
      if (!hasNeighbor) {
        const a = pt(x, y);
        g.moveTo(a[0], a[1]);
        g.lineTo(a[0] + 0.01, a[1]);
      }
    }
  }
  g.stroke();
}

function renderText(str, cell, color, style) {
  const key = style + '|' + cell + '|' + color + '|' + str;
  let c = textCache.get(key);
  if (c) return c;
  if (textCache.size > 400) textCache.clear();
  const pad = 2;
  c = document.createElement('canvas');
  c.width = Math.ceil(textWidth(str, cell)) + pad * 2;
  c.height = Math.ceil(7 * cell) + pad * 2;
  c.pad = pad;
  const g = c.getContext('2d');
  for (let i = 0; i < str.length; i++) {
    const rows = GLYPHS[str[i]] || GLYPHS[' '];
    const ox = pad + i * 6 * cell;
    if (style === 'thin') drawThinRows(g, rows, ox, pad, cell, color);
    else drawLedRows(g, rows, ox, pad, cell, color, 0.12);
  }
  textCache.set(key, c);
  return c;
}

// opts: style ('led' | 'thin'), align ('left' | 'center' | 'right'), alpha
function drawText(g, str, x, y, cell, color, opts) {
  opts = opts || {};
  str = String(str).toUpperCase();
  const c = renderText(str, cell, color, opts.style || 'led');
  const w = textWidth(str, cell);
  if (opts.align === 'center') x -= w / 2;
  else if (opts.align === 'right') x -= w;
  g.globalAlpha = opts.alpha == null ? 1 : opts.alpha;
  g.drawImage(c, x - c.pad, y - c.pad);
  g.globalAlpha = 1;
  return w;
}

// Small dot-matrix icon from a bitmap of any size.
function drawIcon(g, rows, x, y, cell, color) {
  const key = 'icon|' + cell + '|' + color + '|' + rows.join('/');
  let c = textCache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = Math.ceil(rows[0].length * cell);
    c.height = Math.ceil(rows.length * cell);
    drawLedRows(c.getContext('2d'), rows, 0, 0, cell, color, 0);
    textCache.set(key, c);
  }
  g.drawImage(c, x, y);
}

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(hex, toHex, t) {
  const a = hexRgb(hex), b = hexRgb(toHex);
  return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
}

function isLight(hex) {
  const c = hexRgb(hex);
  return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255 > 0.62;
}
