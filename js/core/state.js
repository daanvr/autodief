// =============================================================
//  SPELSTAAT: alles wat bewaard wordt tussen sessies
// =============================================================
window.AD = window.AD || {};

(function () {
  const SAVE_KEY = 'autodief.save.v1';
  const HISCORE_KEY = 'autodief.hiscore.v1';

  function store() { try { return window.localStorage; } catch (e) { return null; } }

  const ST = AD.state = {
    S: null,

    newGame() {
      const c = AD.SETTINGS;
      this.S = {
        version: 1,
        money: c.startMoney, debt: c.debt.start, day: 1, heat: 0, health: c.health.max,
        xp: 0, level: 1, skillPoints: 0,
        skills: { inbreken: 0, rijden: 0, rennen: 0, gladheid: 0, schieten: 0 },
        inv: {},
        crew: [], hires: [],
        garage: { slots: c.garage.startSlots, cars: [] },
        stats: { stolen: 0, earned: 0, chases: 0, escapes: 0, best: 0 },
        won: false,
        uid: 1,
      };
      c.startItems.forEach(id => { this.S.inv[id] = 1; });
      AD.crewGen.refresh();
      return this.S;
    },

    nextUid() { return this.S.uid++; },

    save() {
      const ls = store(); if (!ls || !this.S) return;
      try { ls.setItem(SAVE_KEY, JSON.stringify(this.S)); } catch (e) { /* vol of geblokkeerd */ }
    },
    load() {
      const ls = store(); if (!ls) return false;
      try {
        const raw = ls.getItem(SAVE_KEY); if (!raw) return false;
        this.S = JSON.parse(raw); return true;
      } catch (e) { return false; }
    },
    hasSave() {
      const ls = store(); if (!ls) return false;
      try { return !!ls.getItem(SAVE_KEY); } catch (e) { return false; }
    },
    clearSave() {
      const ls = store(); if (!ls) return;
      try { ls.removeItem(SAVE_KEY); } catch (e) { }
    },

    hiscores() {
      const ls = store(); if (!ls) return [];
      try { return JSON.parse(ls.getItem(HISCORE_KEY) || '[]'); } catch (e) { return []; }
    },
    addHiscore(entry) {
      const list = this.hiscores(); list.push(entry);
      list.sort((a, b) => b.earned - a.earned);
      const top = list.slice(0, 5);
      const ls = store();
      if (ls) { try { ls.setItem(HISCORE_KEY, JSON.stringify(top)); } catch (e) { } }
      return top;
    },
  };

  // Crew-kandidaten in de kroeg
  AD.crewGen = {
    refresh() {
      const S = ST.S, rng = AD.rng;
      const roles = Object.keys(AD.CREW_ROLES).filter(r => AD.CREW_ROLES[r].minLevel <= S.level);
      S.hires = [];
      for (let i = 0; i < AD.SETTINGS.crew.poolSize; i++) {
        const roleId = rng.pick(roles), role = AD.CREW_ROLES[roleId];
        const skill = Math.round(rng.range(0.8, 1.25) * 100) / 100;
        S.hires.push({
          uid: ST.nextUid(),
          name: rng.pick(AD.CREW_NAMES) + ' "' + rng.pick(AD.CREW_NICKS) + '"',
          role: roleId, skill, hp: 100,
          cost: Math.round(role.cost * skill * (1 + 0.15 * (S.level - 1)) / 10) * 10,
          cut: role.cut,
        });
      }
    },
  };
})();
