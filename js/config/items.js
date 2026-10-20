// =============================================================
//  WINKEL: gereedschap, gadgets, wapens, diensten
//  cat      : tool (openbreken) | starter (motor starten) | gadget | weapon | service
//  mech/elec: kracht tegen mechanische/elektronische beveiliging
//  time     : minuten die het kost (hoe langer, hoe meer kans dat iemand je ziet)
//  noise    : extra (of minder) alarmkans
//  radar    : niveau politieradar (1 scanner, 2 radar, 3 satelliet)
//  minLevel : vanaf welk level te koop
// =============================================================
window.AD = window.AD || {};

AD.SHOP_CATS = [
  { id: 'tool',    name: 'Gereedschap', desc: 'Om deuren open te krijgen.' },
  { id: 'starter', name: 'Starten',     desc: 'Om de motor aan de praat te krijgen.' },
  { id: 'gadget',  name: 'Gadgets',     desc: 'Radar, schoenen, vermomming.' },
  { id: 'weapon',  name: 'Wapens',      desc: 'Voor als het uit de hand loopt.' },
  { id: 'service', name: 'Diensten',    desc: 'Verbruiksartikelen en contacten.' },
];

AD.ITEMS = {
  // ---------- Openbreken ----------
  schroevendraaier: { cat: 'tool', time: 2, name: 'Schroevendraaier', price: 0,
    desc: 'Je trouwe vriend. Werkt op oude barrels.', mech: 0.05, elec: 0, noise: 0.05 },
  breekijzer: { cat: 'tool', time: 0.6, name: 'Breekijzer', price: 150,
    desc: 'Snel en grof. Maakt veel lawaai.', mech: 0.18, elec: 0, noise: 0.18 },
  slimjim: { cat: 'tool', time: 1, name: 'Slim Jim', price: 450,
    desc: 'Glijdt langs het raam op het slot. Stil.', mech: 0.26, elec: 0, noise: -0.04 },
  lockpick: { cat: 'tool', time: 1.4, name: 'Lockpick-set', price: 1400, minLevel: 2,
    desc: 'Voor de vakman. Werkt op de meeste sloten.', mech: 0.34, elec: 0.05, noise: -0.08 },
  relaybox: { cat: 'tool', time: 0.4, name: 'Relay-kastje', price: 5500, minLevel: 4,
    desc: 'Vangt het keyless signaal op. Deur open én motor aan.', mech: 0.05, elec: 0.5, noise: -0.2, startsCar: true },

  // ---------- Starten ----------
  hotwirekit: { cat: 'starter', time: 1, name: 'Hotwire-kit', price: 250,
    desc: 'Kabeltjes en klemmen. Beter dan je tanden.', mech: 0.2, elec: 0.02 },
  obdprog: { cat: 'starter', time: 0.6, name: 'Sleutelprogrammeur', price: 2800, minLevel: 3,
    desc: 'Programmeert een nieuwe sleutel via de OBD-poort.', mech: 0.05, elec: 0.5 },

  // ---------- Gadgets ----------
  scanner: { cat: 'gadget', name: 'Politiescanner', price: 400, radar: 1,
    desc: 'Luister mee: exacte kansen en hoeveel minuten de politie nog weg is.' },
  radar: { cat: 'gadget', name: 'Politieradar', price: 2200, minLevel: 2, radar: 2,
    desc: 'Berekent je pakkans tijdens een achtervolging.' },
  satnav: { cat: 'gadget', name: 'Satelliet-tracker', price: 7000, minLevel: 4, radar: 3,
    desc: 'Ziet alle eenheden en helikopters. Je pakkans tot op de procent.' },
  sneakers: { cat: 'gadget', name: 'Sportschoenen', price: 180, foot: 0.08,
    desc: '+8% bij rennen.' },
  bivak: { cat: 'gadget', name: 'Bivakmuts', price: 90, heatMult: 0.8,
    desc: 'Minder herkenbaar: 20% minder heat.' },
  platen: { cat: 'gadget', name: 'Valse kentekenplaten', price: 900, minLevel: 2, noticeMult: 0.6,
    desc: 'Politie let 40% minder op je gestolen auto.' },

  // ---------- Wapens ----------
  knuppel: { cat: 'weapon', name: 'Honkbalknuppel', price: 200, power: 0.15, heat: 6, ranged: false,
    desc: 'Voor van dichtbij. Kan niet terugschieten.' },
  pistool: { cat: 'weapon', name: 'Pistool', price: 1500, minLevel: 2, power: 0.32, heat: 14, ranged: true,
    desc: 'Klein, betrouwbaar. Je kunt terugschieten.' },
  shotgun: { cat: 'weapon', name: 'Shotgun', price: 3500, minLevel: 3, power: 0.42, heat: 18, ranged: true,
    desc: 'Grote klap op korte afstand.' },
  uzi: { cat: 'weapon', name: 'Uzi', price: 5200, minLevel: 4, power: 0.5, heat: 22, ranged: true,
    desc: 'Veel lood, weinig precisie.' },

  // ---------- Diensten ----------
  ehbo: { cat: 'service', name: 'EHBO-doos', price: 120, consumable: true, heal: 35,
    desc: 'Verbind je wonden, ook tijdens een achtervolging (+35).' },
  advocaat: { cat: 'service', name: 'Advocaat (retainer)', price: 6000, minLevel: 3, consumable: true, saveFromJail: true,
    desc: 'Mr. Van Dam haalt je één keer uit de bak.' },
};
