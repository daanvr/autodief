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
  { id: 'escape',  name: 'Vluchten',    desc: 'Spullen om de politie af te schudden (eenmalig).' },
  { id: 'armor',   name: 'Bescherming', desc: 'Voor jou en per crewlid te koop.' },
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
  lopers: { cat: 'tool', time: 1.6, name: 'Loper-set', price: 300,
    desc: 'Afgevijlde sleutels. Traag, maar muisstil.', mech: 0.17, elec: 0, noise: -0.1 },
  glasbreker: { cat: 'tool', time: 0.3, name: 'Glasbreker', price: 120,
    desc: 'Ruit eruit en klaar. Bliksemsnel, herrie, en de auto is minder waard.', mech: 0.3, elec: 0.22, noise: 0.3, carDamage: 0.08 },
  relaybox: { cat: 'tool', time: 0.4, name: 'Codegrabber', price: 5500, minLevel: 4,
    desc: 'Zelfbouw-kastje dat afstandsbedieningen naspeelt. Deur open én motor aan.', mech: 0.05, elec: 0.5, noise: -0.2, startsCar: true },

  // ---------- Starten ----------
  hotwirekit: { cat: 'starter', time: 1, name: 'Hotwire-kit', price: 250,
    desc: 'Kabeltjes en klemmen. Beter dan je tanden.', mech: 0.2, elec: 0.02 },
  sleuteltrekker: { cat: 'starter', time: 0.4, name: 'Slottrekker', price: 700,
    desc: 'Trekt het contactslot eruit. Snel bij oude auto\'s.', mech: 0.3, elec: 0 },
  obdprog: { cat: 'starter', time: 0.6, name: 'Startcomputer', price: 2800, minLevel: 3,
    desc: 'Uit een dealergarage "geleend". Praat met de startonderbreker.', mech: 0.05, elec: 0.5 },

  // ---------- Gadgets ----------
  scanner: { cat: 'gadget', name: 'Politiescanner', price: 400, radar: 1,
    desc: 'Luister mee: exacte kansen en hoeveel minuten de politie nog weg is.' },
  alarmklem: { cat: 'gadget', name: 'Alarmklem', price: 650, minLevel: 2, alarm: -0.1,
    desc: 'Klemt de claxon af: 10% minder kans op alarm.' },
  kniptang: { cat: 'gadget', name: 'Kniptang', price: 80,
    desc: 'Knip de telefooncel door: niemand in de straat kan nog bellen.' },
  radar: { cat: 'gadget', name: 'Politieradar', price: 2200, minLevel: 2, radar: 2,
    desc: 'Berekent je pakkans tijdens een achtervolging.' },
  satnav: { cat: 'gadget', name: 'Gestolen portofoon', price: 7000, minLevel: 4, radar: 3,
    desc: 'Je hoort elke eenheid die op je af komt, ook de helikopter.' },
  sneakers: { cat: 'gadget', name: 'Sportschoenen', price: 180, foot: 0.08,
    desc: '+8% bij rennen.' },
  bivak: { cat: 'gadget', name: 'Bivakmuts', price: 90, heatMult: 0.8,
    desc: 'Minder herkenbaar: 20% minder heat.' },
  platen: { cat: 'gadget', name: 'Valse kentekenplaten', price: 900, minLevel: 2, noticeMult: 0.6,
    desc: 'Politie let 40% minder op je gestolen auto.' },

  // ---------- Wapens ----------
  knuppel: { cat: 'weapon', name: 'Honkbalknuppel', price: 200, power: 0.15, heat: 6, ranged: false,
    desc: 'Voor van dichtbij. Sterk tegen één agent.', stun: true },
  taser: { cat: 'weapon', name: 'Stroomstootwapen', price: 600, power: 0.3, heat: 4, ranged: false, stun: true,
    desc: 'Legt één agent even plat, zodat je weg kunt rennen. Weinig heat.' },
  pistool: { cat: 'weapon', name: 'Pistool', price: 1500, minLevel: 2, power: 0.32, heat: 14, ranged: true,
    desc: 'Klein, betrouwbaar. Je kunt terugschieten.' },
  shotgun: { cat: 'weapon', name: 'Shotgun', price: 3500, minLevel: 3, power: 0.42, heat: 18, ranged: true,
    desc: 'Grote klap op korte afstand.' },
  uzi: { cat: 'weapon', name: 'Uzi', price: 5200, minLevel: 4, power: 0.5, heat: 22, ranged: true,
    desc: 'Veel lood, weinig precisie.' },

  // ---------- Vluchten (eenmalig; escape = keuze tijdens een achtervolging) ----------
  kraaienpoten: { cat: 'escape', name: 'Kraaienpoten', price: 150, consumable: true,
    desc: 'Uit het raam strooien: lekke banden voor de politie.',
    escape: { modes: ['car'], label: 'Kraaienpoten uit het raam', c: { b: 0.8 },
      ok: { gain: [22, 32], units: -1, text: 'Pang! Pang! De voorste politiewagen slingert op zijn velgen.' }, fail: { gain: [2, 6], text: 'Ze sturen er net omheen.' } } },
  motorolie: { cat: 'escape', name: 'Jerrycan motorolie', price: 70, consumable: true,
    desc: 'Een glad spoor achter je auto.',
    escape: { modes: ['car'], label: 'Motorolie lozen', c: { b: 0.65, s: 'rijden', w: 0.8 },
      ok: { gain: [16, 24], text: 'De politiewagen draait een rondje om zijn as.' }, fail: { loss: [2, 5], text: 'De olie loopt vooral over je eigen schoenen.' } } },
  rookbom: { cat: 'escape', name: 'Rookbom', price: 200, consumable: true,
    desc: 'Werkt rennend, rijdend en midden in een gevecht.',
    escape: { modes: ['car', 'foot'], label: 'Rookbom', c: { b: 0.85 },
      ok: { gain: [24, 34], text: 'Een dikke witte wolk. Ze zien geen hand voor ogen.' }, fail: { gain: [4, 8], text: 'De wind blaast de rook de verkeerde kant op.' } } },
  pepperspray: { cat: 'escape', name: 'Pepperspray', price: 80, consumable: true,
    desc: 'Voor van dichtbij, als je te voet bent.',
    escape: { modes: ['foot'], label: 'Pepperspray', c: { b: 0.7, s: 'vechten', w: 0.5 },
      ok: { gain: [20, 28], heat: 2, text: 'De voorste agent grijpt naar zijn ogen.' }, fail: { loss: [4, 8], text: 'Tegenwind. Nu prikken jouw ogen ook.' } } },
  vermomming: { cat: 'escape', name: 'Pet en andere jas', price: 110, consumable: true,
    desc: 'Omkleden in een portiek en rustig weglopen.',
    escape: { modes: ['foot'], label: 'Omkleden in een portiek', c: { b: 0.35, s: 'gladheid', w: 1.5 },
      ok: { end: 'escape', text: 'Andere jas, pet op. Ze rennen je straal voorbij: ze hebben alleen een signalement van je oude jas.' }, fail: { loss: [10, 16], text: 'Halverwege de mouw staan ze voor je neus.' } } },

  // ---------- Bescherming (per persoon, punten vangen klappen op) ----------
  leer: { cat: 'armor', name: 'Leren jas', price: 150, armor: 15, desc: 'Vangt 15 schade op.' },
  vest: { cat: 'armor', name: 'Kogelvest', price: 900, armor: 40, minLevel: 2, desc: 'Vangt 40 schade op.' },
  zwaarvest: { cat: 'armor', name: 'Zwaar vest', price: 2400, armor: 75, minLevel: 4, desc: 'Vangt 75 schade op.' },

  // ---------- Diensten ----------
  ehbo: { cat: 'service', name: 'EHBO-doos', price: 120, consumable: true, heal: 35,
    desc: 'Verbind je wonden, ook tijdens een achtervolging (+35).' },
  advocaat: { cat: 'service', name: 'Advocaat (retainer)', price: 6000, minLevel: 3, consumable: true, saveFromJail: true,
    desc: 'Mr. Van Dam haalt je één keer uit de bak.' },
};
