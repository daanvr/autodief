// =============================================================
//  SPELSTAAT: alles wat bewaard wordt tussen sessies
// =============================================================
window.AD = window.AD || {};

(function () {
  const NR = AD.VERSION.nr;
  const keyFor = nr => 'autodief.save.v' + nr;
  const SAVE_KEY = keyFor(NR);
  const IMPORTED = 'autodief.imported.v' + NR;   // het potje van een oudere versie maar één keer overnemen
  const HISCORE_KEY = 'autodief.hiscore.v1';

  function store() { try { return window.localStorage; } catch (e) { return null; } }

  const ST = AD.state = {
    S: null,

    newGame() {
      const c = AD.SETTINGS;
      this.S = {
        version: NR,
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
      this.migrate();
      try { const ls = store(); if (ls) ls.setItem(IMPORTED, '1'); } catch (e) { }
      c.startItems.forEach(id => { this.S.inv[id] = 1; });
      AD.crewGen.refresh();
      return this.S;
    },

    // Vult velden aan die een potje uit een oudere versie nog niet heeft
    migrate() {
      const s = this.S;
      const defaults = { record: 0, cleanDays: 0, seen: {}, evCount: 0, skillXp: {}, toolUse: {}, modelUse: {}, armor: 0,
        districtHeat: {}, snitches: [], getaway: null };
      Object.keys(defaults).forEach(k => { if (s[k] == null) s[k] = defaults[k]; });
      (s.crew || []).concat(s.hires || []).forEach(m => AD.crewGen.complete(m));
      s.version = NR;
    },
    // Save van deze versie, of anders die van de nieuwste oudere versie
    findSave() {
      const ls = store(); if (!ls) return null;
      const own = ls.getItem(SAVE_KEY); if (own) return own;
      if (ls.getItem(IMPORTED)) return null;
      for (let n = NR - 1; n >= 1; n--) { const raw = ls.getItem(keyFor(n)); if (raw) return raw; }
      return null;
    },

    nextUid() { return this.S.uid++; },

    save() {
      const ls = store(); if (!ls || !this.S) return;
      try { ls.setItem(SAVE_KEY, JSON.stringify(this.S)); } catch (e) { /* vol of geblokkeerd */ }
    },
    load() {
      try {
        const raw = this.findSave(); if (!raw) return false;
        this.S = JSON.parse(raw); this.migrate(); this.save();
        store().setItem(IMPORTED, '1');
        return true;
      } catch (e) { return false; }
    },
    hasSave() {
      try { return !!this.findSave(); } catch (e) { return false; }
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
    // Ontbrekende eigenschappen invullen (oude potjes, nieuwe kandidaten)
    complete(m) {
      const d = { armor: 0, weapon: null, jobs: 0, loyalty: Math.round(AD.rng.range(0.35, 0.75) * 100) / 100, order: 'aanval' };
      Object.keys(d).forEach(k => { if (m[k] === undefined) m[k] = d[k]; });
      return m;
    },
    refresh() {
      const S = ST.S, rng = AD.rng;
      const roles = Object.keys(AD.CREW_ROLES).filter(r => AD.CREW_ROLES[r].minLevel <= S.level);
      S.hires = [];
      for (let i = 0; i < AD.SETTINGS.crew.poolSize; i++) {
        const roleId = rng.pick(roles), role = AD.CREW_ROLES[roleId];
        const skill = Math.round(rng.range(0.8, 1.25) * 100) / 100;
        S.hires.push(this.complete({
          uid: ST.nextUid(),
          name: rng.pick(AD.CREW_NAMES) + ' "' + rng.pick(AD.CREW_NICKS) + '"',
          role: roleId, skill, hp: 100,
          cost: Math.round(role.cost * skill * (1 + 0.15 * (S.level - 1)) / 10) * 10,
          cut: role.cut,
        }));
      }
    },
  };
})();
