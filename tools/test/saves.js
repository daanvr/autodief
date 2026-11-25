// Controleert dat een potje uit de vorige versie wordt overgenomen en dat oude saves onaangeroerd blijven.
require('./head.js');
const ok = (c, t) => { if (!c) { console.error('FOUT: ' + t); process.exitCode = 1; } else console.log('ok: ' + t); };
const N = AD.VERSION.nr, prev = 'autodief.save.v' + (N - 1), own = 'autodief.save.v' + N;
const old = { version: N - 1, money: 777, debt: 100, day: 5, heat: 10, health: 80, xp: 5, level: 2, skillPoints: 0,
  skills: { inbreken: 1, rijden: 0, rennen: 0, gladheid: 0, schieten: 0 }, inv: { schroevendraaier: 1 },
  crew: [{ uid: 3, name: 'Mo "x"', role: 'kraker', skill: 1, hp: 90, cut: 0.1, cost: 1 }], hires: [],
  garage: { slots: 1, cars: [] }, stats: { stolen: 1, earned: 1, chases: 0, escapes: 0, best: 0 }, won: false, uid: 9 };
localStorage.setItem(prev, JSON.stringify(old));
ok(AD.state.hasSave() && AD.state.load(), 'oud potje gevonden en geladen');
AD.engine.hub();
ok(AD.state.S.money === 777 && AD.state.S.crew[0].loyalty > 0 && AD.state.S.armor === 0, 'velden overgenomen en aangevuld');
ok(localStorage.getItem(prev) === JSON.stringify(old), 'oude save onaangeroerd');
ok(!!localStorage.getItem(own), 'nieuwe save gemaakt');
AD.state.clearSave();
ok(!AD.state.hasSave(), 'na game over komt de oude save niet terug');
