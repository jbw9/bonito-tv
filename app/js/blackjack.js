// Blackjack against the dealer: 4-deck shoe, dealer stands on all 17s,
// blackjack pays 3:2, double down on the first two cards.
App.screens.blackjack = (() => {
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const CARD_W = 150, CARD_H = 210, GAP = 40, DEALER_Y = 150, PLAYER_Y = 560;
  const FELT = '#0f5132', FELT_EDGE = '#062417';
  const DEALER_STEP = 0.7;

  let mode, bet = 50, stake, shoe = [], player, dealer, choice, timer, message, msgColor, refilled;

  function shuffle() {
    shoe = [];
    for (let d = 0; d < 4; d++) {
      for (let s = 0; s < 4; s++) for (let r = 0; r < 13; r++) shoe.push({ r, s });
    }
    for (let i = shoe.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
    }
  }

  function total(hand) {
    let sum = 0, aces = 0;
    hand.forEach(c => {
      if (c.r === 0) aces++;
      sum += c.r === 0 ? 11 : Math.min(10, c.r + 1);
    });
    while (sum > 21 && aces--) sum -= 10;
    return sum;
  }

  const isBlackjack = hand => hand.length === 2 && total(hand) === 21;

  function actions() {
    const list = ['HIT', 'STAND'];
    if (player.length === 2 && Wallet.get() >= stake) list.push('DOUBLE');
    return list;
  }

  function toBetting() {
    refilled = Wallet.refillIfBroke();
    bet = Wallet.fitBet(bet);
    mode = 'bet';
  }

  function deal() {
    if (shoe.length < 52) shuffle();
    stake = bet;
    Wallet.add(-stake);
    player = [shoe.pop(), shoe.pop()];
    dealer = [shoe.pop(), shoe.pop()];
    refilled = false;
    if (isBlackjack(player) || isBlackjack(dealer)) return settle();
    mode = 'play';
    choice = 0;
  }

  function finish(text, payout, color) {
    Wallet.add(payout);
    message = text;
    msgColor = color;
    mode = 'done';
  }

  function settle() {
    const p = total(player), d = total(dealer);
    if (isBlackjack(player) && isBlackjack(dealer)) finish('PUSH', stake, '#ffffff');
    else if (isBlackjack(player)) finish('BLACKJACK! +$' + Math.floor(stake * 1.5), Math.floor(stake * 2.5), Wallet.GOLD);
    else if (isBlackjack(dealer)) finish('DEALER BLACKJACK -$' + stake, 0, '#ff6b6b');
    else if (d > 21) finish('DEALER BUSTS +$' + stake, stake * 2, '#5cff9d');
    else if (p > d) finish('YOU WIN +$' + stake, stake * 2, '#5cff9d');
    else if (p === d) finish('PUSH', stake, '#ffffff');
    else finish('DEALER WINS -$' + stake, 0, '#ff6b6b');
  }

  function stand() {
    mode = 'dealer';
    timer = DEALER_STEP;
  }

  function hit() {
    player.push(shoe.pop());
    const p = total(player);
    if (p > 21) finish('BUST -$' + stake, 0, '#ff6b6b');
    else if (p === 21) stand();
  }

  function act(name) {
    if (name === 'HIT') hit();
    else if (name === 'STAND') stand();
    else {
      Wallet.add(-stake);
      stake *= 2;
      hit();
      if (mode === 'play') stand();
    }
  }

  function update(dt) {
    if (mode !== 'dealer') return;
    timer -= dt;
    if (timer > 0) return;
    if (total(dealer) < 17) {
      dealer.push(shoe.pop());
      timer = DEALER_STEP;
    } else settle();
  }

  function drawSuit(g, suit, cx, cy, s, color) {
    g.fillStyle = color;
    const blob = (x, y, r) => {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    };
    const poly = pts => {
      g.beginPath();
      g.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
      g.fill();
    };
    const stem = () => poly([cx, cy + s * 0.1, cx - s * 0.4, cy + s * 1.05, cx + s * 0.4, cy + s * 1.05]);
    if (suit === 0) { // spade
      blob(cx - s / 2, cy + s * 0.2, s / 2);
      blob(cx + s / 2, cy + s * 0.2, s / 2);
      poly([cx - s, cy + s * 0.25, cx, cy - s, cx + s, cy + s * 0.25]);
      stem();
    } else if (suit === 1) { // heart
      blob(cx - s / 2, cy - s * 0.3, s / 2);
      blob(cx + s / 2, cy - s * 0.3, s / 2);
      poly([cx - s, cy - s * 0.2, cx, cy + s, cx + s, cy - s * 0.2]);
    } else if (suit === 2) { // diamond
      poly([cx, cy - s * 1.2, cx + s * 0.85, cy, cx, cy + s * 1.2, cx - s * 0.85, cy]);
    } else { // club
      blob(cx, cy - s * 0.45, s * 0.42);
      blob(cx - s * 0.5, cy + s * 0.15, s * 0.42);
      blob(cx + s * 0.5, cy + s * 0.15, s * 0.42);
      stem();
    }
  }

  function drawCard(g, c, x, y) {
    roundRectPath(g, x, y, CARD_W, CARD_H, 14);
    if (!c) {
      g.fillStyle = '#b3202a';
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.8)';
      g.lineWidth = 6;
      roundRectPath(g, x + 12, y + 12, CARD_W - 24, CARD_H - 24, 8);
      g.stroke();
      return;
    }
    g.fillStyle = '#fbfbf8';
    g.fill();
    const ink = c.s === 1 || c.s === 2 ? '#d0202e' : '#16191e';
    drawText(g, RANKS[c.r], x + 14, y + 14, 4.5, ink);
    drawSuit(g, c.s, x + 30, y + 74, 12, ink);
    drawSuit(g, c.s, x + CARD_W / 2 + 10, y + CARD_H / 2 + 20, 34, ink);
  }

  function drawHand(g, hand, y, hideHole) {
    const width = hand.length * CARD_W + (hand.length - 1) * GAP;
    const x0 = (W - width) / 2;
    hand.forEach((c, i) => drawCard(g, hideHole && i === 1 ? null : c, x0 + i * (CARD_W + GAP), y));
  }

  function draw(g) {
    drawBackground(g, FELT, FELT_EDGE);
    Wallet.draw(g);
    const hidden = mode === 'play';

    if (mode === 'bet') {
      drawText(g, 'BLACKJACK', W / 2, 220, 15, '#ffffff', { align: 'center' });
      drawText(g, 'BLACKJACK PAYS 3 TO 2   DEALER STANDS ON 17', W / 2, 400, 4, 'rgba(255,255,255,0.6)', { style: 'thin', align: 'center' });
      if (refilled) drawText(g, 'OUT OF CHIPS - HERE IS $1000 MORE', W / 2, 470, 4.5, Wallet.GOLD, { style: 'thin', align: 'center' });
      drawText(g, '< BET $' + bet + ' >', W / 2, 600, 8, '#ffffff', { align: 'center' });
      const alpha = Math.sin(clock * 6) > -0.3 ? 1 : 0.3;
      drawText(g, 'OK TO DEAL', W / 2, 740, 6, '#ffffff', { style: 'thin', align: 'center', alpha });
    } else {
      drawText(g, 'DEALER ' + (hidden ? '?' : total(dealer)), 120, DEALER_Y + CARD_H / 2 - 20, 5, '#ffffff', { style: 'thin' });
      drawHand(g, dealer, DEALER_Y, hidden);
      drawText(g, 'YOU ' + total(player), 120, PLAYER_Y + CARD_H / 2 - 20, 5, '#ffffff', { style: 'thin' });
      drawHand(g, player, PLAYER_Y, false);
      drawText(g, 'BET $' + stake, W - 120, PLAYER_Y + CARD_H / 2 - 20, 5, Wallet.GOLD, { style: 'thin', align: 'right' });

      if (mode === 'play') {
        const list = actions();
        const spacing = 360, x0 = W / 2 - (list.length - 1) * spacing / 2;
        list.forEach((a, i) => {
          const on = i === choice;
          drawText(g, a, x0 + i * spacing, 870, 6.5, on ? '#ffffff' : 'rgba(255,255,255,0.45)', { style: 'thin', align: 'center' });
          if (on) drawBullet(g, x0 + i * spacing - textWidth(a, 6.5) / 2 - 36, 870 + 3.5 * 6.5, '#ffffff');
        });
      } else if (mode === 'done') {
        drawText(g, message, W / 2, 440, 7, msgColor, { align: 'center' });
        const alpha = Math.sin(clock * 6) > -0.3 ? 1 : 0.3;
        drawText(g, 'OK FOR NEXT HAND', W / 2, 870, 5, '#ffffff', { style: 'thin', align: 'center', alpha });
      }
    }
    drawLightBar(g);
  }

  function key(k, repeat) {
    if (k === 'back') return App.home();
    if (repeat && k === 'ok') return;
    if (mode === 'bet') {
      if (k === 'left' || k === 'down') bet = Wallet.stepBet(bet, -1);
      else if (k === 'right' || k === 'up') bet = Wallet.stepBet(bet, 1);
      else if (k === 'ok') deal();
    } else if (mode === 'play') {
      const list = actions();
      if (k === 'left') choice = Math.max(0, choice - 1);
      else if (k === 'right') choice = Math.min(list.length - 1, choice + 1);
      else if (k === 'ok') {
        act(list[choice]);
        choice = Math.min(choice, actions().length - 1);
      }
    } else if (mode === 'done' && k === 'ok') toBetting();
  }

  function enter() {
    toBetting();
  }

  return { enter, update, draw, key };
})();
