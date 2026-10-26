// Two-dice betting: call the roll before it lands.
App.screens.dice = (() => {
  const SIZE = 220, ROLL_TIME = 1.3, FACE_EVERY = 0.07;
  const LEFT = 560, ROW_W = 800;
  const PIPS = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [2, 0], [0, 2], [2, 2]],
    5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
    6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
  };
  const TYPES = [
    { name: 'HIGH 8-12', pays: 1, wins: (a, b) => a + b >= 8 },
    { name: 'LOW 2-6', pays: 1, wins: (a, b) => a + b <= 6 },
    { name: 'LUCKY 7', pays: 4, wins: (a, b) => a + b === 7 },
    { name: 'DOUBLES', pays: 4, wins: (a, b) => a === b },
  ];
  const ROWS = ['BET', 'AMOUNT', 'ROLL'];

  let mode, row, type = 0, bet = 50, stake, faces = [3, 4], final, t, faceTimer, message, msgColor, history = [], refilled;

  const die = () => 1 + Math.floor(Math.random() * 6);

  function roll() {
    stake = bet;
    Wallet.add(-stake);
    refilled = false;
    final = [die(), die()];
    t = 0;
    faceTimer = 0;
    message = null;
    mode = 'roll';
  }

  function settle() {
    faces = final;
    const [a, b] = faces;
    history.unshift(a + b);
    history.length = Math.min(history.length, 12);
    const bt = TYPES[type];
    if (bt.wins(a, b)) {
      Wallet.add(stake * (bt.pays + 1));
      message = 'YOU WIN +$' + stake * bt.pays;
      msgColor = '#5cff9d';
    } else {
      message = 'YOU LOSE -$' + stake;
      msgColor = '#ff6b6b';
    }
    refilled = Wallet.refillIfBroke();
    bet = Wallet.fitBet(bet);
    mode = 'bet';
  }

  function update(dt) {
    if (mode !== 'roll') return;
    t += dt;
    faceTimer -= dt;
    if (faceTimer <= 0) {
      faceTimer = FACE_EVERY;
      faces = [die(), die()];
    }
    if (t >= ROLL_TIME) settle();
  }

  function drawDie(g, n, cx, cy, angle) {
    g.save();
    g.translate(cx, cy);
    g.rotate(angle);
    roundRectPath(g, -SIZE / 2, -SIZE / 2, SIZE, SIZE, 30);
    g.fillStyle = '#fbfbf8';
    g.fill();
    g.fillStyle = n === 1 ? '#c8102e' : '#16191e';
    const step = SIZE * 0.28;
    PIPS[n].forEach(([x, y]) => {
      g.beginPath();
      g.arc((x - 1) * step, (y - 1) * step, n === 1 ? 28 : 21, 0, Math.PI * 2);
      g.fill();
    });
    g.restore();
  }

  function draw(g) {
    drawBackground(g, '#0f5132', '#062417');
    Wallet.draw(g);
    drawText(g, 'DICE', W / 2, 90, 11, '#ffffff', { align: 'center' });

    // Tumble while rolling: bounce and spin, settling as the roll ends.
    const left = mode === 'roll' ? 1 - t / ROLL_TIME : 0;
    [-1, 1].forEach((side, i) => {
      const hop = Math.abs(Math.sin(t * 14 + i)) * 70 * left;
      const angle = Math.sin(t * 11 + i * 2) * 0.6 * left;
      drawDie(g, faces[i], W / 2 + side * 170, 390 - hop, angle);
    });
    if (mode === 'bet' && message) {
      drawText(g, 'TOTAL ' + (faces[0] + faces[1]), W / 2, 560, 6, '#ffffff', { align: 'center' });
      drawText(g, message, W / 2, 630, 6, msgColor, { align: 'center' });
    }

    const values = { BET: TYPES[type].name, AMOUNT: '$' + bet };
    ROWS.forEach((name, i) => {
      drawCasinoRow(g, LEFT, ROW_W, 720 + i * 72, mode === 'bet' && i === row, name, values[name], name !== 'ROLL');
    });
    drawText(g, 'PAYS ' + TYPES[type].pays + ' TO 1', LEFT, 720 + ROWS.length * 72 + 4, 4, 'rgba(255,255,255,0.5)', { style: 'thin' });
    if (refilled) drawText(g, 'OUT OF CHIPS - HERE IS $1000 MORE', W - 80, 1000, 4, Wallet.GOLD, { style: 'thin', align: 'right' });

    // Recent totals, newest first.
    history.forEach((n, i) => {
      drawText(g, String(n), 120, 180 + i * 56, 4.5, i === 0 ? '#ffffff' : 'rgba(255,255,255,0.45)', { style: 'thin' });
    });

    drawLightBar(g);
  }

  function key(k, repeat) {
    if (k === 'back') return App.home();
    if (mode !== 'bet') return;
    if (k === 'up') row = Math.max(0, row - 1);
    else if (k === 'down') row = Math.min(ROWS.length - 1, row + 1);
    else if (k === 'left' || k === 'right') {
      const d = k === 'left' ? -1 : 1;
      if (ROWS[row] === 'BET') type = (type + d + TYPES.length) % TYPES.length;
      else if (ROWS[row] === 'AMOUNT') bet = Wallet.stepBet(bet, d);
    } else if (k === 'ok' && !repeat) roll();
  }

  function enter() {
    // A roll left under way carries on; its bet is already in.
    if (mode === 'roll') return;
    mode = 'bet';
    row = 0;
    message = null;
    refilled = Wallet.refillIfBroke();
    bet = Wallet.fitBet(bet);
  }

  return { enter, update, draw, key };
})();
