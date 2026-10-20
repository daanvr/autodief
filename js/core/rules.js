// =============================================================
//  REGELS: alle kansberekeningen en prijzen op één plek.
//  Pas de formules hier aan; de getallen staan in settings.js.
// =============================================================
window.AD = window.AD || {};

(function () {
  const R = AD.rules = {};
  const C = () => AD.SETTINGS;
  const S = () => AD.state.S;

  R.clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- Bezit ----------
  R.owned = function (cat) {
    return Object.keys(S().inv)
      .filter(id => S().inv[id] > 0 && AD.ITEMS[id] && (!cat || AD.ITEMS[id].cat === cat))
      .map(id => ({ id, def: AD.ITEMS[id] }));
  };
  R.has = id => (S().inv[id] || 0) > 0;
  R.radar = () => R.owned('gadget').reduce((m, it) => Math.max(m, it.def.radar || 0), 0);
  R.gadgetSum = prop => R.owned('gadget').reduce((s, it) => s + (it.def[prop] || 0), 0);
  R.gadgetMult = prop => R.owned('gadget').reduce((m, it) => m * (it.def[prop] || 1), 1);
  R.weapons = () => R.owned('weapon');
  R.rangedWeapons = () => R.weapons().filter(w => w.def.ranged);

  // ---------- Crew ----------
  R.crewBonus = function (key) {
    return S().crew.reduce((s, m) => s + ((AD.CREW_ROLES[m.role].bonus || {})[key] || 0) * m.skill, 0);
  };
  R.crewShooters = () => S().crew.filter(m => AD.CREW_ROLES[m.role].shooter);
  R.crewFirepower = () => R.crewShooters().reduce((s, m) => s + AD.CREW_ROLES[m.role].shooter * m.skill, 0);
  R.crewCut = () => R.clamp(S().crew.reduce((s, m) => s + m.cut, 0), 0, 0.6);

  R.skill = name => S().skills[name] * C().skillPerPoint;

  // ---------- Inbreken & starten ----------
  R.toolPower = (tool, car) => (tool.mech || 0) * (1 - car.tech) + (tool.elec || 0) * car.tech;

  R.breakinChance = function (car, toolId) {
    const b = C().breakin;
    return R.clamp(b.base - car.security + R.toolPower(AD.ITEMS[toolId], car)
      + R.skill('inbreken') + R.crewBonus('inbreken'), b.min, b.max);
  };
  R.alarmChance = function (car, toolId, success) {
    const t = AD.ITEMS[toolId];
    return R.clamp(car.alarm + (t.noise || 0) + (success ? 0 : C().breakin.failAlarmBonus)
      + R.crewBonus('alarm') - S().skills.inbreken * 0.01, 0.01, 0.95);
  };
  R.bestStarter = function (car) {
    let best = null, bp = 0;
    R.owned('starter').forEach(it => { const p = R.toolPower(it.def, car); if (p > bp) { bp = p; best = it; } });
    return best;
  };
  R.startChance = function (car, penalty) {
    const st = R.bestStarter(car), c = C().start;
    return R.clamp(c.base - car.immobilizer + (st ? R.toolPower(st.def, car) : 0)
      + R.skill('inbreken') * 0.8 - (penalty || 0), c.min, c.max);
  };

  // ---------- Politie ----------
  R.heatMult = () => R.gadgetMult('heatMult');
  R.noticeChance = function (car, district) {
    const n = C().notice;
    const p = (n.base + district.police * n.policeWeight + S().heat * n.heatWeight + car.tier * n.perTier)
      * R.gadgetMult('noticeMult') + R.crewBonus('notice');
    return R.clamp(p, 0.02, 0.9);
  };
  R.patrolChance = function (run) {
    return R.clamp(C().street.patrolBase + run.district.police * 0.1 + S().heat * 0.0015
      + run.suspicion * 0.003 + R.crewBonus('patrol'), 0.01, 0.5);
  };
  R.pressure = function (ctx) {
    return ctx.run.district.police + S().heat / 200 + (ctx.chase.units - 1) * 0.06;
  };

  // ---------- Keuzes ----------
  R.statBonus = function (stat, ctx) {
    const s = S(), sp = C().skillPerPoint;
    const inst = ctx && ctx.car, car = inst ? AD.carDef(inst.id) : null;
    const cond = inst ? inst.condition : 1;
    switch (stat) {
      case 'rijden': return s.skills.rijden * sp + R.crewBonus('rijden');
      case 'speed': return car ? (car.speed - 0.5) * 0.6 * (0.6 + 0.4 * cond) + s.skills.rijden * sp * 0.6 + R.crewBonus('rijden') * 0.6 : 0;
      case 'handling': return car ? (car.handling - 0.5) * 0.6 + s.skills.rijden * sp + R.crewBonus('rijden') : 0;
      case 'durability': return car ? (car.durability - 0.5) * 0.6 + (cond - 0.7) * 0.3 + s.skills.rijden * sp * 0.4 : 0;
      case 'rennen': return s.skills.rennen * sp + R.gadgetSum('foot') + R.crewBonus('rennen') + (s.health - 100) / 400;
      case 'gladheid': return s.skills.gladheid * sp;
      case 'schieten': return s.skills.schieten * sp + R.crewBonus('schieten');
      case 'vechten': return s.skills.schieten * sp * 0.5 + R.crewBonus('vechten');
      case 'move': return ctx && ctx.chase && ctx.chase.mode === 'car' ? R.statBonus('speed', ctx) : R.statBonus('rennen', ctx);
      default: return 0;
    }
  };
  R.choiceChance = function (spec, ctx) {
    if (spec == null) return 1;
    if (typeof spec === 'number') return spec;
    let p = spec.b + R.statBonus(spec.s, ctx) * (spec.w == null ? 1 : spec.w) + (spec.h || 0) * S().heat;
    if (ctx && ctx.chase) p -= R.pressure(ctx) * C().chase.pressurePenalty;
    return R.clamp(p, 0.03, 0.97);
  };

  // Voorsprong die je elke ronde wint/verliest los van je keuze, per onderdeel
  R.driftParts = function (ctx) {
    const c = C().chase, p = R.pressure(ctx);
    const parts = { politie: -p * c.pressureWeight, momentum: (ctx.chase.distance - 50) * (c.momentum || 0) };
    if (ctx.chase.mode === 'car') {
      const car = AD.carDef(ctx.car.id);
      parts.snelheid = (car.speed - 0.5) * c.driftSpeed * ctx.car.condition * 1.4;
      parts.rijden = R.statBonus('rijden', ctx) * 20;
    } else {
      parts.tempo = 2;
      parts.conditie = R.statBonus('rennen', ctx) * 25;
    }
    return parts;
  };
  R.drift = ctx => Object.values(R.driftParts(ctx)).reduce((a, b) => a + b, 0);

  // ---------- Inbraak-scène ----------
  R.patrolEta = function (run) {
    const c = C().scene;
    const eta = c.patrolEtaBase - run.district.police * c.patrolEtaPolice - S().heat * c.patrolEtaHeat
      + (run.policeBusy ? 5 : 0) - R.crewBonus('patrol') * 30;
    return Math.max(c.patrolEtaMin, eta + (Math.random() * 3 - 1.5));
  };
  // Kans dat één omstander je opmerkt tijdens een actie van 'min' minuten
  R.noticeP = function (b, sp, extraNoise, min) {
    if (b.state === 'weg' || b.state === 'belt') return 0;
    const att = Math.min(100, sp.attention + (extraNoise || 0));
    return R.clamp(b.call * sp.see * (0.1 + att / 100) * (min / 1.5) * (b.state === 'kijkt' ? 2 : 1), 0, 0.95);
  };
  // Kans dat het tijdens deze actie misgaat (iemand belt, of de politie komt langs en ziet je)
  R.actionRisk = function (sp, min, noise) {
    if (!sp) return 0;
    let calm = 1;
    sp.by.forEach(b => { calm *= 1 - R.noticeP(b, sp, noise, min) * C().scene.callShare; });
    let pPolice = 0;
    if (sp.eta - min <= 0) pPolice = sp.called ? 1 : R.clamp(0.15 + (sp.attention + noise) / 100 * 0.7, 0, 0.95);
    return R.clamp(1 - calm * (1 - pPolice), 0, 1);
  };
  R.actionNoise = (minutes, toolNoise) => minutes * C().scene.noisePerMinute + (toolNoise || 0) * C().scene.toolNoise;
  // Hoe ver de politie nog weg is (minuten) -> startvoorsprong achtervolging
  R.etaDistance = eta => Math.round(R.clamp(20 + eta * 12, 15, 75));

  // Geschatte pakkans tijdens een achtervolging (voor de radar)
  R.catchEstimate = function (ctx) {
    const d = ctx.chase.distance, p = R.pressure(ctx), dr = R.drift(ctx);
    return R.clamp(0.95 - d / 100 + p * 0.3 - dr * 0.02, 0.02, 0.98);
  };

  // ---------- Geld ----------
  R.sellPrice = function (inst, buyer) {
    const car = AD.carDef(inst.id);
    return Math.round(car.value * buyer.mult * (0.3 + 0.7 * inst.condition) * (1 + S().skills.gladheid * 0.03));
  };
  R.buyerBlock = function (inst, buyer) {
    const car = AD.carDef(inst.id);
    if (buyer.needCold && inst.hot) return 'Auto is nog heet: eerst overspuiten';
    if (buyer.minTier && car.tier < buyer.minTier) return 'Alleen tier ' + buyer.minTier + '+';
    if (buyer.minCondition && inst.condition < buyer.minCondition) return 'Staat te slecht (min ' + Math.round(buyer.minCondition * 100) + '%)';
    return null;
  };
  R.repairCost = inst => Math.round(AD.carDef(inst.id).value * (1 - inst.condition) * C().repairFactor);
  R.resprayCost = inst => Math.round(C().resprayBase + AD.carDef(inst.id).value * C().resprayFactor);
  R.xpForNext = level => Math.round(C().xp.base * Math.pow(C().xp.growth, level - 1));
})();
