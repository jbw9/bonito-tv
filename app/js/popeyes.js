// Popeyes menu board. Items, prices and calories are from popeyes.com for the
// 621 Canal St, New Orleans restaurant (Oct 2026); prices vary by location.
App.screens.popeyes = (() => {
  const ORANGE = '#F26A1B', INK = '#3a2e27', SOFT = '#7a6e66';
  const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
  const MID = 1000;

  const PAGES = [
    {
      title: 'Combo Meals',
      notes: ['COMBOS INCLUDE Reg Side & Reg Drink', '*Homestyle Mac & Cheese upcharge applies.'],
      blocks: [
        { x: 70, y: 300, num: 1, name: 'The Sandwich', img: 'sandwich', box: [520, 250, 450, 300], tag: true, lines: [
          ['', 'Combo', '$8.99', '602-2,326 Cal'],
          ['', 'Sandwich Only', '$5.99', '492 Cal'],
        ] },
        { x: 70, y: 660, num: 2, name: 'Signature Chicken', img: 'chicken', box: [520, 690, 460, 300], tag: true, lines: [
          ['2Pc', ' Combo', '$9.99', '780-2,190 Cal'],
          ['3Pc', ' Combo', '$11.99', '990-2,400 Cal'],
        ] },
        { x: MID + 50, y: 50, num: 3, name: 'Wings', img: 'wings', box: [1480, 40, 400, 260], lines: [
          ['6Pc', ' Combo', '$9.99', '800-2,540 Cal'],
          ['6Pc', ' Wings Only', '$6.99', '690-1,020 Cal'],
        ] },
        { x: MID + 50, y: 380, num: 4, name: 'Tenders', img: 'tenders', box: [1460, 360, 430, 280], tag: true, lines: [
          ['3Pc', ' Combo', '$10.49', '780-2,260 Cal'],
          ['5Pc', ' Combo', '$11.99', '1,030-2,640 Cal'],
        ] },
        { x: MID + 50, y: 710, num: 5, name: 'Seafood', img: 'shrimp', box: [1480, 680, 400, 250], lines: [
          ['8Pc', ' Butterfly Shrimp', '', ''],
          ['', 'Combo', '$9.99', '735-2,145 Cal'],
        ] },
      ],
    },
    {
      title: 'Family Meals',
      notes: ['Includes Large Sides & Buttermilk Biscuits', 'Classic, Spicy or 50/50'],
      blocks: [
        { x: 70, y: 300, name: 'Signature Chicken', img: 'family', box: [560, 300, 420, 290], lines: [
          ['8Pc', ' 1 Lg Side, 4 Biscuits', '$25.99', '3,290-3,830 Cal'],
          ['12Pc', ' 2 Lg Sides, 6 Biscuits', '$36.99', '5,090-6,170 Cal'],
          ['16Pc', ' 3 Lg Sides, 8 Biscuits', '$44.99', '6,890-8,510 Cal'],
        ] },
        { x: 70, y: 660, name: 'Tenders', img: 'tenders-family', box: [560, 650, 420, 290], deal: '$20', lines: [
          ['11Pc', ' Family Meal Deal', '$20.00', '1,280-2,290 Cal'],
          ['8Pc', ' Family Meal', '$25.99', '2,510-3,380 Cal'],
        ] },
      ],
      sides: true,
    },
  ];

  const SIDES = [
    { img: 'fries', name: 'Cajun Fries', cal: '270 Cal' },
    { img: 'beans', name: 'Red Beans & Rice', cal: '260 Cal' },
    { img: 'mac', name: 'Mac & Cheese', cal: '280 Cal' },
    { img: 'biscuit', name: 'Biscuit', cal: '210 Cal' },
  ];

  const images = {};
  ['sandwich', 'chicken', 'wings', 'tenders', 'shrimp', 'family', 'tenders-family', 'fries', 'beans', 'mac', 'biscuit'].forEach(n => {
    images[n] = new Image();
    images[n].src = 'img/popeyes/' + n + '.png';
  });
  images.logo = new Image();
  images.logo.src = 'img/logos/popeyes.png';

  // Whitewashed wood planks, like the in-store boards.
  const board = makeCanvas(W, H, b => {
    b.fillStyle = '#f6f2ec';
    b.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) {
      const y = Math.random() * H;
      b.fillStyle = 'rgba(150,130,110,' + (0.02 + Math.random() * 0.05) + ')';
      b.fillRect(Math.random() * W - 200, y, 100 + Math.random() * 600, 1 + Math.random() * 2);
    }
    b.fillStyle = 'rgba(140,120,100,0.12)';
    for (let y = 135; y < H; y += 135) b.fillRect(0, y, W, 2);
  });

  const HOLD = 10, TURN = 1.2, S = W / 2;
  const sheets = [makeCanvas(W, H, () => {}), makeCanvas(W, H, () => {})];
  let page = 0, fade = 0, timer = 0, turn = null;

  function font(size, weight) {
    return (weight || 700) + ' ' + size + 'px ' + FONT;
  }

  function text(g, str, x, y, size, color, weight, align) {
    g.font = font(size, weight);
    g.fillStyle = color;
    g.textAlign = align || 'left';
    g.textBaseline = 'top';
    g.fillText(str, x, y);
    return g.measureText(str).width;
  }

  function drawFit(g, img, x, y, w, h) {
    if (!img.complete || !img.naturalWidth) return;
    const s = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    g.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  function drawTitle(g, p, x) {
    const w = text(g, p.title, x, 40, 118, ORANGE, 900);
    // Brush-stroke underline.
    g.strokeStyle = ORANGE;
    g.lineWidth = 7;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x + 4, 178);
    g.quadraticCurveTo(x + w / 2, 166, x + w + 10, 172);
    g.stroke();
    text(g, p.notes[0], x, 204, 26, INK, 800);
    text(g, p.notes[1], x, 240, 21, SOFT, 600);
  }

  function drawTag(g, x, y) {
    g.save();
    g.translate(x, y);
    g.rotate(-0.12);
    text(g, 'Classic', 0, 0, 30, ORANGE, '800 italic');
    text(g, 'or', 22, 34, 20, SOFT, '700 italic');
    text(g, 'Spicy', 50, 30, 30, '#d23a1c', '800 italic');
    g.restore();
  }

  function drawBlock(g, b) {
    const [bx, by, bw, bh] = b.box;
    drawFit(g, images[b.img], bx, by, bw, bh);
    if (b.tag) drawTag(g, bx - 50, by + bh - 60);

    let x = b.x;
    if (b.num) {
      x += text(g, '#', x, b.y + 8, 40, ORANGE, 900);
      x += text(g, String(b.num), x, b.y, 64, ORANGE, 900) + 16;
    }
    text(g, b.name, x, b.y, 64, ORANGE, 900);

    let y = b.y + 92;
    b.lines.forEach(([lead, rest, price, cal]) => {
      let lx = b.x + 20;
      if (lead) lx += text(g, lead, lx, y, 34, ORANGE, 800);
      lx += text(g, rest, lx, y, 34, INK, 600);
      if (price) text(g, price, lx + 22, y, 34, INK, 900);
      if (cal) text(g, cal, b.x + 20, y + 40, 26, SOFT, 500);
      y += cal ? 84 : 42;
    });

    if (b.deal) {
      const cx = b.x + 470, cy = b.y + 26;
      g.fillStyle = '#1aa39a';
      g.beginPath();
      g.arc(cx, cy, 52, 0, Math.PI * 2);
      g.fill();
      text(g, b.deal, cx, cy - 26, 48, '#ffffff', 900, 'center');
    }
  }

  function drawSides(g) {
    const x = MID + 50;
    text(g, 'Sides', x, 40, 118, ORANGE, 900);
    text(g, 'Regular Sides', x, 204, 26, INK, 800);
    const cw = 210;
    SIDES.forEach((s, i) => {
      const cx = x + i * cw;
      // The photos have wide transparent margins, so let them overlap their neighbours.
      drawFit(g, images[s.img], cx - 40, 230, cw + 70, 270);
      text(g, s.name, cx + cw / 2 - 5, 500, 24, ORANGE, 800, 'center');
      text(g, s.cal, cx + cw / 2 - 5, 532, 22, SOFT, 500, 'center');
    });

    const rows = [
      ['Regular Side', '$3.29', ['Cajun Fries, Red Beans & Rice, Mashed Potatoes', 'with Cajun Gravy, Coleslaw, Cajun Rice']],
      ['Large Homestyle Mac & Cheese', '$5.79', []],
      ['Buttermilk Biscuit', '$1.29', []],
      ['Make Any Combo Side Large', '+$2.50', []],
    ];
    let y = 610;
    rows.forEach(([label, price, sub]) => {
      text(g, label, x + 20, y, 34, INK, 700);
      text(g, price, W - 70, y, 34, INK, 900, 'right');
      y += 44;
      sub.forEach(line => {
        text(g, line, x + 20, y, 24, SOFT, 500);
        y += 32;
      });
      y += 16;
    });
  }

  function enter() {
    page = 0;
    fade = 0;
    timer = 0;
    turn = null;
  }

  function flip(dir) {
    if (turn) return;
    turn = { to: (page + dir + PAGES.length) % PAGES.length, dir, t: 0 };
    timer = 0;
  }

  function update(dt) {
    fade = Math.min(1, fade + dt * 4);
    if (turn) {
      turn.t += dt / TURN;
      if (turn.t >= 1) {
        page = turn.to;
        turn = null;
      }
    } else if ((timer += dt) >= HOLD) {
      flip(1);
    }
  }

  // One half of a sheet, squashed toward the spine; side 0 is left, 1 is right.
  function leaf(g, src, side, scale, shade) {
    const w = S * scale, lift = H * 0.04 * (1 - scale);
    const x = side ? S : S - w;
    g.drawImage(src, side * S, 0, S, H, x, -lift / 2, w, H + lift);
    if (shade) {
      g.fillStyle = 'rgba(40,25,15,' + shade + ')';
      g.fillRect(x, -lift / 2, w, H + lift);
    }
  }

  // Page turn about the centre spine, like a book.
  function drawTurn(g) {
    const from = sheets[0], to = sheets[1];
    drawPage(from.getContext('2d'), page);
    drawPage(to.getContext('2d'), turn.to);

    const out = turn.dir > 0 ? 1 : 0;
    const e = turn.t * turn.t * (3 - 2 * turn.t);
    const c = Math.cos(Math.PI * e);
    // Shade whichever flat half the moving leaf is hovering over.
    leaf(g, from, 1 - out, 1, Math.max(0, -0.25 * c));
    leaf(g, to, out, 1, Math.max(0, 0.25 * c));

    const shadow = g.createLinearGradient(S - 60, 0, S + 60, 0);
    shadow.addColorStop(0, 'rgba(40,25,15,0)');
    shadow.addColorStop(0.5, 'rgba(40,25,15,' + 0.35 * Math.sin(Math.PI * e) + ')');
    shadow.addColorStop(1, 'rgba(40,25,15,0)');
    g.fillStyle = shadow;
    g.fillRect(S - 60, 0, 120, H);

    if (c > 0) leaf(g, from, out, c, 0.4 * (1 - c));
    else leaf(g, to, 1 - out, -c, 0.4 * (1 + c));
  }

  function draw(g) {
    if (turn) return drawTurn(g);
    g.globalAlpha = fade;
    drawPage(g, page);
    g.globalAlpha = 1;
  }

  function drawPage(g, i) {
    const p = PAGES[i];
    g.drawImage(board, 0, 0);

    drawTitle(g, p, 70);
    g.fillStyle = 'rgba(90,70,55,0.35)';
    g.fillRect(MID, 50, 2, H - 140);
    p.blocks.forEach(b => drawBlock(g, b));
    if (p.sides) drawSides(g);

    drawFit(g, images.logo, 70, 990, 280, 73);
    text(g, '2,000 calories a day is used for general nutrition advice, but calorie needs vary.', MID + 50, 1000, 20, SOFT, 500);
    text(g, 'Prices: 621 Canal St, New Orleans. Prices vary by location.', MID + 50, 1030, 20, SOFT, 500);

    PAGES.forEach((_, n) => {
      g.fillStyle = i === n ? ORANGE : 'rgba(90,70,55,0.25)';
      g.beginPath();
      g.arc(MID - 14 + n * 28, 1024, 8, 0, Math.PI * 2);
      g.fill();
    });
  }

  function key(k) {
    if (k === 'back' || k === 'ok') return App.home();
    const d = k === 'right' || k === 'down' ? 1 : k === 'left' || k === 'up' ? -1 : 0;
    if (d) flip(d);
  }

  return { enter, update, draw, key };
})();
