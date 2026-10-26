// Single-zero (European) roulette, one bet per spin.
App.screens.roulette = (() => {
  const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const REDS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const CX = 560, CY = 570, R = 370, SECTOR = Math.PI * 2 / 37;
  const PANEL_X = 1120, PANEL_W = 660;
  const SPIN_TIME = 5.5;
  const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

  const isRed = n => REDS.indexOf(n) >= 0;
  const colorOf = n => (n === 0 ? '#1f9d55' : isRed(n) ? '#c8102e' : '#16191e');

  const TYPES = [
    { name: 'RED', pays: 1, wins: n => isRed(n) },
    { name: 'BLACK', pays: 1, wins: n => n > 0 && !isRed(n) },
    { name: 'ODD', pays: 1, wins: n => n % 2 === 1 },
    { name: 'EVEN', pays: 1, wins: n => n > 0 && n % 2 === 0 },
    { name: 'LOW 1-18', pays: 1, wins: n => n >= 1 && n <= 18 },
    { name: 'HIGH 19-36', pays: 1, wins: n => n >= 19 },
    { name: '1ST 12', pays: 2, wins: n => n >= 1 && n <= 12 },
    { name: '2ND 12', pays: 2, wins: n => n >= 13 && n <= 24 },
    { name: '3RD 12', pays: 2, wins: n => n >= 25 },
    { name: 'NUMBER', pays: 35, wins: (n, pick) => n === pick },
  ];

  let mode, row, type = 0, pick = 17, bet = 50, stake, rot = 0, rot0, target, t, result, message, msgColor, history = [], refilled;

  function rows() {
    return TYPES[type].name === 'NUMBER' ? ['BET', 'NUMBER', 'AMOUNT', 'SPIN'] : ['BET', 'AMOUNT', 'SPIN'];
  }

  function spin() {
    stake = bet;
    Wallet.add(-stake);
    refilled = false;
    result = Math.floor(Math.random() * 37);
    // Land the result under the pointer at the top after a few full turns.
    rot0 = rot % (Math.PI * 2);
    const want = -ORDER.indexOf(result) * SECTOR;
    const delta = ((want - rot0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    target = rot0 + Math.PI * 2 * 4 + delta;
    t = 0;
    mode = 'spin';
    message = null;
  }

  function settle() {
    history.unshift(result);
    history.length = Math.min(history.length, 12);
    const bt = TYPES[type];
    if (bt.wins(result, pick)) {
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
    if (mode !== 'spin') return;
    t = Math.min(SPIN_TIME, t + dt);
    const e = 1 - Math.pow(1 - t / SPIN_TIME, 3);
    rot = rot0 + (target - rot0) * e;
    if (t >= SPIN_TIME) settle();
  }

  function drawWheel(g) {
    // Wooden rim where the ball runs.
    g.fillStyle = '#5a3418';
    g.beginPath();
    g.arc(CX, CY, R + 36, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#3a200d';
    g.beginPath();
    g.arc(CX, CY, R + 6, 0, Math.PI * 2);
    g.fill();

    g.font = 'bold 26px ' + FONT;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    ORDER.forEach((n, i) => {
      const mid = -Math.PI / 2 + rot + i * SECTOR;
      g.fillStyle = colorOf(n);
      g.beginPath();
      g.arc(CX, CY, R, mid - SECTOR / 2, mid + SECTOR / 2);
      g.arc(CX, CY, R - 62, mid + SECTOR / 2, mid - SECTOR / 2, true);
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.beginPath();
      g.arc(CX, CY, R - 62, mid - SECTOR / 2, mid + SECTOR / 2);
      g.arc(CX, CY, R - 118, mid + SECTOR / 2, mid - SECTOR / 2, true);
      g.fill();
      g.save();
      g.translate(CX + Math.cos(mid) * (R - 31), CY + Math.sin(mid) * (R - 31));
      g.rotate(mid + Math.PI / 2);
      g.fillStyle = '#ffffff';
      g.fillText(String(n), 0, 1);
      g.restore();
    });
    // Pocket dividers.
    g.strokeStyle = 'rgba(230,200,120,0.7)';
    g.lineWidth = 2;
    g.beginPath();
    ORDER.forEach((n, i) => {
      const a = -Math.PI / 2 + rot + (i + 0.5) * SECTOR;
      g.moveTo(CX + Math.cos(a) * (R - 118), CY + Math.sin(a) * (R - 118));
      g.lineTo(CX + Math.cos(a) * R, CY + Math.sin(a) * R);
    });
    g.stroke();

    // Cone and turret.
    const cone = g.createRadialGradient(CX - 40, CY - 40, 10, CX, CY, R - 118);
    cone.addColorStop(0, '#8a5a2e');
    cone.addColorStop(1, '#4a2a12');
    g.fillStyle = cone;
    g.beginPath();
    g.arc(CX, CY, R - 118, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#d9b45a';
    g.lineWidth = 8;
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = rot + i * Math.PI / 2;
      g.moveTo(CX + Math.cos(a) * 30, CY + Math.sin(a) * 30);
      g.lineTo(CX + Math.cos(a) * 120, CY + Math.sin(a) * 120);
    }
    g.stroke();
    g.fillStyle = '#d9b45a';
    g.beginPath();
    g.arc(CX, CY, 34, 0, Math.PI * 2);
    g.fill();

    // The ball runs the rim the other way, then drops into the pocket under the pointer.
    let ballA = -Math.PI / 2, ballR = R - 90;
    if (mode === 'spin') {
      const e = 1 - Math.pow(1 - t / SPIN_TIME, 2);
      ballA = -Math.PI / 2 - (1 - e) * Math.PI * 14;
      ballR = R + 20 - Math.max(0, (t / SPIN_TIME - 0.75) / 0.25) * 110;
    }
    if (mode === 'spin' || result != null) {
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(CX + Math.cos(ballA) * ballR, CY + Math.sin(ballA) * ballR, 13, 0, Math.PI * 2);
      g.fill();
    }

    g.fillStyle = Wallet.GOLD;
    g.beginPath();
    g.moveTo(CX - 22, CY - R - 70);
    g.lineTo(CX + 22, CY - R - 70);
    g.lineTo(CX, CY - R - 34);
    g.fill();
  }

  function draw(g) {
    drawBackground(g, '#0f5132', '#062417');
    drawWheel(g);
    Wallet.draw(g);

    drawText(g, 'ROULETTE', PANEL_X, 120, 11, '#ffffff');
    const list = rows();
    const values = { BET: TYPES[type].name, NUMBER: String(pick), AMOUNT: '$' + bet };
    list.forEach((name, i) => {
      const on = mode === 'bet' && i === row;
      drawCasinoRow(g, PANEL_X, PANEL_W, 280 + i * 76, on, name, values[name], name !== 'SPIN');
    });
    drawText(g, 'PAYS ' + TYPES[type].pays + ' TO 1', PANEL_X, 280 + list.length * 76 + 6, 4, 'rgba(255,255,255,0.5)', { style: 'thin' });

    if (result != null && mode === 'bet') {
      const y = 680;
      g.fillStyle = colorOf(result);
      g.beginPath();
      g.arc(PANEL_X + 60, y + 25, 56, 0, Math.PI * 2);
      g.fill();
      drawText(g, String(result), PANEL_X + 60, y + 4, 6, '#ffffff', { align: 'center' });
      drawText(g, message, PANEL_X + 150, y + 4, 6, msgColor);
    } else if (mode === 'spin') {
      drawText(g, 'NO MORE BETS', PANEL_X, 690, 6, '#ffffff', { style: 'thin' });
    }
    if (refilled) drawText(g, 'OUT OF CHIPS - HERE IS $1000 MORE', PANEL_X, 790, 4, Wallet.GOLD, { style: 'thin' });

    // Recent numbers, newest first.
    g.font = 'bold 24px ' + FONT;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    history.forEach((n, i) => {
      const x = PANEL_X + 26 + i * 54, y = 880;
      g.fillStyle = colorOf(n);
      g.beginPath();
      g.arc(x, y, 24, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.fillText(String(n), x, y + 1);
    });

    drawLightBar(g);
  }

  function change(name, d) {
    if (name === 'BET') {
      type = (type + d + TYPES.length) % TYPES.length;
      row = Math.min(row, rows().length - 1);
    } else if (name === 'NUMBER') pick = (pick + d + 37) % 37;
    else if (name === 'AMOUNT') bet = Wallet.stepBet(bet, d);
  }

  function key(k, repeat) {
    if (k === 'back') return App.home();
    if (mode !== 'bet') return;
    const list = rows();
    if (k === 'up') row = Math.max(0, row - 1);
    else if (k === 'down') row = Math.min(list.length - 1, row + 1);
    else if (k === 'left' || k === 'right') change(list[row], k === 'left' ? -1 : 1);
    else if (k === 'ok' && !repeat) spin();
  }

  function enter() {
    mode = 'bet';
    row = 0;
    result = null;
    refilled = Wallet.refillIfBroke();
    bet = Wallet.fitBet(bet);
  }

  return { enter, update, draw, key };
})();
