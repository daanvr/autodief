// =============================================================
//  CREW
//  Rollen met bonussen. Elke crewlid krijgt een 'skill' (0.8 - 1.25)
//  die de bonus vermenigvuldigt. 'cut' = deel van elke verkoop.
//  Bonus-sleutels: inbreken, alarm, rijden, rennen, schieten, vechten,
//                  patrol (straatpatrouille-kans), notice (opvalkans)
//  shooter: vuurkracht in vuurgevechten
// =============================================================
window.AD = window.AD || {};

AD.CREW_ROLES = {
  chauffeur: { name: 'Chauffeur', cost: 600, cut: 0.10, minLevel: 1,
    bonus: { rijden: 0.10 }, desc: '+10% bij alles achter het stuur.', job: 'zit achter het stuur' },
  kraker: { name: 'Kraker', cost: 700, cut: 0.12, minLevel: 1,
    bonus: { inbreken: 0.08, alarm: -0.06 }, desc: '+8% openbreken, minder alarm.', job: 'helpt met sloten' },
  uitkijk: { name: 'Uitkijk', cost: 400, cut: 0.06, minLevel: 1,
    bonus: { patrol: -0.06, notice: -0.08 }, desc: 'Ziet de politie eerder aankomen.', job: 'staat op de uitkijk' },
  spierbundel: { name: 'Spierbundel', cost: 650, cut: 0.08, minLevel: 2,
    bonus: { vechten: 0.15 }, shooter: 0.12, desc: 'Sterk in een gevecht.', job: 'houdt mensen op afstand' },
  schutter: { name: 'Schutter', cost: 900, cut: 0.12, minLevel: 2,
    bonus: { schieten: 0.12 }, shooter: 0.25, desc: 'Schiet terug als het menens wordt.', job: 'dekt je met een wapen' },
};

AD.CREW_NAMES = ['Sjaak', 'Rinus', 'Fatima', 'Mo', 'Henk', 'Gerda', 'Kees', 'Yusuf', 'Bertje',
  'Priya', 'Dewi', 'Ruud', 'Ilse', 'Tarik', 'Joop', 'Annie', 'Sven', 'Noor', 'Dirkje', 'Bas'];
AD.CREW_NICKS = ['de Schroef', 'Vingervlug', 'Remweg', 'de Haai', 'Kogel', 'de Stille', 'Turbo',
  'de Lange', 'Knokkel', 'Flits', 'Smeerolie', 'Kwartje', 'de Mol', 'Spook'];

// Namen van de bonussen op het scherm. 'more: -1' = lager is beter.
AD.BONUS_NAMES = { inbreken: 'openbreken', alarm: 'alarmkans', rijden: 'rijden', rennen: 'rennen',
  schieten: 'schieten', vechten: 'vechten', patrol: 'patrouillekans', notice: 'opvallen in een gestolen auto' };
