// Play-money bankroll shared by the casino games. Going broke tops it back up,
// so there's always something to bet with.
const Wallet = (() => {
  const START = 1000;
  const BETS = [10, 25, 50, 100, 250, 500, 1000];
  const GOLD = '#FFD60A';
  let chips = Platform.load('chips', START);

  function add(n) {
    chips += n;
    Platform.save('chips', chips);
  }

  function refillIfBroke() {
    if (chips >= BETS[0]) return false;
    add(START - chips);
    return true;
  }

  // Steps through the bet sizes, never past what's in the wallet.
  function stepBet(bet, d) {
    const fits = BETS.filter(b => b <= chips);
    if (!fits.length) return BETS[0];
    let i = fits.indexOf(bet);
    if (i < 0) i = fits.length - 1;
    return fits[Math.max(0, Math.min(fits.length - 1, i + d))];
  }

  function fitBet(bet) {
    return bet <= chips ? bet : stepBet(bet, 0);
  }

  function draw(g) {
    drawText(g, '$' + chips, W - 80, LIGHTBAR_H + 30, 6, GOLD, { align: 'right' });
  }

  return { add, refillIfBroke, stepBet, fitBet, draw, GOLD, get: () => chips };
})();

// A settings-style row: bullet when selected, label left, value right.
function drawCasinoRow(g, x, w, y, on, label, value, arrows) {
  const ink = on ? '#ffffff' : '#7d838c';
  if (on) drawBullet(g, x - 40, y + 3.5 * 5.5, '#ffffff');
  drawText(g, label, x, y, 5.5, ink, { style: 'thin' });
  if (value != null) drawText(g, arrows && on ? '< ' + value + ' >' : value, x + w, y, 5.5, ink, { style: 'thin', align: 'right' });
}

// ctx.roundRect is too new for older Tizen browsers.
function roundRectPath(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
