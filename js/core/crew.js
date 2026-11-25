// =============================================================
//  CREW-SCHERMEN: status, wat iemand doet, bonussen, bescherming en wapens
// =============================================================
(function () {
  const E = AD.engine, R = AD.rules, K = E.kit;
  const { L, ui, scene, fmt, pct, cap } = K;
  const C = () => AD.SETTINGS, S = () => AD.state.S;
  const weaponName = id => id ? AD.ITEMS[id].name.toLowerCase() : 'blote handen';

  E.crew = function (pre) {
    const s = S();
    scene('bar');
    const lines = (pre || []).slice();
    if (!s.crew.length) return E.hub(lines);
    const sum = {};
    s.crew.forEach(m => R.memberBonus(m).forEach(([k, v]) => { sum[k] = (sum[k] || 0) + v; }));
    lines.push(L('Samen geven ze je: **' + Object.keys(sum).map(k => `${sum[k] < 0 ? '−' : '+'}${Math.abs(Math.round(sum[k] * 100))}% ${AD.BONUS_NAMES[k]}`).join(', ') + '**.', 'info'));
    lines.push(L(`Ze willen samen ${pct(R.crewCut())} van elke verkoop. Bij elke keuze waar ze helpen staat "crew" in de berekening.`, 'dim'));
    const ch = s.crew.map(m => ({ label: `${m.name}, ${AD.CREW_ROLES[m.role].name}`, portrait: m.uid, icon: 'role_' + m.role,
      hint: `${cap(AD.CREW_ROLES[m.role].job)} · ${m.hp} gezondheid · bescherming ${m.armor} · ${weaponName(m.weapon)} · trouw ${pct(m.loyalty)}`, act: () => E.member(m.uid) }));
    ch.push({ label: 'Terug', act: () => E.hub() });
    ui({ view: 'hub', title: 'Mijn crew', clear: true, lines, choices: ch });
  };

  E.member = function (uid, pre) {
    const s = S(), c = C().crew, m = s.crew.find(x => x.uid === uid);
    if (!m) return E.crew();
    const role = AD.CREW_ROLES[m.role], lines = (pre || []).slice();
    lines.push(L(`**${m.name}**, ${role.name.toLowerCase()}: ${role.job}. Bonus nu: **${R.bonusText(m)}**.`));
    lines.push(L(`Gezondheid ${m.hp}. Bescherming ${m.armor}. Wapen: ${weaponName(m.weapon)}. Trouw ${pct(m.loyalty)}. Klussen: ${m.jobs} (na ${c.jobsPerLevel - m.jobs % c.jobsPerLevel} klus(sen) beter). Deel: ${pct(m.cut)}.`, 'dim'));
    const pay = c.bonusPay, ch = [];
    ch.push({ label: `Bonus uitbetalen (${fmt(pay)})`, icon: 'loc_baas', hint: `Trouw +${pct(c.bonusLoyalty)}. Trouwe mensen klikken minder snel.`, disabled: s.money < pay || m.loyalty >= 1, reason: m.loyalty >= 1 ? 'Trouwer kan niet' : 'Te weinig geld',
      act: () => { s.money -= pay; m.loyalty = Math.min(1, m.loyalty + c.bonusLoyalty); AD.sfx.cash(); E.member(uid, [L('"Met jou werk ik graag, baas."', 'good')]); } });
    if (m.hp < 100) { const cost = (100 - m.hp) * c.doctorPerHp; ch.push({ label: `Naar de dokter (${fmt(cost)})`, icon: 'ehbo', disabled: s.money < cost, reason: 'Te weinig geld', act: () => { s.money -= cost; m.hp = 100; AD.sfx.cash(); E.member(uid, [L('Opgelapt.', 'good')]); } }); }
    ch.push({ label: 'Bescherming kopen', icon: 'vest', hint: `Nu ${m.armor} punten`, act: () => E.armorShop(() => E.member(uid), null, m) });
    Object.keys(AD.ITEMS).filter(id => AD.ITEMS[id].cat === 'weapon').forEach(id => {
      const it = AD.ITEMS[id];
      if (m.weapon === id || (m.weapon && AD.ITEMS[m.weapon].power >= it.power)) return;
      const locked = it.minLevel && s.level < it.minLevel;
      ch.push({ label: `${it.name} geven (${fmt(it.price)})`, icon: id, hint: `Kracht ${pct(it.power)}${it.ranged ? ', schiet van afstand' : ', van dichtbij'}`, disabled: locked || s.money < it.price, reason: locked ? `Vanaf level ${it.minLevel}` : 'Te weinig geld',
        act: () => { s.money -= it.price; m.weapon = id; AD.sfx.cash(); E.member(uid, [L(`${m.name} heeft nu een ${it.name.toLowerCase()}.`, 'good')]); } });
    });
    ch.push({ label: 'Ontslaan', icon: 'act_walk', act: () => { s.crew = s.crew.filter(x => x !== m); E.crew([L(`${m.name} pakt een jas en gaat.`, 'dim')]); } });
    ch.push({ label: 'Terug', act: () => E.crew() });
    ui({ view: 'hub', title: m.name, clear: true, lines, choices: ch });
  };

  // Bescherming voor jezelf of een crewlid
  E.armorShop = function (back, pre, member) {
    const s = S(), who = member || s, lines = (pre || []).slice();
    scene('shop');
    lines.push(L(`Bescherming voor **${member ? member.name : 'jezelf'}**: nu ${who.armor} punten. Klappen en kogels gaan er eerst vanaf.`));
    const ch = Object.keys(AD.ITEMS).filter(id => AD.ITEMS[id].cat === 'armor').map(id => {
      const it = AD.ITEMS[id], locked = it.minLevel && s.level < it.minLevel, worse = who.armor >= it.armor;
      return { label: `${it.name}: ${fmt(it.price)}`, icon: id, hint: it.desc, disabled: worse || locked || s.money < it.price,
        reason: worse ? 'Je draagt al beter' : locked ? `Vanaf level ${it.minLevel}` : 'Te weinig geld',
        act: () => { s.money -= it.price; who.armor = it.armor; AD.sfx.cash(); E.armorShop(back, [L(`Aangetrokken: ${it.name}.`, 'good')], member); } };
    });
    if (!member) s.crew.forEach(m => ch.push({ label: `Voor ${m.name}`, portrait: m.uid, hint: `Nu ${m.armor} punten`, act: () => E.armorShop(() => E.armorShop(back), null, m) }));
    ch.push({ label: 'Terug', act: back });
    ui({ view: 'hub', title: 'Bescherming', clear: true, lines, choices: ch });
  };
})();
