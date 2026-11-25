// =============================================================
//  VECHTEN: ronde voor ronde, met een opdracht per persoon.
//  aanval  = valt aan, gewone kans om geraakt te worden
//  dekking = valt niet aan, moeilijk te raken
//  lokken  = trekt de aandacht: wordt vaker gekozen als doelwit, anderen minder
// =============================================================
(function () {
  const E = AD.engine, R = AD.rules, rng = AD.rng, K = E.kit;
  const { L, ui, scene, pct, cap } = K;
  const C = () => AD.SETTINGS, S = () => AD.state.S;
  const ORDERS = ['aanval', 'dekking', 'lokken'];
  const ORDER_TEXT = { aanval: 'valt aan', dekking: 'zoekt dekking', lokken: 'trekt de aandacht' };
  const TARGET = { aanval: 2, dekking: 1, lokken: 5 }, EXPOSED = { aanval: 1, dekking: 0.4, lokken: 0.8 };

  function attack(weaponId, bonus) {
    const w = weaponId ? AD.ITEMS[weaponId] : null;
    return { hit: R.clamp(0.42 + (w ? w.power * 0.5 : 0) + bonus, 0.15, 0.92), dmg: w ? [10 + w.power * 40, 20 + w.power * 60] : [6, 14] };
  }
  // Wie staan er aan jouw kant? ref wijst naar de echte gegevens.
  function friends(f) {
    const s = S(), me = attack(f.weapon, R.statBonus('schieten'));
    return [{ ref: s, name: 'Jij', me: true, hp: s.health, armor: s.armor, order: f.order, ...me }].concat(s.crew.map(m =>
      ({ ref: m, name: m.name.split(' ')[0], hp: m.hp, armor: m.armor, order: m.order,
        ...attack(m.weapon, (AD.CREW_ROLES[m.role].shooter || 0) * m.skill) })));
  }
  function agents(n) { return Array.from({ length: n }, () => ({ hp: C().fight.agentHp })); }
  const alive = l => l.filter(x => x.hp > 0);

  // Eén ronde. Verandert alleen de meegegeven kopieën; log krijgt [tekst, kleur].
  function round(us, them, log) {
    const c = C().fight;
    alive(us).forEach(p => {
      if (p.order === 'dekking') return;
      const t = rng.pick(alive(them)); if (!t) return;
      if (!rng.chance(p.hit * (p.order === 'lokken' ? 0.7 : 1))) { log(`${p.name} mist.`, 'dim'); return; }
      const d = rng.range(p.dmg[0], p.dmg[1]); t.hp -= d;
      log(t.hp <= 0 ? `**${p.name}** schakelt een agent uit!` : `${p.name} raakt een agent.`, 'good');
    });
    agentsFire(us, them, log, c, 1);
  }
  function agentsFire(us, them, log, c, mult) {
    alive(them).forEach(() => {
      const list = alive(us); if (!list.length) return;
      const t = rng.weighted(list, x => TARGET[x.order]);
      if (!rng.chance(c.agentHit * EXPOSED[t.order] * mult)) return;
      const raw = rng.int(c.agentDmg[0], c.agentDmg[1]), abs = Math.min(t.armor, Math.round(raw * c.absorb));
      t.armor -= abs; t.hp -= raw - abs;
      log(`${t.name} ${t.me ? 'wordt' : 'is'} **geraakt**: -${raw - abs}${abs ? `, bescherming ving ${abs} op` : ''}.`, 'bad');
    });
  }
  // Versterking voor de politie. Geldt ook in de schatting, anders belooft die te veel.
  function reinforce(them, r, start) {
    const c = C().fight;
    if (r < c.reinforceFrom || them.length - start >= c.maxReinforce || !rng.chance(c.reinforceChance)) return false;
    them.push({ hp: c.agentHp }); return true;
  }
  // Laatste agent over nadat er een is uitgeschakeld: soms trekt hij zich terug
  const lastFlees = (them, before) => alive(them).length < before && alive(them).length === 1 && rng.chance(0.4);

  // Schatting door het gevecht vaak na te spelen met de huidige opdrachten
  function odds(f) {
    let win = 0; const N = 160, quiet = () => { };
    for (let i = 0; i < N; i++) {
      const us = friends(f), them = f.them.map(x => ({ hp: x.hp }));
      let won = false;
      for (let r = f.round + 1; r < f.round + 25 && us[0].hp > 0 && !won; r++) {
        const before = alive(them).length;
        round(us, them, quiet);
        if (us[0].hp <= 0) break;
        won = !alive(them).length || lastFlees(them, before);
        if (!won) reinforce(them, r, f.start);
      }
      if (won) win++;
    }
    return R.clamp(win / N, 0.02, 0.98);
  }
  const agentCount = from => {
    const ch = E.run().chase, u = ch ? ch.units : 1;
    return Math.min(5, u === 1 ? (from === 'arrest' ? 2 : 1) : u + 1);
  };

  // De keuze 'vechten' die in een achtervolging of bij een arrestatie wordt aangeboden
  E.fightChoice = function (from) {
    const n = agentCount(from), best = R.bestWeapon();
    const f = { weapon: best ? best.id : null, order: 'aanval', them: agents(n), start: n, round: 0 };
    const p = odds(f), team = 1 + S().crew.length;
    return { label: from === 'arrest' ? 'Je verzetten: vechten' : 'Omdraaien en vechten', icon: best ? best.id : 'knuppel', chance: p, odds: 'exact',
      hint: `Jullie met ${team} tegen ${n} agent${n === 1 ? '' : 'en'}${best ? `, jij met ${best.def.name.toLowerCase()}` : ', jij met blote handen'}. Kost veel heat.`,
      act: () => {
        const run = E.run();
        run.fight = { from, weapon: f.weapon, order: 'aanval', them: f.them, start: n, round: 0 };
        K.addHeat((best ? best.def.heat : 4) + (from === 'arrest' ? C().heatGain.fightCop : 0));
        AD.sfx.siren(false);
        view([L('> Je draait je om.', 'dim'), L(`Het is **${team} tegen ${n}**. Geef iedereen een opdracht en speel een ronde.`, 'info')]);
      } };
  };

  function view(lines) {
    const run = E.run(), f = run.fight, s = S(), ch = run.chase;
    scene('chase', { mode: 'foot', distance: 12, units: Math.max(1, Math.min(3, alive(f.them).length)), car: null, shooting: true, arrest: f.from === 'arrest' });
    const n = alive(f.them).length, p = odds(f);
    const choices = [{ label: 'Ronde uitvoeren', icon: f.weapon || 'knuppel', chance: p, odds: 'exact', hint: 'Geschatte kans om het hele gevecht zo te winnen', act: play }];
    const toggle = (name, get, set, extra) => choices.push(Object.assign({ label: `${name}: ${ORDER_TEXT[get()]}`, hint: 'Klik om de opdracht te wisselen',
      act: () => { set(ORDERS[(ORDERS.indexOf(get()) + 1) % 3]); view([L(`${name}: ${ORDER_TEXT[get()]}.`, 'dim')]); } }, extra));
    toggle('Jij', () => f.order, v => { f.order = v; }, { icon: 'act_crew' });
    s.crew.forEach(m => toggle(m.name.split(' ')[0], () => m.order, v => { m.order = v; }, { portrait: m.uid }));
    const ws = R.weapons();
    if (ws.length > 1 || (ws.length === 1 && !f.weapon)) choices.push({ label: `Ander wapen (nu: ${f.weapon ? AD.ITEMS[f.weapon].name.toLowerCase() : 'blote handen'})`, icon: f.weapon || 'knuppel',
      act: () => { const ids = ws.map(w => w.id); f.weapon = ids[(ids.indexOf(f.weapon) + 1) % ids.length]; view([L(`Je pakt je ${AD.ITEMS[f.weapon].name.toLowerCase()}.`, 'dim')]); } });
    const pBack = R.clamp(0.5 + R.statBonus('rennen') + (friends(f).filter(x => x.order !== 'aanval').length * 0.08) - n * 0.04, 0.1, 0.95);
    choices.push({ label: 'Terugtrekken en rennen', icon: 'sneakers', chance: pBack, odds: 'exact', hint: 'Dekking en lokken maken dit makkelijker', act: () => {
      const out = [L('> "Wegwezen!"', 'dim')], ok = rng.chance(pBack);
      K.practice('rennen', ok, out);
      if (ok) { out.push(L('Je komt los en rent.', 'good')); return leave(out, 35); }
      volley(out); if (over(out)) return;
      out.push(L('Ze laten je niet gaan.', 'bad')); view(out);
    } });
    if (R.has('rookbom')) choices.push({ label: 'Rookbom: in de rook verdwijnen', icon: 'rookbom', hint: `Je hebt er ${s.inv.rookbom}`, act: () => { s.inv.rookbom--; leave([L('> Pssss.', 'dim'), L('Een dikke witte wolk. Jullie zijn weg.', 'good')], 55); } });
    if (R.has('ehbo') && s.health < 80) choices.push({ label: 'EHBO-doos gebruiken', icon: 'ehbo', hint: `+${AD.ITEMS.ehbo.heal}, maar de agenten schieten door`, act: () => {
      s.inv.ehbo--; s.health = Math.min(100, s.health + AD.ITEMS.ehbo.heal);
      const out = [L('> Je drukt een verband op de wond.', 'dim')]; volley(out); if (!over(out)) view(out);
    } });
    K.leaveChoices(out => leave(out, 60)).forEach(x => choices.push(x));
    choices.push({ label: 'Overgeven', icon: 'act_surrender', hint: 'Cel + strafblad', act: () => { run.fight = null; E.jail([L('> Je laat alles vallen.', 'dim')]); } });
    ui({ view: 'chase', title: 'GEVECHT', clear: true, lines, choices });
  }

  // Kopieën terugschrijven naar jezelf en je crew
  function store(us, out) {
    const s = S();
    us.forEach(p => {
      if (p.me) { s.health = R.clamp(Math.round(p.hp), 0, 100); s.armor = p.armor; return; }
      p.ref.hp = Math.round(p.hp); p.ref.armor = p.armor;
      if (p.hp <= 0) { s.crew = s.crew.filter(m => m !== p.ref); out.push(L(`**${p.ref.name}** is zwaar gewond en valt uit.`, 'bad')); }
    });
  }
  function volley(out) {
    const f = E.run().fight, us = friends(f);
    AD.sfx.shots(); agentsFire(us, f.them, (t, c) => out.push(L(t, c)), C().fight, 1.1); store(us, out);
  }
  function over(out) {
    if (S().health > 0) return false;
    // Verloren: overmeesterd en naar de cel (met strafblad), niet meteen het einde van je carrière
    E.run().fight = null; S().health = 25;
    out.push(L('Alles draait. Je wordt **overmeesterd** en wakker in het ziekenhuis, geboeid aan het bed.', 'bad'));
    E.jail(out); return true;
  }
  function play() {
    const run = E.run(), f = run.fight, c = C().fight, out = [], us = friends(f), before = alive(f.them).length;
    f.round++;
    AD.sfx[f.weapon && AD.ITEMS[f.weapon].ranged ? 'shots' : 'hit']();
    round(us, f.them, (t, cl) => out.push(L(t, cl)));
    K.addHeat(c.heatPerRound);
    K.practice('schieten', alive(f.them).length < before, out);
    store(us, out);
    if (over(out)) return;
    if (!alive(f.them).length) { out.push(L('**Gewonnen!** De straat is leeg. Wegwezen voor er versterking komt.', 'good')); return leave(out, 70); }
    if (lastFlees(f.them, before)) { out.push(L('De laatste agent trekt zich terug en roept om versterking. **Nu!**', 'good')); return leave(out, 60); }
    if (reinforce(f.them, f.round, f.start)) { out.push(L('Er komt een **agent** bij.', 'bad')); }
    view(out);
  }
  // Uit het gevecht: verder vluchten met deze voorsprong
  function leave(out, dist) {
    const run = E.run(), f = run.fight;
    run.fight = null;
    if (run.chase) run.chase.units = Math.max(1, Math.min(run.chase.units, alive(f.them).length));
    K.resume(out, dist);
  }
})();
