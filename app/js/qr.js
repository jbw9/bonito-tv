// Minimal QR code encoder: byte mode, error correction level H (so a logo can cover
// the middle), versions 1-10 (up to 119 bytes), enough for the jam link. Follows
// ISO/IEC 18004 the same way Nayuki's QR library does. qrMatrix(text) returns rows of
// booleans, true = dark.
const qrMatrix = (() => {
  // Per version: total codewords, EC codewords per block, number of blocks.
  const RAW = [0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346];
  const ECC = [0, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28];
  const BLOCKS = [0, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8];
  const ALIGN = [[], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
  const MASKS = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    x => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
    (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0,
    (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0,
  ];

  const bit = (n, i) => ((n >>> i) & 1) !== 0;

  function gfMul(a, b) {
    let r = 0;
    for (let i = 7; i >= 0; i--) {
      r = (r << 1) ^ ((r >>> 7) * 0x11d);
      if ((b >>> i) & 1) r ^= a;
    }
    return r;
  }

  function rsDivisor(degree) {
    const d = new Array(degree).fill(0);
    d[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < degree; j++) {
        d[j] = gfMul(d[j], root);
        if (j + 1 < degree) d[j] ^= d[j + 1];
      }
      root = gfMul(root, 2);
    }
    return d;
  }

  function rsRemainder(data, divisor) {
    const r = divisor.map(() => 0);
    data.forEach(b => {
      const f = b ^ r.shift();
      r.push(0);
      divisor.forEach((c, i) => { r[i] ^= gfMul(c, f); });
    });
    return r;
  }

  // Data codewords for the text, padded to the version's capacity.
  function encode(bytes, ver) {
    const cap = RAW[ver] - ECC[ver] * BLOCKS[ver];
    const bits = [];
    const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    push(4, 4);
    push(bytes.length, ver < 10 ? 8 : 16);
    bytes.forEach(b => push(b, 8));
    push(0, Math.min(4, cap * 8 - bits.length));
    push(0, (8 - bits.length % 8) % 8);
    const out = [];
    for (let i = 0; i < bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    for (let pad = 0xec; out.length < cap; pad ^= 0xec ^ 0x11) out.push(pad);
    return out;
  }

  // Splits into blocks, adds error correction and interleaves.
  function codewords(data, ver) {
    const n = BLOCKS[ver], ecLen = ECC[ver], raw = RAW[ver];
    const short = n - raw % n, shortLen = Math.floor(raw / n);
    const div = rsDivisor(ecLen);
    const blocks = [];
    for (let i = 0, k = 0; i < n; i++) {
      const dat = data.slice(k, k + shortLen - ecLen + (i < short ? 0 : 1));
      k += dat.length;
      const ecc = rsRemainder(dat, div);
      if (i < short) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    const out = [];
    for (let i = 0; i < blocks[0].length; i++) {
      blocks.forEach((b, j) => {
        if (i !== shortLen - ecLen || j >= short) out.push(b[i]);
      });
    }
    return out;
  }

  function build(ver, cw, mask) {
    const size = ver * 4 + 17;
    const m = [], fn = [];
    for (let y = 0; y < size; y++) {
      m.push(new Array(size).fill(false));
      fn.push(new Array(size).fill(false));
    }
    const set = (x, y, dark) => {
      m[y][x] = dark;
      fn[y][x] = true;
    };

    for (let i = 0; i < size; i++) {
      set(6, i, i % 2 === 0);
      set(i, 6, i % 2 === 0);
    }
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(([cx, cy]) => {
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
          if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
        }
      }
    });
    const al = ALIGN[ver], last = al.length - 1;
    al.forEach((ax, i) => al.forEach((ay, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }));

    // Format bits: level H (10) and the mask, BCH-protected.
    const data = (2 << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const fmt = ((data << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) set(8, i, bit(fmt, i));
    set(8, 7, bit(fmt, 6));
    set(8, 8, bit(fmt, 7));
    set(7, 8, bit(fmt, 8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(fmt, i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(fmt, i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(fmt, i));
    set(8, size - 8, true);

    if (ver >= 7) {
      let r = ver;
      for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
      const vb = (ver << 12) | r;
      for (let i = 0; i < 18; i++) {
        const a = size - 11 + i % 3, b = Math.floor(i / 3);
        set(a, b, bit(vb, i));
        set(b, a, bit(vb, i));
      }
    }

    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
          if (fn[y][x] || i >= cw.length * 8) continue;
          m[y][x] = bit(cw[i >>> 3], 7 - (i & 7));
          i++;
        }
      }
    }
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[mask](x, y)) m[y][x] = !m[y][x];
    }
    return m;
  }

  // Simplified mask scoring (runs, 2x2 blocks, dark balance) to avoid hard-to-scan
  // patterns.
  function penalty(m) {
    const size = m.length;
    let score = 0, dark = 0;
    for (let a = 0; a < size; a++) {
      let runH = 1, runV = 1;
      for (let b = 1; b < size; b++) {
        runH = m[a][b] === m[a][b - 1] ? runH + 1 : 1;
        runV = m[b][a] === m[b - 1][a] ? runV + 1 : 1;
        if (runH === 5) score += 3; else if (runH > 5) score++;
        if (runV === 5) score += 3; else if (runV > 5) score++;
      }
    }
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (m[y][x]) dark++;
        if (x && y && m[y][x] === m[y - 1][x] && m[y][x] === m[y][x - 1] && m[y][x] === m[y - 1][x - 1]) score += 3;
      }
    }
    return score + Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
  }

  return text => {
    const bytes = Array.from(new TextEncoder().encode(text));
    let ver = 1;
    while (ver < 10 && 12 + bytes.length * 8 > (RAW[ver] - ECC[ver] * BLOCKS[ver]) * 8) ver++;
    const cw = codewords(encode(bytes, ver), ver);
    let best = null, bestScore = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      const m = build(ver, cw, mask);
      const s = penalty(m);
      if (s < bestScore) {
        best = m;
        bestScore = s;
      }
    }
    return best;
  };
})();
