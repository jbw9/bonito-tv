// Seats and lobby shared by the party games: up to four players join from the jam
// page's Games tab (js/remote.js) or with the TV remote's arrows, each in their own
// colour, and anyone playing alone gets a CPU rival. Wins carry over between rounds.
const PARTY_COLORS = [['CYAN', '#38C6F4'], ['ORANGE', '#FF7A1A'], ['PINK', '#FF4FA3'], ['YELLOW', '#FFD60A']];
let partyQr = null;

function makeParty(title, max) {
  const party = {
    players: [], // { id, name, label, color, wins, cpu }
    open: true, // seats can be taken (the lobby is up)

    find: id => party.players.find(p => p.id === id),

    join(id, name) {
      name = String(name || '').toUpperCase().slice(0, 12);
      const p = party.find(id);
      if (p) {
        if (name) p.name = name;
        return;
      }
      if (!party.open || party.players.length >= max) return;
      const free = PARTY_COLORS.find(c => !party.players.some(q => q.color === c[1]));
      party.players.push({ id, name: name || free[0], label: free[0], color: free[1], wins: 0 });
    },

    // Seats start empty; phones still on the Games tab take theirs again by themselves.
    reset() {
      party.players = [];
      party.open = true;
    },

    // Closes the seats for a round, adding the CPU for a lone player.
    begin() {
      if (!party.players.length) return false;
      if (party.players.length === 1) {
        party.join('cpu', 'CPU');
        party.find('cpu').cpu = true;
      }
      party.open = false;
      return true;
    },

    toLobby() {
      party.open = true;
      party.players = party.players.filter(p => !p.cpu);
    },

    // Lobby keys from the TV remote; `start` begins a round.
    lobbyKey(k, repeat, start) {
      if (k === 'back') App.home();
      else if (k === 'ok' && !repeat) start();
      else if (k !== 'ok') party.join('tv', 'REMOTE');
    },

    // join / leave / start from phones; anything else is the game's own.
    phone(event, p, start) {
      if (event === 'join') party.join(p.id, p.name);
      else if (event === 'leave' && party.open) party.players = party.players.filter(q => q.id !== p.id);
      else if (event === 'start' && party.open) start();
      else return false;
      return true;
    },

    state(mode, extra) {
      return {
        mode: party.open ? 'lobby' : mode,
        players: party.players.map(p => Object.assign({ id: p.id, name: p.name, label: p.label, color: p.color, wins: p.wins }, extra && extra(p))),
      };
    },

    drawLobby(g) {
      drawText(g, title, W / 2, 110, 12, '#ffffff', { align: 'center' });
      if (!partyQr && Phones.enabled()) partyQr = Jam.renderQr(qrMatrix(Phones.url('games')), null, 380);
      const slotsX = partyQr ? 900 : W / 2 - 360;
      if (partyQr) {
        g.drawImage(partyQr, 480 - partyQr.width / 2, 300);
        drawText(g, 'SCAN TO JOIN', 480, 300 + partyQr.height + 30, 4.5, '#d3d7dd', { style: 'thin', align: 'center' });
      }
      for (let i = 0; i < max; i++) {
        const p = party.players[i], y = 320 + i * 110;
        g.fillStyle = p ? p.color : 'rgba(255,255,255,0.12)';
        g.beginPath();
        g.arc(slotsX, y + 3.5 * 6.5, 16, 0, Math.PI * 2);
        g.fill();
        drawText(g, p ? p.name : 'OPEN SEAT', slotsX + 50, y, 6.5, p ? '#ffffff' : '#5d636c', { style: 'thin' });
        if (p && p.wins) drawText(g, p.wins + (p.wins === 1 ? ' WIN' : ' WINS'), slotsX + 720, y, 6.5, p.color, { style: 'thin', align: 'right' });
      }
      const n = party.players.length;
      const hint = n === 1 ? 'OK START VS CPU' : n ? 'OK START' : 'JOIN FROM A PHONE OR PRESS AN ARROW';
      drawText(g, hint + '   BACK EXIT', W / 2, H - 150, 4, '#7d838c', { style: 'thin', align: 'center' });
    },

    // Big "<NAME> WINS" band across the middle.
    drawWinner(g, text, color) {
      g.fillStyle = 'rgba(0,0,0,0.6)';
      g.fillRect(0, H / 2 - 110, W, 220);
      drawText(g, text, W / 2, H / 2 - 49, 14, color, { align: 'center' });
    },
  };
  return party;
}
