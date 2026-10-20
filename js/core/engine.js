// =============================================================
//  ENGINE: de spelflow. Elk scherm is een functie die
//  - een scène kiest (AD.scene)
//  - tekstregels + keuzes naar de UI stuurt (AD.ui.render)
//  Keuzes: { label, icon?, spot?, chance?, odds: exact|vague|none, hint?, disabled?, reason?, act }
// =============================================================
window.AD = window.AD || {};

(function () {
  const E = AD.engine = {};
  const R = AD.rules, rng = AD.rng;
  const C = () => AD.SETTINGS;
  const S = () => AD.state.S;
  let run = null;               // de huidige nacht op straat
  E.run = () => run;

  const fmt = n => '€' + Math.round(n).toLocaleString('nl-NL');
  const pct = p => Math.round(p * 100) + '%';
  const def = inst => AD.carDef(inst.id);
  const L = (t, c) => ({ t, c });

  function ui(o) { AD.ui.render(o); }
  function scene(name, p) { AD.scene.set(name, p || {}); }
  function ctx() { return { run, chase: run && run.chase, car: run && run.car }; }

  // ---------- Staat aanpassen ----------
  function addHeat(n) { const s = S(); s.heat = R.clamp(s.heat + (n > 0 ? n * R.heatMult() : n), 0, C().heat.max); }
  function addMoney(n) { const s = S(); s.money = Math.max(0, s.money + n); if (n > 0) s.stats.earned += n; }
  function hurt(n) { const s = S(); s.health = R.clamp(s.health - n, 0, C().health.max); }
  function addXp(n, lines) {
    const s = S(); s.xp += n;
    while (s.xp >= R.xpForNext(s.level)) {
      s.xp -= R.xpForNext(s.level); s.level++; s.skillPoints++;
      if (lines) lines.push(L(`LEVEL UP! Je bent nu level ${s.level}. Je hebt een vaardigheidspunt te besteden.`, 'good'));
      AD.sfx.levelup();
    }
  }
  function tpl(str, extra) {
    return String(str).replace(/\{(\w+)\}/g, (m, k) => {
      if (extra && extra[k] != null) return extra[k];
      if (k === 'car') return run && run.car ? def(run.car).name : 'auto';
      if (k === 'district') return run ? run.district.name : '';
      return m;
    });
  }
  const evText = ev => {
    let t = typeof ev.text === 'function' ? ev.text(ctx()) : ev.text;
    if (Array.isArray(t)) t = rng.pick(t);
    return tpl(t);
  };

  // Uitkomst van een keuze toepassen (zie events.js voor de velden)
  function apply(o, lines, extra) {
    extra = Object.assign({}, extra);
    if (o.money) { const m = rng.roll(o.money); addMoney(m); extra.money = fmt(Math.abs(m)); }
    if (o.text) lines.push(L(tpl(o.text, extra), o.cls || null));
    if (o.heat) addHeat(o.heat);
    if (o.hurt) { const h = rng.roll(o.hurt); if (h > 0) { hurt(h); lines.push(L(`Je bent gewond: -${h} gezondheid.`, 'bad')); AD.sfx.hit(); } }
    if (o.susp && run) run.suspicion = Math.max(0, run.suspicion + o.susp);
    if (o.tip && run) run.tip = true;
    if (o.give) S().inv[o.give] = (S().inv[o.give] || 0) + 1;
    if (run && run.chase) {
      const ch = run.chase;
      if (o.gain) ch.distance += rng.roll(o.gain);
      if (o.loss) ch.distance -= rng.roll(o.loss);
      if (o.units) ch.units = Math.max(1, ch.units + o.units);
    }
    if (o.damage && run && run.car) {
      const d = rng.roll(o.damage);
      run.car.condition = Math.max(0, run.car.condition - d / 100);
      lines.push(L(`Schade: -${d}%. De ${def(run.car).name} staat nog op ${pct(run.car.condition)}.`, 'bad'));
      AD.sfx.crash();
    }
    if (o.crewHit && S().crew.length) {
      const m = rng.pick(S().crew), d = rng.roll(o.crewHit);
      m.hp -= d;
      if (m.hp <= 0) { S().crew = S().crew.filter(x => x !== m); lines.push(L(`${m.name} is zwaar geraakt en blijft achter.`, 'bad')); }
      else lines.push(L(`${m.name} is geraakt (-${d}).`, 'bad'));
    }
  }

  // Kies een gebeurtenis: gewogen, per wijk, en recent geziene dingen komen minder snel terug
  function pickEvent(pool, avoid) {
    const s = S(); s.seen = s.seen || {}; s.evCount = s.evCount || 0;
    const skip = id => avoid && (avoid instanceof Set ? avoid.has(id) : avoid === id);
    const ok = e => e.weight !== 0 && (!e.when || e.when(ctx())) && !skip(e.id)
      && (!e.districts || !run || e.districts.includes(run.district.id));
    let list = pool.filter(ok);
    if (!list.length) list = pool.filter(e => e.weight !== 0 && (!e.when || e.when(ctx())));
    if (!list.length) list = pool;
    const weight = e => {
      const base = e.weight == null ? 1 : e.weight;
      const last = s.seen[e.id], cd = e.cooldown || 12;
      const recency = last == null ? 1 : Math.min(1, Math.pow((s.evCount - last) / cd, 2));
      return Math.max(0.0001, base * recency);
    };
    const ev = rng.weighted(list, weight);
    s.seen[ev.id] = s.evCount++;
    return ev;
  }
  const eventById = id => Object.keys(AD.EVENTS).reduce((f, k) => f || AD.EVENTS[k].find(e => e.id === id), null);


  // Keuze uit events.js omzetten naar een UI-keuze
  function eventChoice(x, odds, onDone) {
    const p = x.c ? R.choiceChance(x.c, ctx()) : null;
    return {
      label: tpl(x.label, x.extra), icon: x.icon, hint: x.hint,
      chance: p, odds: p == null ? 'none' : odds,
      act: () => {
        const ok = p == null || rng.chance(p);
        const o = ok ? x.ok : (x.fail || x.ok);
        const out = [L('> ' + tpl(x.label, x.extra), 'dim')];
        if (x.sfx) AD.sfx[x.sfx]();
        apply(o, out, x.extra);
        onDone(o, out, ok);
      },
    };
  }

  // ---------- Teksthulpjes ----------
  function heatText(h) {
    if (h < 1) return 'Niemand kent je.';
    if (h < 25) return 'Een paar agenten kennen je gezicht.';
    if (h < 50) return 'Je staat op de radar van de politie.';
    if (h < 75) return 'De politie zoekt actief naar je.';
    return 'Je gezicht hangt op elk bureau. Het is link.';
  }
  function levelWord(v) { return v < 0.2 ? 'zwak' : v < 0.45 ? 'matig' : v < 0.7 ? 'sterk' : 'zeer sterk'; }
  function distanceText(d) {
    if (d < 20) return 'Ze zitten op je bumper!';
    if (d < 40) return 'Ze zitten dicht achter je.';
    if (d < 65) return 'Je hebt wat voorsprong.';
    return 'Je bent ze bijna kwijt.';
  }

  // =============================================================
  //  TITEL & INTRO
  // =============================================================
  E.title = function () {
    run = null; AD.sfx.stopLoops(); AD.scene.overlay(null);
    scene('title');
    const hs = AD.state.hiscores();
    const lines = [
      L('Een stad vol auto\'s. Jij hebt een schroevendraaier, en een flinke schuld bij de Baas.'),
      L('Steel, verkoop, koop beter gereedschap. Maar laat je niet pakken: in de bak is het game over.', 'dim'),
    ];
    if (hs.length) {
      lines.push(L('TOPSCORES', 'info'));
      hs.forEach((h, i) => lines.push(L(`${i + 1}. ${fmt(h.earned)} verdiend, ${h.stolen} auto's, dag ${h.day} (${h.end})`, 'dim')));
    }
    const ch = [];
    if (AD.state.hasSave()) ch.push({ label: 'Doorgaan', act: () => { if (AD.state.load()) E.hub([L('Welkom terug.', 'dim')]); else E.title(); } });
    ch.push({ label: 'Nieuw spel', act: () => { AD.state.clearSave(); AD.state.newGame(); E.intro(); } });
    ui({ view: 'title', title: 'AUTODIEF', clear: true, lines, choices: ch });
  };

  E.intro = function () {
    scene('hub');
    ui({
      view: 'hub', title: 'Dag 1', clear: true, lines: [
        L(`De Baas heeft je ooit uit de nesten gehaald. Nu sta je bij hem in het krijt: ${fmt(S().debt)}.`),
        L('"Steel auto\'s. Verkoop ze. Betaal me terug. En als je gepakt wordt, ken ik je niet."'),
        L('Tip: begin in de Arbeiderswijk. Oude barrels, slechte sloten, weinig politie.', 'info'),
      ], choices: [{ label: 'Aan de slag', act: () => E.hub() }],
    });
  };

  // =============================================================
  //  SCHUILPLAATS (HUB)
  // =============================================================
  E.hub = function (pre) {
    run = null; AD.sfx.stopLoops(); AD.scene.overlay(null);
    const s = S(), c = C();
    AD.state.save();
    scene('hub');
    const lines = (pre || []).slice();
    lines.push(L(`Dag ${s.day}, je schuilplaats. ${heatText(s.heat)}`, 'dim'));
    const lieCost = c.heat.lieLowCost;
    const ch = [
      { label: 'Op pad: kies een wijk', spot: 'wijk', icon: 'loc_wijk', act: E.districts },
      { label: 'Winkel van Ome Gerrit', spot: 'winkel', icon: 'loc_winkel', act: () => E.shop() },
      { label: `Garage (${s.garage.cars.length}/${s.garage.slots})`, spot: 'garage', icon: 'loc_garage', act: () => E.garage() },
      { label: 'Kroeg: crew inhuren', spot: 'kroeg', icon: 'loc_kroeg', act: () => E.bar() },
      { label: 'De Baas', spot: 'baas', icon: 'loc_baas', hint: `Schuld: ${fmt(s.debt)}`, act: () => E.boss() },
    ];
    if (s.health < c.health.max) ch.push({ label: 'Louche dokter', spot: 'dokter', icon: 'loc_dokter', hint: `${fmt((c.health.max - s.health) * c.health.doctorCostPerHp)} voor volledig herstel`, act: () => E.doctor() });
    if (s.skillPoints > 0) ch.push({ label: `Vaardigheden (${s.skillPoints} punt${s.skillPoints > 1 ? 'en' : ''})`, spot: 'skill', icon: 'loc_skill', act: () => E.skills() });
    ch.push({ label: `Onderduiken: 1 dag (${fmt(lieCost)})`, spot: 'huis', icon: 'loc_huis', hint: `Heat -${c.heat.lieLowDecay + c.heat.decayPerDay}`, disabled: s.money < lieCost, reason: 'Te weinig geld', act: () => E.lieLow() });
    ch.push({ label: 'Opslaan en stoppen', act: () => { AD.state.save(); E.title(); } });
    ui({ view: 'hub', title: `Dag ${s.day}: schuilplaats`, clear: true, lines, choices: ch });
  };

  function nextDay(lines, extraDecay) {
    const s = S(), c = C();
    s.day++;
    s.money = Math.max(0, s.money - c.rentPerDay);
    addHeat(-(c.heat.decayPerDay + (extraDecay || 0)));
    s.health = Math.min(c.health.max, s.health + c.health.regenPerDay);
    s.crew.forEach(m => { m.hp = Math.min(100, m.hp + 25); });
    if (c.debt.interestPerDay && s.debt > 0) s.debt = Math.round(s.debt * (1 + c.debt.interestPerDay));
    AD.crewGen.refresh();
    lines.push(L(`Dag ${s.day}. Huur betaald: ${fmt(c.rentPerDay)}.`, 'dim'));
  }

  E.goHome = function (pre) {
    const lines = (pre || []).slice();
    lines.push(L('Je glipt terug naar je schuilplaats en slaapt tot de middag.', 'dim'));
    nextDay(lines);
    E.hub(lines);
  };

  E.lieLow = function () {
    const s = S(), c = C();
    s.money -= c.heat.lieLowCost;
    const lines = [L('Je blijft een dag binnen. Gordijnen dicht, telefoon uit.', 'dim')];
    nextDay(lines, c.heat.lieLowDecay);
    E.hub(lines);
  };

  E.doctor = function () {
    const s = S(), c = C(), per = c.health.doctorCostPerHp;
    const need = c.health.max - s.health;
    const afford = Math.min(need, Math.floor(s.money / per));
    const lines = [L('Dokter Kwak werkt in een achterkamertje. Geen vragen, geen verzekering.', 'dim')];
    const ch = [];
    ch.push({ label: `Volledig oplappen (${fmt(need * per)})`, icon: 'ehbo', disabled: s.money < need * per, reason: 'Te weinig geld',
      act: () => { s.money -= need * per; s.health = c.health.max; AD.sfx.cash(); E.hub([L('Hechtingen erin, pijnstillers mee. Als nieuw.', 'good')]); } });
    if (afford > 0 && afford < need) ch.push({ label: `Deels oplappen: +${afford} (${fmt(afford * per)})`, icon: 'ehbo',
      act: () => { s.money -= afford * per; s.health += afford; AD.sfx.cash(); E.hub([L('Een snelle pleister.', 'good')]); } });
    if (R.has('ehbo')) ch.push({ label: 'Zelf je EHBO-doos gebruiken', icon: 'ehbo',
      act: () => { s.inv.ehbo--; s.health = Math.min(c.health.max, s.health + AD.ITEMS.ehbo.heal); E.hub([L('Je verbindt je wonden zelf.', 'good')]); } });
    ch.push({ label: 'Terug', act: () => E.hub() });
    scene('hub');
    ui({ view: 'hub', title: 'Louche dokter', clear: true, lines, choices: ch });
  };

  E.boss = function (pre) {
    const s = S();
    scene('hub');
    const lines = (pre || []).slice();
    if (s.debt <= 0) lines.push(L('"We staan quitte. Maar als je nog eens werk zoekt..."', 'good'));
    else lines.push(L(`De Baas telt zijn geld. "Je bent me nog ${fmt(s.debt)} schuldig."`));
    const ch = [];
    [1000, 5000, 20000].forEach(a => {
      if (s.debt > a) ch.push({ label: `${fmt(a)} afbetalen`, icon: 'loc_baas', disabled: s.money < a, reason: 'Te weinig geld', act: () => pay(a) });
    });
    if (s.debt > 0) {
      const all = Math.min(s.debt, s.money);
      ch.push({ label: s.money >= s.debt ? `Alles aflossen (${fmt(s.debt)})` : `Alles wat je hebt (${fmt(all)})`, icon: 'loc_baas', disabled: all <= 0, reason: 'Je hebt niks', act: () => pay(all) });
    }
    ch.push({ label: 'Terug', act: () => E.hub() });
    ui({ view: 'hub', title: 'De Baas', clear: true, lines, choices: ch });

    function pay(a) {
      s.money -= a; s.debt -= a; AD.sfx.cash();
      if (s.debt <= 0 && !s.won) { s.won = true; return E.victory(); }
      E.boss([L(`De Baas pakt ${fmt(a)} aan zonder te tellen.`, 'good')]);
    }
  };

  E.victory = function () {
    const s = S();
    AD.state.addHiscore({ earned: s.stats.earned, stolen: s.stats.stolen, day: s.day, end: 'schuld afbetaald' });
    AD.state.save();
    scene('title');
    ui({ view: 'hub', title: 'VRIJ!', clear: true, lines: [
      L(`Je hebt je schuld afbetaald op dag ${s.day}. De Baas schudt je de hand.`, 'good'),
      L(`${s.stats.stolen} auto's gestolen, ${fmt(s.stats.earned)} verdiend.`, 'info'),
      L('Je kunt stoppen... of doorgaan en een legende worden.', 'dim'),
    ], choices: [{ label: 'Doorgaan', act: () => E.hub() }, { label: 'Titelscherm', act: () => E.title() }] });
  };

  E.skills = function () {
    const s = S(), c = C();
    const info = {
      inbreken: ['Slotenkennis', 'Openbreken en starten'],
      rijden: ['Rijden', 'Alles achter het stuur'],
      rennen: ['Rennen', 'Te voet vluchten'],
      gladheid: ['Praatjes', 'Smoesjes, omkopen, betere prijzen'],
      schieten: ['Schieten', 'Vuurgevechten en vechten'],
    };
    const ch = Object.keys(info).map(k => ({
      label: `${info[k][0]} (${s.skills[k]}/${c.maxSkill})`, hint: info[k][1] + `: +${pct(c.skillPerPoint)} per punt`,
      disabled: s.skills[k] >= c.maxSkill, reason: 'Maximaal',
      act: () => { s.skills[k]++; s.skillPoints--; AD.sfx.levelup(); if (s.skillPoints > 0) E.skills(); else E.hub([L(`${info[k][0]} verbeterd.`, 'good')]); },
    }));
    ch.push({ label: 'Later', act: () => E.hub() });
    ui({ view: 'hub', title: 'Vaardigheden', clear: true, lines: [L(`Je hebt ${s.skillPoints} punt(en) te besteden.`)], choices: ch });
  };

  // =============================================================
  //  WINKEL
  // =============================================================
  E.shop = function (cat, pre) {
    const s = S();
    scene('shop');
    const lines = (pre || []).slice();
    if (!cat) {
      lines.push(L('Achter de toonbank staat Ome Gerrit. "Zeg het maar, jongen."'));
      const ch = AD.SHOP_CATS.map(c => ({ label: c.name, icon: 'cat_' + c.id, hint: c.desc, act: () => E.shop(c.id) }));
      ch.push({ label: 'Terug', act: () => E.hub() });
      return ui({ view: 'hub', title: 'Winkel', clear: true, lines, choices: ch });
    }
    const catDef = AD.SHOP_CATS.find(c => c.id === cat);
    lines.push(L(catDef.desc, 'dim'));
    const ch = Object.keys(AD.ITEMS).filter(id => AD.ITEMS[id].cat === cat && AD.ITEMS[id].price > 0).map(id => {
      const it = AD.ITEMS[id];
      const owned = s.inv[id] > 0 && !it.consumable;
      const locked = it.minLevel && s.level < it.minLevel;
      return {
        label: `${it.name}: ${fmt(it.price)}${it.consumable && s.inv[id] ? ` (je hebt ${s.inv[id]})` : ''}`,
        icon: id, hint: it.desc,
        disabled: owned || locked || s.money < it.price,
        reason: owned ? 'Heb je al' : locked ? `Vanaf level ${it.minLevel}` : 'Te weinig geld',
        act: () => { s.money -= it.price; s.inv[id] = (s.inv[id] || 0) + 1; AD.sfx.cash(); E.shop(cat, [L(`Gekocht: ${it.name}.`, 'good')]); },
      };
    });
    ch.push({ label: 'Andere afdeling', act: () => E.shop() });
    ch.push({ label: 'Terug', act: () => E.hub() });
    ui({ view: 'hub', title: 'Winkel: ' + catDef.name, clear: true, lines, choices: ch });
  };

  // =============================================================
  //  KROEG (CREW)
  // =============================================================
  E.bar = function (pre) {
    const s = S(), max = C().crew.maxSize;
    scene('bar');
    const lines = (pre || []).slice();
    lines.push(L(`In de rook van café De Gouden Sleutel zitten mensen die werk zoeken. Crew: ${s.crew.length}/${max}.`, 'dim'));
    const ch = s.hires.map(h => {
      const role = AD.CREW_ROLES[h.role];
      return {
        label: `Inhuren: ${h.name}, ${role.name} (${fmt(h.cost)})`, icon: 'role_' + h.role, portrait: h.uid,
        hint: `${role.desc} Kwaliteit ${Math.round(h.skill * 100)}%. Wil ${pct(h.cut)} van elke verkoop.`,
        disabled: s.crew.length >= max || s.money < h.cost, reason: s.crew.length >= max ? 'Crew is vol' : 'Te weinig geld',
        act: () => { s.money -= h.cost; s.crew.push(h); s.hires = s.hires.filter(x => x !== h); AD.sfx.cash(); E.bar([L(`${h.name} doet mee.`, 'good')]); },
      };
    });
    s.crew.forEach(m => ch.push({ label: `Ontslaan: ${m.name}`, icon: 'role_' + m.role, portrait: m.uid,
      act: () => { s.crew = s.crew.filter(x => x !== m); E.bar([L(`${m.name} pakt zijn jas en gaat.`, 'dim')]); } }));
    ch.push({ label: 'Terug', act: () => E.hub() });
    ui({ view: 'hub', title: 'Kroeg', clear: true, lines, choices: ch });
  };

  // =============================================================
  //  GARAGE
  // =============================================================
  E.garage = function (pre) {
    const s = S(), c = C();
    scene('garage', { cars: s.garage.cars, slots: s.garage.slots });
    const lines = (pre || []).slice();
    lines.push(L(s.garage.cars.length ? 'Je garage. Kies een auto.' : 'Je garage is leeg. Tijd om iets moois te stelen.', 'dim'));
    const ch = s.garage.cars.map(inst => {
      const car = def(inst);
      return { label: `${car.name}: ${pct(inst.condition)} ${inst.hot ? '(heet)' : '(koud)'}`, icon: 'car_' + inst.id,
        hint: `Tier ${car.tier}, marktwaarde ${fmt(car.value)}`, act: () => carMenu(inst.uid) };
    });
    if (s.garage.slots < c.garage.maxSlots) {
      const cost = c.garage.slotCost[s.garage.slots + 1];
      ch.push({ label: `Extra plek huren (${fmt(cost)})`, icon: 'loc_garage', disabled: s.money < cost, reason: 'Te weinig geld',
        act: () => { s.money -= cost; s.garage.slots++; AD.sfx.cash(); E.garage([L('Je huurt er een plek bij.', 'good')]); } });
    }
    ch.push({ label: 'Terug', act: () => E.hub() });
    ui({ view: 'hub', title: 'Garage', clear: true, lines, choices: ch });
  };

  function carMenu(uid, pre) {
    const s = S();
    const inst = s.garage.cars.find(x => x.uid === uid);
    if (!inst) return E.garage();
    const car = def(inst);
    scene('garage', { cars: s.garage.cars, slots: s.garage.slots, focus: uid });
    const lines = (pre || []).slice();
    lines.push(L(`${car.name}, tier ${car.tier}. Staat ${pct(inst.condition)}. ${inst.hot ? 'Heet: herkenbaar als gestolen.' : 'Overgespoten en koud.'}`));
    const rc = R.repairCost(inst), sc = R.resprayCost(inst), cut = R.crewCut();
    const ch = [];
    if (inst.condition < 1) ch.push({ label: `Repareren (${fmt(rc)})`, icon: 'svc_repair', disabled: s.money < rc, reason: 'Te weinig geld',
      act: () => { s.money -= rc; inst.condition = 1; AD.sfx.cash(); carMenu(uid, [L('Uitgedeukt en opgepoetst. Als nieuw.', 'good')]); } });
    if (inst.hot) ch.push({ label: `Overspuiten + nieuwe papieren (${fmt(sc)})`, icon: 'svc_spray', disabled: s.money < sc, reason: 'Te weinig geld',
      act: () => { s.money -= sc; inst.hot = false; inst.color = (inst.color + 1) % car.colors.length; AD.sfx.cash(); carMenu(uid, [L('Nieuwe kleur, nieuwe kentekens. Koud als ijs.', 'good')]); } });
    C().buyers.forEach(b => {
      const why = R.buyerBlock(inst, b), price = R.sellPrice(inst, b);
      ch.push({ label: `Verkopen aan ${b.name}: ${fmt(price * (1 - cut))}`, icon: 'buyer_' + b.id,
        hint: b.desc + (b.risk ? ` Risico: ${pct(b.risk)}.` : '') + (cut ? ` Crew krijgt ${pct(cut)}.` : ''),
        disabled: !!why, reason: why,
        act: () => { const out = []; sell(inst, b, out); s.garage.cars = s.garage.cars.filter(x => x.uid !== uid); E.garage(out); } });
    });
    ch.push({ label: 'Terug', act: () => E.garage() });
    ui({ view: 'hub', title: car.name, clear: true, lines, choices: ch, target: inst });
  }

  function sell(inst, buyer, out) {
    const s = S(), car = def(inst);
    if (buyer.risk && rng.chance(buyer.risk)) {
      out.push(L(`Douanecontrole bij de ${buyer.name}! Je laat de ${car.name} staan en verdwijnt in de menigte.`, 'bad'));
      addHeat(20); return false;
    }
    const price = R.sellPrice(inst, buyer), cutAmt = Math.round(price * R.crewCut());
    addMoney(price - cutAmt); AD.sfx.cash();
    s.stats.best = Math.max(s.stats.best, price);
    out.push(L(`${buyer.name} betaalt ${fmt(price)} voor de ${car.name}.${cutAmt ? ` Je crew krijgt ${fmt(cutAmt)}.` : ''}`, 'good'));
    return true;
  }

  // =============================================================
  //  OP STRAAT
  // =============================================================
  E.districts = function () {
    const s = S();
    const ch = AD.DISTRICTS.map(d => {
      const tiers = Object.keys(d.tierWeights);
      return {
        label: d.name, spot: d.id, icon: 'loc_wijk',
        hint: `${d.desc} Politie: ${levelWord(d.police)}. Auto's: tier ${tiers[0]}-${tiers[tiers.length - 1]}.`,
        disabled: s.level < d.minLevel, reason: `Vanaf level ${d.minLevel}`,
        act: () => startOuting(d),
      };
    });
    ch.push({ label: 'Terug', act: () => E.hub() });
    scene('map');
    ui({ view: 'hub', title: 'Kies een wijk', clear: true, lines: [L('Waar ga je vannacht op jacht?')], choices: ch });
  };

  function startOuting(d) {
    run = { district: d, step: 0, suspicion: 0, tip: false, car: null, chase: null, target: null, spot: null, alerted: false };
    E.street([L(`Je trekt je capuchon over je hoofd en loopt de ${d.name} in.`, 'dim')]);
  }

  const maxSteps = () => C().street.maxSteps;
  const streetTitle = () => `${run.district.name}: nacht ${Math.min(run.step, maxSteps())}/${maxSteps()}`;
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const fmtMin = m => (Math.round(m * 10) / 10).toString().replace('.', ',') + ' min';

  E.street = function (pre) {
    const lines = (pre || []).slice();
    run.step++; run.car = null; run.chase = null; run.target = null; run.spot = null; run.alerted = false;
    if (run.step > maxSteps()) {
      lines.push(L('De lucht kleurt grijs. Tijd om naar huis te gaan.', 'dim'));
      return E.goHome(lines);
    }
    run.suspicion += C().street.suspicionPerStep;
    if (rng.chance(R.patrolChance(run))) return streetEvent(pickEvent(AD.EVENTS.patrol), lines, true);
    if (rng.chance(C().street.eventChance)) return streetEvent(pickEvent(AD.EVENTS.street), lines, false);
    encounter(spawnCar(), lines);
  };

  function streetEvent(ev, lines, police) {
    scene('street', { district: run.district, phase: police ? 'patrol' : 'idle', seed: run.step });
    if (police) AD.sfx.radio();
    lines.push(L(evText(ev), police ? 'bad' : 'info'));
    const ch = ev.choices.filter(x => !x.req || x.req(ctx())).map(x => eventChoice(x, R.radar() >= 1 ? 'exact' : 'vague', (o, out) => {
      if (o.weather) run.weather = o.weather;
      if (o.dark) run.dark = true;
      if (o.policeBusy) run.policeBusy = true;
      if (o.crowd) run.crowd = (run.crowd || 0) + o.crowd;
      if (o.freeCar) { const inst = spawnCar(); inst.condition = 1; run.target = inst; run.spot = makeSpot(); scene('street', { district: run.district, target: inst, phase: 'open', seed: run.step, spot: run.spot }); return started(inst, out); }
      if (o.end === 'footChase') return E.footChase(o.dist || 40, out);
      if (o.end === 'arrest') return E.arrest(out);
      if (o.end === 'home') return E.goHome(out);
      if (S().health <= 0) return E.gameOver('wasted', out);
      ui({ view: 'street', title: streetTitle(), clear: true, lines: out, choices: [
        { label: 'Verder lopen', act: () => E.street() },
        { label: 'Naar huis', act: () => E.goHome() },
      ] });
    }));
    ui({ view: 'street', title: streetTitle(), clear: true, lines, choices: ch });
  }

  function spawnCar() {
    const d = run.district;
    const tiers = Object.keys(d.tierWeights).map(Number);
    let tier = rng.weighted(tiers, t => d.tierWeights[t]);
    if (run.tip) { tier = Math.min(5, tier + 1); run.tip = false; }
    const opts = AD.CARS.filter(c => c.tier === tier);
    const car = rng.pick(opts.length ? opts : AD.CARS);
    return { uid: AD.state.nextUid(), id: car.id, condition: Math.round(rng.range(0.7, 1) * 100) / 100,
      hot: true, color: rng.int(0, car.colors.length - 1) };
  }

  // ---------- De plek: licht, omstanders, aandacht, politie-ETA ----------
  function makeSpot() {
    const d = run.district;
    const places = AD.SPOTS.places.filter(p => !p.districts || p.districts.includes(d.id));
    const place = rng.weighted(places, p => p.weight || 1);
    const range = AD.SPOTS.crowd[d.id] || [0, 2];
    const n = R.clamp(rng.int(range[0], range[1]) + (place.crowd || 0) + (run.crowd || 0) - (run.weather === 'regen' ? 2 : 0), 0, 4);
    const pool = AD.SPOTS.bystanders.filter(b => !b.districts || b.districts.includes(d.id));
    const by = [];
    for (let i = 0; i < n; i++) {
      const free = pool.filter(x => !by.some(y => y.id === x.id));
      const b = rng.pick(free.length ? free : pool);
      by.push({ id: b.id, text: b.text, call: b.call, leaves: b.leaves, state: 'rustig' });
    }
    const see = place.see * (run.dark ? 0.6 : 1) * (run.weather === 'regen' ? 0.8 : 1);
    return { place, see, by, attention: 0, called: false, eta: R.patrolEta(run), minutes: 0, tries: 0 };
  }

  // Tijd laten verstrijken. Geeft 'police' terug als de politie er is.
  function tick(min, noise, lines) {
    const sp = run.spot; if (!sp) return null;
    const sc = C().scene;
    sp.minutes += min;
    sp.attention = R.clamp(sp.attention + noise, 0, 100);
    sp.by.forEach(b => {
      if (b.state === 'weg' || b.state === 'belt') return;
      if (rng.chance(R.noticeP(b, sp, 0, min))) {
        if (b.state === 'kijkt' || rng.chance(sc.callShare)) {
          b.state = 'belt';
          lines.push(L(`${cap(b.text)} heeft je **gezien** en **belt de politie**!`, 'bad'));
          if (!sp.called) { sp.called = true; sp.eta = Math.min(sp.eta, rng.range(sc.callEta[0], sc.callEta[1])); }
        } else {
          b.state = 'kijkt';
          sp.attention = Math.min(100, sp.attention + 8);
          lines.push(L(`${cap(b.text)} **kijkt** jouw kant op...`, 'bad'));
        }
      } else if (b.state === 'rustig' && rng.chance(R.clamp(b.leaves * min / 4, 0, 0.9))) {
        b.state = 'weg';
        lines.push(L(`${cap(b.text)} verdwijnt om de hoek.`, 'dim'));
      }
    });
    sp.eta -= min;
    if (sp.eta <= 0) {
      if (sp.called) { lines.push(L('Zwaailichten om de hoek. De **politie** is er!', 'bad')); return 'police'; }
      const pSee = R.clamp(0.1 + sp.attention / 100 * 0.7, 0, 0.95);
      if (rng.chance(pSee)) { lines.push(L('Een patrouillewagen draait de straat in en remt af. Ze hebben je **gezien**!', 'bad')); return 'police'; }
      lines.push(L('Een patrouillewagen rijdt langzaam voorbij... en verdwijnt weer. **Pfoe.**', 'info'));
      sp.eta = R.patrolEta(run) + 2;
      sp.attention = Math.max(0, sp.attention - 10);
    }
    AD.scene.update({ spot: sp });
    return null;
  }

  function etaWord(sp) {
    if (R.radar() >= 1) return `${sp.called ? 'Gemeld! ' : ''}politie over ~${fmtMin(Math.max(0, sp.eta))}`;
    if (sp.eta > 6) return sp.called ? 'Gemeld, politie nog ver weg' : 'politie ver weg';
    if (sp.eta > 3) return sp.called ? 'Gemeld, politie komt eraan' : 'patrouille in de buurt';
    return sp.called ? 'Gemeld, politie bijna hier!' : 'patrouille vlakbij';
  }
  function byText(sp) {
    const here = sp.by.filter(b => b.state !== 'weg');
    if (!here.length) return 'Er is niemand op straat.';
    return 'In de buurt: ' + here.map(b => b.text + (b.state === 'kijkt' ? ' (**kijkt**)' : b.state === 'belt' ? ' (**belt**)' : '')).join(', ') + '.';
  }

  function encounter(inst, lines) {
    run.target = inst;
    run.spot = makeSpot();
    const car = def(inst), sp = run.spot;
    scene('street', { district: run.district, target: inst, phase: 'approach', seed: run.step, spot: sp });
    lines.push(L(`Je loopt langs een **${car.name}** (tier ${car.tier}) ${sp.place.text}. Marktwaarde ongeveer **${fmt(car.value)}**.`));
    lines.push(L(`Slot: ${levelWord(car.security)}. Elektronica: ${levelWord(car.tech)}. Alarm: ${levelWord(car.alarm)}. Startonderbreker: ${levelWord(car.immobilizer)}.`, 'dim'));
    lines.push(L(byText(sp), 'info'));
    encounterView(inst, lines);
  }

  // Het keuzemenu bij een auto (wordt na elke actie opnieuw getoond)
  function encounterView(inst, lines) {
    const car = def(inst), sp = run.spot, b = C().breakin;
    AD.scene.update({ phase: 'approach', spot: sp });
    const ch = R.owned('tool').map(t => {
      const time = t.def.time * (1 + sp.tries * 0.3);
      const noise = R.actionNoise(time, t.def.noise);
      const p = R.clamp(R.breakinChance(car, t.id) - sp.tries * b.retryPenalty, b.min, b.max);
      const alarm = Math.min(0.95, R.alarmChance(car, t.id, true) + sp.tries * b.retryAlarmBonus);
      return {
        label: (sp.tries ? 'Opnieuw: ' : 'Openbreken met ') + t.def.name.toLowerCase(), icon: t.id, chance: p, odds: 'exact',
        hint: `${fmtMin(time)} · alarm ${pct(alarm)} · iemand ziet je: ${pct(R.actionRisk(sp, time, noise))}${t.def.startsCar ? ' · start ook de motor' : ''}`,
        act: () => breakin(inst, t.id),
      };
    });
    ch.sort((a, c) => c.chance - a.chance);
    if (sp.by.some(x => x.state !== 'weg') || sp.attention > 15) {
      const w = C().scene.waitTime;
      ch.push({ label: `Wachten tot de kust veilig is (${fmtMin(w)})`, icon: 'act_hide', hint: `Omstanders lopen misschien door, aandacht zakt · risico ${pct(R.actionRisk(sp, w, -15))}`,
        act: () => {
          const out = [L('> Je leunt tegen een muur en doet alsof je op iemand wacht.', 'dim')];
          sp.by.forEach(x => { if (x.state === 'rustig') x.leaves *= 1.6; });
          if (tick(w, -20, out) === 'police') return copsArrive(inst, out);
          out.push(L(byText(sp), 'info'));
          encounterView(inst, out);
        } });
    }
    ch.push({ label: sp.attention > 40 || sp.called ? 'Afhaken: rustig weglopen' : 'Doorlopen naar de volgende auto', icon: 'act_walk',
      act: () => walkAway(sp, []) });
    ch.push({ label: 'Naar huis', act: () => E.goHome() });
    ui({ view: 'street', title: streetTitle(), clear: true, lines, choices: ch, target: inst });
  }

  // Weglopen gaat bijna altijd goed; alleen als je al gezien bent kan iemand je volgen
  function walkAway(sp, out) {
    out.push(L('> Je stopt je gereedschap weg en loopt rustig de straat uit.', 'dim'));
    const watching = sp ? sp.by.filter(x => x.state === 'kijkt' || x.state === 'belt').length : 0;
    const p = sp ? R.clamp(watching * 0.12 + (sp.called && sp.eta < 1.5 ? 0.35 : 0) - R.statBonus('gladheid'), 0, 0.7) : 0;
    if (rng.chance(p)) {
      out.push(L('"Daar loopt hij!" Een agent stapt uit en komt op je af. **Rennen!**', 'bad'));
      return E.footChase(R.etaDistance(Math.max(1, sp.eta)) + 10, out);
    }
    if (sp && (sp.attention > 40 || sp.called)) { run.suspicion += 10; out.push(L('Niemand houdt je tegen. De buurt is wel alert.', 'good')); }
    E.street(out);
  }

  function breakin(inst, toolId) {
    const car = def(inst), tool = AD.ITEMS[toolId], b = C().breakin, sp = run.spot;
    const tries = sp.tries;
    const time = tool.time * (1 + tries * 0.3);
    const p = R.clamp(R.breakinChance(car, toolId) - tries * b.retryPenalty, b.min, b.max);
    const ok = rng.chance(p);
    const alarm = rng.chance(R.clamp(R.alarmChance(car, toolId, ok) + tries * b.retryAlarmBonus, 0, 0.95));
    sp.tries++;
    const lines = [L(`> Je zet je ${tool.name.toLowerCase()} op het slot van de ${car.name}... (${fmtMin(time)})`, 'dim')];
    AD.sfx.click();
    AD.scene.update({ phase: 'working' });
    const arrived = tick(time, R.actionNoise(time, tool.noise) + (ok ? 0 : 8), lines);
    if (alarm) return triggerAlarm(inst, lines, ok);
    if (arrived === 'police') return copsArrive(ok ? inst : null, lines);
    if (ok) {
      lines.push(L('Klik. De deur is **open**.', 'good'));
      if (rng.chance(b.ownerChance)) return owner(inst, lines);
      if (tool.startsCar) { lines.push(L('Het relay-kastje piept. De motor slaat aan. Geen draadje nodig.', 'good')); return started(inst, lines); }
      return opened(inst, 0, lines);
    }
    lines.push(L(`Het slot geeft niet mee. Aandacht: **${Math.round(sp.attention)}%**.`));
    encounterView(inst, lines);
  }

  // Alarm: iedereen kijkt, iemand belt, maar de politie is er nog niet
  function triggerAlarm(inst, lines, open) {
    const sp = run.spot, sc = C().scene;
    AD.sfx.alarm(); addHeat(C().heatGain.alarm);
    sp.attention = 100;
    sp.by.forEach(x => { if (x.state !== 'weg') x.state = x.state === 'belt' ? 'belt' : 'kijkt'; });
    if (!sp.called) { sp.called = true; sp.eta = Math.min(sp.eta, rng.range(sc.callEta[0] + 0.5, sc.callEta[1] + 1)); }
    lines.push(L(open ? 'De deur is open... maar het **ALARM** gaat af!' : 'Het **ALARM** gaat af!', 'bad'));
    lines.push(L(`Iemand heeft de politie gebeld. Je hebt nog even: ${etaWord(sp)}.`, 'bad'));
    AD.scene.update({ phase: 'alarm', spot: sp });
    alarmView(inst, lines, open);
  }

  function alarmView(inst, lines, open) {
    const car = def(inst), sp = run.spot, c = C();
    const st = R.bestStarter(car);
    const stTime = st ? st.def.time : 2;
    const pStart = R.startChance(car, c.start.panicPenalty);
    const pSneak = R.clamp(0.75 - sp.by.filter(x => x.state === 'kijkt' || x.state === 'belt').length * 0.15 + R.statBonus('gladheid') * 2, 0.15, 0.95);
    const pRun = R.clamp(sp.eta / 4 + R.statBonus('rennen'), 0.2, 0.95);
    const ch = [];
    if (open) ch.push({ label: 'Toch starten en wegscheuren', icon: st ? st.id : 'hotwirekit', chance: pStart, odds: 'exact',
      hint: `${fmtMin(stTime)} · ${etaWord(sp)}`,
      act: () => {
        const out = [L('> Trillende handen aan de bedrading...', 'dim')];
        const arrived = tick(stTime, 0, out);
        if (rng.chance(pStart)) {
          out.push(L('De motor brult! Je scheurt weg terwijl het alarm nog loeit.', 'good'));
          takeCar(inst);
          if (arrived === 'police' || sp.eta < 1) return E.carChase(R.etaDistance(Math.max(0, sp.eta)), out);
          return started(inst, out);
        }
        out.push(L('Hij wil niet!', 'bad'));
        if (arrived === 'police') return copsArrive(null, out);
        alarmView(inst, out, open);
      } });
    ch.push({ label: 'Afhaken: rustig weglopen alsof je niks met die auto te maken hebt', icon: 'act_walk', chance: pSneak, odds: 'vague', act: () => {
      const out = [L('> Handen in je zakken, rustig de straat uit.', 'dim')];
      if (rng.chance(pSneak)) { run.suspicion += 15; out.push(L('Niemand houdt je tegen. Achter je loeit het alarm nog.', 'good')); return E.street(out); }
      out.push(L('"Dat is hem!" Iemand wijst naar je.', 'bad'));
      E.footChase(R.etaDistance(sp.eta) + 10, out);
    } });
    ch.push({ label: 'Wegrennen', icon: 'sneakers', chance: pRun, odds: 'vague', hint: 'Hoe verder de politie nog is, hoe makkelijker', act: () => {
      const out = [L('> Je zet het op een lopen.', 'dim')];
      if (rng.chance(pRun)) { run.suspicion += 20; out.push(L('Je bent al twee straten verder als de sirenes aankomen. **Ontkomen.**', 'good')); return E.street(out); }
      out.push(L('Een politiewagen komt net de hoek om en ziet je rennen!', 'bad'));
      E.footChase(R.etaDistance(sp.eta) + 15, out);
    } });
    const pHide = R.choiceChance({ b: 0.45, s: 'gladheid', w: 1.5, h: -0.003 });
    ch.push({ label: 'Verstoppen achter een container', icon: 'act_hide', chance: pHide, odds: 'vague', act: () => hide(pHide) });
    ui({ view: 'street', title: 'ALARM!', clear: true, lines, target: inst, choices: ch });
  }

  function hide(p) {
    const out = [L('> Je duikt weg achter een vuilcontainer.', 'dim')];
    if (rng.chance(p)) {
      run.suspicion += 20;
      AD.scene.update({ phase: 'idle', target: null });
      out.push(L('Een politieauto rijdt stapvoets voorbij. Het zoeklicht glijdt over de container... en verder. **Niet gezien.**', 'good'));
      return ui({ view: 'street', title: streetTitle(), clear: true, lines: out, choices: [
        { label: 'Verder zoeken (de buurt is alert)', act: () => E.street() },
        { label: 'Naar huis', act: () => E.goHome() },
      ] });
    }
    out.push(L('"Daar zit iemand!" Een zaklamp schijnt recht in je gezicht.', 'bad'));
    E.footChase(30, out);
  }

  // De politie staat ineens in de straat
  function copsArrive(inst, lines) {
    scene('chase', { mode: 'foot', distance: 30, units: 1, car: null });
    AD.sfx.radio();
    const c = C();
    const ch = [];
    if (inst) {
      const car = def(inst), pStart = R.startChance(car, c.start.panicPenalty + 0.1);
      ch.push({ label: 'Snel starten en gas!', icon: 'hotwirekit', chance: pStart, odds: 'exact', act: () => {
        const out = [L('> Je rukt aan de draden...', 'dim')];
        if (rng.chance(pStart)) { takeCar(inst); out.push(L('De motor slaat aan. Plankgas!', 'good')); return E.carChase(25, out); }
        out.push(L('Niks. Eruit en rennen!', 'bad'));
        E.footChase(20, out);
      } });
    }
    const pCool = R.choiceChance({ b: 0.35, s: 'gladheid', w: 2, h: -0.004 });
    ch.push({ label: 'Doen alsof je op de bus wacht', icon: 'act_talk', chance: pCool, odds: 'vague', act: () => {
      const out = [L('> Je kijkt op je telefoon en zucht diep.', 'dim')];
      if (rng.chance(pCool)) { run.suspicion += 15; out.push(L('De agenten kijken rond, praten met een buurman... en rijden weer weg. **Niet gezien.**', 'good')); return E.street(out); }
      out.push(L('"Meneer? Mogen wij even uw zakken zien?" **Rennen!**', 'bad'));
      E.footChase(22, out);
    } });
    ch.push({ label: 'Wegrennen', icon: 'sneakers', act: () => E.footChase(35, [L('> Je rent de eerste steeg in.', 'dim')]) });
    ui({ view: 'chase', title: 'POLITIE!', clear: true, lines, choices: ch });
  }

  function opened(inst, tries, lines) {
    AD.scene.update({ phase: 'open' });
    const car = def(inst), st = R.bestStarter(car), sp = run.spot;
    const time = (st ? st.def.time : 2) * (1 + tries * 0.2);
    const p = R.startChance(car, tries * C().start.retryPenalty);
    if (!tries) lines.push(L(`Je zit erin. Nu de motor nog. ${st ? 'Je pakt je ' + st.def.name.toLowerCase() + '.' : 'Zonder gereedschap wordt dat prutsen met draadjes.'}`));
    const ch = [
      { label: tries ? 'Nog eens proberen te starten' : 'Motor starten', icon: st ? st.id : 'hotwirekit', chance: p, odds: 'exact',
        hint: `${fmtMin(time)} · mislukken kan het alarm laten afgaan · iemand ziet je: ${pct(R.actionRisk(sp, time, R.actionNoise(time, 0)))}`,
        act: () => {
          const out = [L('> Je prutst aan de bedrading...', 'dim')];
          const ok = rng.chance(p);
          const arrived = tick(time, R.actionNoise(time, 0), out);
          if (ok) { out.push(L('VROEM! De motor slaat aan.', 'good')); return started(inst, out); }
          if (rng.chance(C().start.failAlarm + tries * 0.08)) { out.push(L('Verkeerde draad!', 'bad')); return triggerAlarm(inst, out, true); }
          if (arrived === 'police') return copsArrive(inst, out);
          out.push(L('De motor sputtert, maar slaat niet aan.'));
          opened(inst, tries + 1, out);
        } },
      { label: 'Afhaken: uitstappen en weglopen', icon: 'act_walk', act: () => walkAway(sp, [L('Je laat de auto staan.', 'dim')]) },
    ];
    ui({ view: 'street', title: streetTitle(), clear: true, lines, choices: ch, target: inst });
  }

  function takeCar(inst) {
    if (run.car === inst) return;
    run.car = inst;
    S().stats.stolen++;
    addHeat(C().heatGain.theftPerTier * def(inst).tier);
  }

  function owner(inst, lines) {
    AD.scene.update({ phase: 'owner' });
    lines.push(L('"HÉ! WAT DOE JIJ MET MIJN AUTO?!" De **eigenaar** komt de hoek om.', 'bad'));
    const car = def(inst), c = C(), sp = run.spot;
    const pStart = R.startChance(car, 0.1);
    const pTalk = R.choiceChance({ b: 0.4, s: 'gladheid', w: 2 });
    const ch = [
      { label: 'Snel starten en gas!', icon: 'hotwirekit', chance: pStart, odds: 'exact', act: () => {
        const out = [L('> Je rukt aan de draden...', 'dim')];
        if (rng.chance(pStart)) {
          sp.called = true; sp.eta = Math.min(sp.eta, 3);
          takeCar(inst); out.push(L('Je scheurt weg. In je spiegel zie je hem **bellen**.', 'good'));
          return started(inst, out);
        }
        out.push(L('Hij trekt je uit de auto! Je rukt je los en rent.', 'bad'));
        walkAway({ by: [{ state: 'belt' }, { state: 'kijkt' }], called: true, eta: 3, attention: 100 }, out);
      } },
      { label: 'Smoesje: "Ik ben van de wegenwacht"', icon: 'act_talk', chance: pTalk, odds: 'vague', act: () => {
        const out = [L('> "Goedenavond meneer, melding van een accustoring."', 'dim')];
        if (rng.chance(pTalk)) { out.push(L('Hij krabt op zijn hoofd. "O... nou, ga je gang." Hij loopt door.', 'good')); return opened(inst, 0, out); }
        out.push(L('Hij gelooft er niks van en **belt 112**.', 'bad')); addHeat(4);
        sp.called = true; sp.eta = Math.min(sp.eta, rng.range(2, 4)); sp.attention = 90;
        opened(inst, 0, out);
      } },
    ];
    R.weapons().forEach(w => {
      const p = R.choiceChance({ b: 0.5 + w.def.power, s: 'vechten', w: 1 });
      ch.push({ label: `Dreigen met ${w.def.name.toLowerCase()}`, icon: w.id, chance: p, odds: 'vague', act: () => {
        const out = [L(`> Je trekt je ${w.def.name.toLowerCase()}.`, 'dim')];
        addHeat(w.def.heat);
        if (rng.chance(p)) { sp.called = true; sp.eta = Math.min(sp.eta, 3); out.push(L('Hij steekt zijn handen omhoog en rent weg. Hij gaat de **politie bellen**.', 'good')); return opened(inst, 0, out); }
        hurt(rng.int(8, 18)); AD.sfx.hit();
        out.push(L('Hij slaat het wapen uit je hand en geeft je een dreun!', 'bad'));
        if (S().health <= 0) return E.gameOver('wasted', out);
        walkAway({ by: [{ state: 'belt' }], called: true, eta: 3, attention: 100 }, out);
      } });
    });
    ch.push({ label: 'Afhaken: wegwezen', icon: 'sneakers', act: () => E.street([L('> Je laat de auto voor wat hij is en verdwijnt om de hoek.', 'dim'), L('De eigenaar scheldt je na, maar komt je niet achterna.', 'good')]) });
    ui({ view: 'street', title: 'BETRAPT!', clear: true, lines, choices: ch, target: inst });
  }

  function started(inst, lines) {
    takeCar(inst);
    AD.scene.update({ phase: 'drive' });
    const car = def(inst), sp = run.spot;
    if (sp && sp.called && sp.eta < 1.5) {
      lines.push(L('Bij de kruising komt je de **politie** al tegemoet. Zwaailichten!', 'bad'));
      return policeSpots(lines, R.etaDistance(Math.max(0, sp.eta)) + 10);
    }
    let p = R.noticeChance(car, run.district);
    if (sp) p = R.clamp(p + (sp.called ? 0.25 : 0) + sp.attention / 500, 0, 0.9);
    if (rng.chance(p)) {
      lines.push(L('Een patrouillewagen draait achter je de straat in. Ze hebben je **gezien**!', 'bad'));
      return policeSpots(lines, C().chase.startNoticed);
    }
    lines.push(L('Je rijdt rustig de wijk uit. **Niemand heeft iets gezien.**', 'good'));
    addXp(C().xp.perTier * car.tier, lines);
    deliver(lines);
  }

  // Politie ziet je in de auto: wegrijden, wegrennen of bluffen?
  function policeSpots(lines, dist) {
    scene('chase', { mode: 'car', distance: dist, units: 1, car: run.car });
    AD.sfx.radio();
    const pCool = R.choiceChance({ b: 0.45, s: 'gladheid', w: 1.5, h: -0.004 });
    ui({ view: 'chase', title: 'POLITIE!', clear: true, lines, target: run.car, choices: [
      { label: 'Gas erop! Wegrijden', icon: 'act_drive', act: () => E.carChase(dist, [L('> Plankgas!', 'dim')]) },
      { label: 'Uitstappen en wegrennen', icon: 'sneakers', hint: 'De auto ben je kwijt', act: () => E.footChase(dist + 5, [L('> Je springt eruit en rent een steeg in.', 'dim')]) },
      { label: 'Rustig doorrijden, niks aan de hand', icon: 'act_talk', chance: pCool, odds: 'vague', act: () => {
        const out = [L('> Richting aan, netjes 50.', 'dim')];
        if (rng.chance(pCool)) {
          out.push(L('Ze halen je in... en rijden door. **Pfoe.**', 'good'));
          addXp(C().xp.perTier * def(run.car).tier, out);
          return deliver(out);
        }
        out.push(L('De sirene gaat aan. "STOPPEN!"', 'bad'));
        E.carChase(Math.max(20, dist - 15), out);
      } },
    ] });
  }

  // =============================================================
  //  ACHTERVOLGING
  // =============================================================
  E.carChase = function (dist, lines) {
    const s = S();
    run.chase = { mode: 'car', distance: dist, round: 0, units: 1 + Math.floor(s.heat / 35), used: new Set(), next: null, history: [dist] };
    s.stats.chases++; addHeat(C().heatGain.chase);
    AD.sfx.siren(true);
    chaseRound(lines);
  };

  E.footChase = function (dist, lines) {
    const s = S();
    if (run.car) { lines.push(L(`Je laat de ${def(run.car).name} achter.`, 'bad')); run.car = null; }
    const units = run.chase ? run.chase.units : 1 + Math.floor(s.heat / 40);
    if (!run.chase) { s.stats.chases++; addHeat(C().heatGain.chase); }
    const history = run.chase ? run.chase.history.concat([dist]) : [dist];
    const used = run.chase ? run.chase.used : new Set();
    run.chase = { mode: 'foot', distance: dist, round: 0, units, used, next: null, history };
    AD.sfx.siren(true);
    chaseRound(lines);
  };

  function weaponChoice(w) {
    return {
      label: `Terugschieten met ${w.def.name.toLowerCase()}`, icon: w.id, sfx: 'shots',
      c: { b: 0.25 + w.def.power, s: 'schieten', w: 1.5 },
      ok: { gain: [16, 26], heat: w.def.heat, units: -1, text: rng.pick([
        'Je raakt hun motorblok. Die wagen rijdt niet meer.',
        'Ze duiken weg achter hun portieren en verliezen terrein.',
        'Een band klapt. De politiewagen tolt de berm in.']) },
      fail: { hurt: [12, 26], heat: w.def.heat, loss: [4, 8], text: 'Je mist. Zij niet.' },
    };
  }
  function meleeChoice(w) {
    return {
      label: `Neerslaan met ${w.def.name.toLowerCase()}`, icon: w.id, sfx: 'hit',
      c: { b: 0.35 + w.def.power, s: 'vechten', w: 1.5 },
      ok: { gain: [18, 26], heat: w.def.heat, text: 'Eén klap, en je bent erlangs.' },
      fail: { loss: [12, 18], hurt: [5, 15], heat: w.def.heat, text: 'Hij ontwijkt en grijpt je arm.' },
    };
  }
  function crewChoice() {
    const names = R.crewShooters().map(m => m.name.split(' ')[0]).join(' en ');
    return {
      label: `Crew vuurt terug (${names})`, icon: 'act_crew', sfx: 'shots', extra: { crew: names },
      c: { b: 0.3 + R.crewFirepower(), s: 'schieten', w: 0.5 },
      ok: { gain: [18, 28], heat: 10, units: -1, text: '{crew} laat de ruiten van de politiewagen uiteenspatten!' },
      fail: { crewHit: [35, 70], loss: [4, 8], heat: 8, text: 'Ze schieten terug!' },
    };
  }

  function chaseRound(lines) {
    const ch = run.chase, s = S(), c = C().chase;
    ch.round++;
    if (ch.mode === 'car' && run.car.condition <= c.wreckAt) {
      lines.push(L('De motor rookt en valt stil. Eruit en rennen!', 'bad'));
      return E.footChase(Math.max(10, Math.round(ch.distance * c.bailOutKeep)), lines);
    }
    const shooting = s.heat >= c.shootoutHeat && ch.round > 1 && rng.chance(c.shootoutChance);
    const pool = shooting ? AD.EVENTS.shootout : (ch.mode === 'car' ? AD.EVENTS.chaseCar : AD.EVENTS.chaseFoot);
    const forced = !shooting && ch.next ? eventById(ch.next) : null;
    ch.next = null;
    const ev = forced || pickEvent(pool, ch.used);
    ch.used.add(ev.id);
    ch.before = ch.distance;
    scene('chase', { mode: ch.mode, distance: ch.distance, units: ch.units, car: run.car, shooting, heli: s.heat >= c.heliHeat });
    if (shooting) AD.sfx.shots();
    lines.push(L(evText(ev), shooting ? 'bad' : 'info'));

    const odds = R.radar() >= 1 ? 'exact' : 'vague';
    const done = (o, out) => {
      if (o.next) ch.next = o.next;
      if (o.end === 'escape') return chaseEscaped(out);
      if (o.end === 'arrest') return E.arrest(out);
      if (o.end === 'footChase') return E.footChase(o.dist || 30, out);
      afterChaseChoice(out);
    };
    const choices = ev.choices.filter(x => !x.req || x.req(ctx())).map(x => eventChoice(x, odds, done));
    if (ev.weapons) R.rangedWeapons().forEach(w => choices.push(eventChoice(weaponChoice(w), odds, done)));
    if (ev.melee) R.weapons().filter(w => !w.def.ranged).forEach(w => choices.push(eventChoice(meleeChoice(w), odds, done)));
    if (ev.crew && R.crewShooters().length) choices.push(eventChoice(crewChoice(), odds, done));
    if (ch.mode === 'car') choices.push({ label: 'Uitstappen en verder rennen', icon: 'sneakers', hint: 'Auto kwijt, je houdt een deel van je voorsprong',
      act: () => E.footChase(Math.round(ch.distance * c.bailOutKeep), [L('> Handrem, portier open, rennen!', 'dim')]) });
    if (R.has('ehbo') && s.health < 70) choices.push({ label: 'EHBO-doos gebruiken', icon: 'ehbo', hint: `+${AD.ITEMS.ehbo.heal} gezondheid, kost wat voorsprong`,
      act: () => { s.inv.ehbo--; s.health = Math.min(100, s.health + AD.ITEMS.ehbo.heal); ch.distance -= 8; afterChaseChoice([L('> Je drukt een verband op de wond.', 'dim')]); } });
    ui({ view: 'chase', title: ch.mode === 'car' ? 'ACHTERVOLGING' : 'TE VOET OP DE VLUCHT', clear: true, lines, choices, target: run.car });
  }

  // Na elke keuze: politie loopt in of je loopt uit. Laat zien waardoor.
  function afterChaseChoice(out) {
    const ch = run.chase;
    const before = Math.round(ch.before == null ? ch.distance : ch.before);
    const fromChoice = Math.round(ch.distance - before);
    const parts = R.driftParts(ctx());
    let rest = 0;
    const names = { snelheid: 'snelheid auto', rijden: 'rijkunst', tempo: 'tempo', conditie: 'conditie', politie: 'politiedruk', momentum: 'momentum' };
    const bits = [`keuze ${fromChoice >= 0 ? '+' : ''}${fromChoice}`];
    Object.keys(parts).forEach(k => { const v = Math.round(parts[k]); rest += parts[k]; if (v) bits.push(`${names[k] || k} ${v > 0 ? '+' : ''}${v}`); });
    ch.distance += Math.round(rest + rng.range(-3, 3));
    ch.history.push(Math.round(ch.distance));
    ch.lastDelta = Math.round(ch.distance) - before;
    const after = Math.round(R.clamp(ch.distance, 0, 100));
    out.push(L(`Voorsprong **${before} → ${after}** (${bits.join(', ')})`, ch.lastDelta >= 0 ? 'good' : 'bad'));
    if (S().health <= 0) return E.gameOver('wasted', out);
    if (ch.distance >= C().chase.escapeAt) return chaseEscaped(out);
    if (ch.distance <= 0) return E.arrest(out);
    out.push(L(distanceText(ch.distance), ch.distance < 25 ? 'bad' : 'dim'));
    chaseRound(out);
  }

  function chaseEscaped(out) {
    AD.sfx.siren(false);
    addHeat(C().heatGain.escape); S().stats.escapes++;
    const wasCar = run.chase && run.chase.mode === 'car' && run.car;
    run.chase = null;
    if (wasCar) {
      const car = def(run.car);
      out.push(L('Je bent ze kwijt! De sirenes sterven weg.', 'good'));
      addXp(C().xp.perTier * car.tier + C().xp.chaseBonus, out);
      return deliver(out);
    }
    out.push(L('Je bent ontkomen. Zonder buit, maar wel vrij.', 'good'));
    addXp(10, out);
    freeOnFoot(out);
  }

  function freeOnFoot(out) {
    scene('street', { district: run.district, phase: 'idle', seed: run.step + 50 });
    const ch = [];
    if (run.step < maxSteps()) ch.push({ label: 'Verder zoeken in de wijk', hint: 'De politie is nog alert', act: () => { run.suspicion += 15; E.street(); } });
    ch.push({ label: 'Naar huis', act: () => E.goHome() });
    ui({ view: 'street', title: 'Ontkomen', clear: true, lines: out, choices: ch });
  }

  // =============================================================
  //  ARRESTATIE
  // =============================================================
  E.arrest = function (lines) {
    const s = S(), c = C();
    AD.sfx.siren(false); AD.sfx.freeze();
    const ch = run && run.chase;
    scene('chase', { mode: ch ? ch.mode : 'foot', distance: 0, units: ch ? ch.units : 1, car: run && run.car, arrest: true });
    lines.push(L('"POLITIE! HANDEN WAAR IK ZE KAN ZIEN!"', 'bad'));
    const bribe = Math.round(400 + s.heat * 25 + (run && run.car ? def(run.car).value * 0.05 : 0));
    const pBribe = R.choiceChance({ b: 0.35, s: 'gladheid', w: 2, h: -0.003 });
    const choices = [
      { label: 'Overgeven', icon: 'act_surrender', hint: `Cel + strafblad (${(S().record || 0) + 1}/${C().jail.maxConvictions})`, act: () => E.jail([L('> Je gaat op je knieën, handen achter je hoofd.', 'dim')]) },
      { label: `Omkopen (${fmt(bribe)})`, icon: 'loc_baas', chance: pBribe, odds: 'vague', disabled: s.money < bribe, reason: 'Niet genoeg geld', act: () => {
        s.money -= bribe; addHeat(c.heatGain.bribe);
        const out = [L(`> Je schuift ${fmt(bribe)} over.`, 'dim')];
        if (rng.chance(pBribe)) { out.push(L('De agent stopt het geld weg en kijkt de andere kant op.', 'good')); return freed(out); }
        out.push(L('"Poging tot omkoping. Dat komt er ook nog bij."', 'bad'));
        E.jail(out);
      } },
    ];
    R.weapons().forEach(w => {
      const p = R.choiceChance({ b: 0.15 + w.def.power, s: w.def.ranged ? 'schieten' : 'vechten', w: 1.5 });
      choices.push({ label: (w.def.ranged ? 'Schieten met ' : 'Vechten met ') + w.def.name.toLowerCase(), icon: w.id, chance: p, odds: 'vague', act: () => {
        AD.sfx[w.def.ranged ? 'shots' : 'hit']();
        addHeat(w.def.heat + c.heatGain.fightCop);
        const out = [L(`> Je trekt je ${w.def.name.toLowerCase()}!`, 'dim')];
        if (rng.chance(p)) { out.push(L('Ze duiken weg. Je bent los!', 'good')); return resume(out, 30); }
        hurt(rng.int(15, 35));
        out.push(L('Je wordt tegen de grond gewerkt.', 'bad'));
        if (S().health <= 0) return E.gameOver('wasted', out);
        E.jail(out);
      } });
    });
    if (s.crew.length) {
      const p = R.choiceChance({ b: 0.25 + R.crewBonus('vechten') + R.crewFirepower() });
      choices.push({ label: 'Crew grijpt in', icon: 'act_crew', chance: p, odds: 'vague', act: () => {
        const out = [L('> "NU!"', 'dim')];
        addHeat(c.heatGain.fightCop);
        if (rng.chance(p)) { out.push(L('Je crew stort zich op de agenten. Je bent los!', 'good')); return resume(out, 30); }
        const m = rng.pick(s.crew); s.crew = s.crew.filter(x => x !== m);
        out.push(L(`${m.name} wordt in de boeien geslagen. Jij ook.`, 'bad'));
        E.jail(out);
      } });
    }
    const pRun = R.choiceChance({ b: 0.22, s: 'rennen', w: 1.5 });
    choices.push({ label: 'Losrukken en rennen', icon: 'sneakers', chance: pRun, odds: 'vague', act: () => {
      const out = [L('> Je draait je los uit de greep...', 'dim')];
      if (rng.chance(pRun)) { out.push(L('...en je bent weg!', 'good')); return E.footChase(18, out); }
      out.push(L('Een tweede agent tackelt je.', 'bad'));
      E.jail(out);
    } });
    ui({ view: 'chase', title: 'GEPAKT?', clear: true, lines, choices });
  };

  function resume(out, dist) {
    if (run.car && run.chase && run.chase.mode === 'car') {
      out.push(L('Je springt terug achter het stuur!', 'good'));
      run.chase.distance = dist; AD.sfx.siren(true);
      return chaseRound(out);
    }
    E.footChase(dist, out);
  }
  function freed(out) {
    if (run.car) { run.chase = null; out.push(L(`Je mag doorrijden met de ${def(run.car).name}.`)); return deliver(out); }
    run.chase = null;
    freeOnFoot(out);
  }

  E.jail = function (lines) {
    const s = S(), j = C().jail;
    AD.sfx.siren(false);
    run = null;
    if (R.has('advocaat')) {
      s.inv.advocaat--;
      lines.push(L('Mr. Van Dam verschijnt op het bureau. Een vormfoutje hier, een handtekening daar... Je staat weer buiten. **Geen aantekening.**', 'good'));
      lines.push(L('Je advocaat-retainer is op. De auto ben je kwijt.', 'dim'));
      s.heat = Math.max(s.heat, 50);
      nextDay(lines); nextDay(lines);
      return E.hub(lines);
    }
    s.record = (s.record || 0) + 1;
    if (s.record >= j.maxConvictions) {
      lines.push(L(`Dit is je **${s.record}e veroordeling**. De rechter is er klaar mee.`, 'bad'));
      return E.gameOver('busted', lines);
    }
    const days = Math.max(1, Math.round(j.baseDays + s.heat * j.daysPerHeat));
    const fine = Math.round(s.money * j.confiscate);
    s.money -= fine;
    AD.scene.overlay('BUSTED');
    AD.sfx.busted();
    lines.push(L(`**Gepakt.** De rechter geeft je **${days} dagen cel**.`, 'bad'));
    if (fine) lines.push(L(`Justitie neemt **${fmt(fine)}** van je cash in beslag.`, 'bad'));
    lines.push(L(`Strafblad: **${s.record}/${j.maxConvictions}**. Bij ${j.maxConvictions} veroordelingen gaat de deur voorgoed dicht.`, 'info'));
    for (let i = 0; i < days; i++) nextDay([]);
    s.heat = Math.min(s.heat, j.heatAfter);
    s.health = Math.max(s.health, 60);
    lines.push(L(`Dag ${s.day}. Je staat weer buiten, met je spullen in een plastic zak.`, 'dim'));
    AD.state.save();
    ui({ view: 'over', title: 'IN DE CEL', clear: true, lines, choices: [
      { label: 'Terug naar je schuilplaats', act: () => { AD.scene.overlay(null); E.hub(); } },
    ] });
  };

  E.gameOver = function (kind, lines) {
    const s = S();
    run = null; AD.sfx.siren(false); AD.sfx.busted();
    AD.scene.overlay(kind === 'busted' ? 'BUSTED' : 'WASTED');
    AD.state.addHiscore({ earned: s.stats.earned, stolen: s.stats.stolen, day: s.day, end: kind === 'busted' ? 'gepakt' : 'neergeschoten' });
    AD.state.clearSave();
    lines = lines || [];
    lines.push(L(kind === 'busted' ? 'De celdeur valt dicht. Voor jou is het spel voorbij.' : 'Alles wordt zwart. Voor jou is het spel voorbij.', 'bad'));
    lines.push(L(`Dagen: ${s.day}. Auto's gestolen: ${s.stats.stolen}. Achtervolgingen: ${s.stats.chases} (${s.stats.escapes} ontsnapt). Totaal verdiend: ${fmt(s.stats.earned)}.`, 'info'));
    ui({ view: 'over', title: kind === 'busted' ? 'BUSTED' : 'WASTED', clear: true, lines, choices: [
      { label: 'Opnieuw beginnen', act: () => { AD.scene.overlay(null); AD.state.newGame(); E.intro(); } },
      { label: 'Titelscherm', act: () => E.title() },
    ] });
  };

  // =============================================================
  //  BUIT AFLEVEREN
  // =============================================================
  function deliver(lines) {
    const s = S(), inst = run.car, car = def(inst);
    run.chase = null; AD.sfx.siren(false);
    scene('garage', { cars: s.garage.cars, slots: s.garage.slots, incoming: inst });
    lines.push(L(`Je hebt een ${car.name}: staat ${pct(inst.condition)}, marktwaarde ${fmt(car.value)}. Hij is nog heet.`, 'info'));
    const sloper = C().buyers[0], cut = R.crewCut();
    const price = R.sellPrice(inst, sloper);
    const ch = [
      { label: `Naar ${sloper.name}: ${fmt(price * (1 - cut))} contant`, icon: 'buyer_sloper',
        hint: sloper.desc + (cut ? ` Crew krijgt ${pct(cut)}.` : ''),
        act: () => { const out = []; sell(inst, sloper, out); afterJob(out); } },
      { label: `Stallen in je garage (${s.garage.cars.length}/${s.garage.slots})`, icon: 'loc_garage',
        hint: 'Later repareren, overspuiten en duurder verkopen',
        disabled: s.garage.cars.length >= s.garage.slots, reason: 'Garage vol',
        act: () => { s.garage.cars.push(inst); afterJob([L(`De ${car.name} staat veilig in je garage.`, 'good')]); } },
    ];
    C().buyers.slice(1).forEach(b => {
      const why = R.buyerBlock(inst, b);
      ch.push({ label: `Naar ${b.name}`, icon: 'buyer_' + b.id, disabled: true, reason: why || 'Eerst via de garage' });
    });
    ui({ view: 'deliver', title: 'Buit binnen', clear: true, lines, choices: ch, target: inst });
  }

  function afterJob(out) {
    run.car = null;
    const ch = [];
    if (run.step < maxSteps()) ch.push({ label: `Terug naar de ${run.district.name}`, act: () => E.street() });
    ch.push({ label: 'Naar huis', act: () => E.goHome() });
    ui({ view: 'deliver', title: 'Klus geklaard', clear: true, lines: out, choices: ch });
  }
})();
