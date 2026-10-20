// =============================================================
//  UI: panelen, log, keuzeknoppen, HUD.
//  AD.ui.render({ view, title, lines, choices, target, clear })
// =============================================================
window.AD = window.AD || {};

(function () {
  const UI = AD.ui = {};
  const SP = AD.sprites;
  const $ = id => document.getElementById(id);
  let el = {}, choices = [], busy = false, lastView = 'title';

  const fmt = n => '€' + Math.round(n).toLocaleString('nl-NL');
  const pct = p => Math.round(p * 100) + '%';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // **woord** wordt vet; belangrijke woorden worden automatisch uitgelicht
  const KEYWORDS = /\b(gezien|alarm|politie|gepakt|ontsnapt|ontkomen|sirenes?|zwaailichten|geraakt|gewond|belt|kijkt|cel|strafblad|level up)\b/gi;
  UI.rich = t => String(t).split('**').map((seg, i) => i % 2 ? `<b>${esc(seg)}</b>` : esc(seg).replace(KEYWORDS, '<b class="kw">$1</b>')).join('');

  UI.init = function () {
    ['title', 'log', 'actions', 'meter', 'left', 'right', 'backpack', 'scene', 'screen-wrap', 'hud-day', 'hud-money',
      'hud-debt', 'hud-costs', 'hud-level', 'hud-xp', 'hud-heat', 'hud-heads', 'hud-loc', 'btn-sound', 'btn-crt', 'app']
      .forEach(id => { el[id] = $(id); });
    document.addEventListener('keydown', e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = e.key === '0' ? 10 : parseInt(e.key, 10);
      if (n >= 1 && n <= choices.length) { e.preventDefault(); pick(choices[n - 1]); }
      if (e.key === 'm' || e.key === 'M') toggleSound();
    });
    const toCanvas = e => {
      const r = el.scene.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width * AD.scene.W, (e.clientY - r.top) / r.height * AD.scene.H];
    };
    el.scene.addEventListener('mousemove', e => {
      const id = AD.scene.hover(...toCanvas(e));
      el.scene.style.cursor = id ? 'pointer' : 'default';
      el.scene.title = id ? (choices.find(c => c.spot === id) || {}).label || '' : '';
    });
    el.scene.addEventListener('mouseleave', () => AD.scene.hover(-99, -99));
    el.scene.addEventListener('click', e => {
      const id = AD.scene.hit(...toCanvas(e));
      const c = id && choices.find(c => c.spot === id);
      if (c) pick(c);
    });
    el['btn-sound'].addEventListener('click', toggleSound);
    el['btn-crt'].addEventListener('click', () => {
      const on = el.app.classList.toggle('crt');
      el['btn-crt'].classList.toggle('off', !on);
      try { localStorage.setItem('autodief.crt', on ? '1' : '0'); } catch (e) { }
    });
    try { if (localStorage.getItem('autodief.crt') === '0') { el.app.classList.remove('crt'); el['btn-crt'].classList.add('off'); } } catch (e) { }
    window.addEventListener('resize', UI.fit);
    UI.fit();
  };

  function toggleSound() {
    const on = AD.sfx.toggle();
    el['btn-sound'].classList.toggle('off', !on);
    el['btn-sound'].textContent = on ? 'Geluid aan' : 'Geluid uit';
  }

  // Canvas met hele getallen opschalen = scherpe pixels
  UI.fit = function () {
    const wrap = el['screen-wrap'];
    const avail = wrap.parentElement.clientWidth - 8;
    const maxH = Math.max(180, window.innerHeight * 0.55);
    let s = Math.min(avail / 320, maxH / 180);
    // Hele getallen = perfect scherpe pixels; op kleine schermen liever groter dan piepklein
    s = s >= 2 ? Math.floor(s) : Math.max(1, Math.floor(s * 4) / 4);
    if (avail < 320) { el.scene.style.width = '100%'; el.scene.style.height = 'auto'; wrap.style.setProperty('--px', '2px'); return; }
    el.scene.style.width = 320 * s + 'px'; el.scene.style.height = 180 * s + 'px';
    wrap.style.setProperty('--px', s + 'px');
  };

  function pick(c) {
    if (!c || c.disabled || busy || !c.act) return;
    busy = true;
    AD.sfx.select();
    setTimeout(() => { busy = false; }, 120);
    c.act();
  }

  function oddsHTML(c) {
    if (c.chance == null || c.odds === 'none') return '';
    const cls = c.chance >= 0.66 ? 'good' : c.chance >= 0.4 ? 'mid' : 'bad';
    if (c.odds === 'exact') return `<span class="odds ${cls}">${pct(c.chance)}</span>`;
    const word = c.chance >= 0.66 ? 'veilig' : c.chance >= 0.4 ? 'gok' : 'riskant';
    return `<span class="odds ${cls} vague" title="Koop een politiescanner om exacte kansen te zien">${word}</span>`;
  }

  UI.render = function (o) {
    const prevView = el.app.dataset.view;
    lastView = o.view || lastView;
    el.app.dataset.view = lastView;
    if (prevView !== lastView) UI.fit();
    el.title.textContent = o.title || '';
    if (o.clear !== false) el.log.innerHTML = '';
    (o.lines || []).filter(Boolean).forEach((l, i) => {
      const p = document.createElement('p');
      const line = typeof l === 'string' ? { t: l } : l;
      p.innerHTML = UI.rich(line.t);
      if (line.c) p.className = line.c;
      p.style.animationDelay = (i * 70) + 'ms';
      el.log.appendChild(p);
    });
    el.log.scrollTop = el.log.scrollHeight;

    choices = (o.choices || []).filter(Boolean);
    el.actions.innerHTML = '';
    choices.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'choice' + (c.disabled ? ' disabled' : '');
      const icon = c.portrait != null ? SP.portraitURL(c.portrait, 'crew', 2) : (c.icon && SP.hasIcon(c.icon) ? SP.iconURL(c.icon, 2) : null);
      b.innerHTML =
        `<span class="key">${i < 9 ? i + 1 : i === 9 ? 0 : ''}</span>` +
        (icon ? `<img class="ico" src="${icon}" alt="">` : '<span class="ico blank"></span>') +
        `<span class="txt"><span class="lbl">${esc(c.label)}</span>` +
        (c.disabled && c.reason ? `<span class="hint why">${esc(c.reason)}</span>` : c.hint ? `<span class="hint">${esc(c.hint)}</span>` : '') +
        `</span>` + oddsHTML(c);
      b.addEventListener('click', () => pick(c));
      el.actions.appendChild(b);
    });
    AD.scene.setSpots(choices.filter(c => c.spot).map(c => ({ id: c.spot, icon: c.icon, disabled: c.disabled })));

    renderMeter();
    renderLeft(o.target);
    renderRight();
    renderBackpack();
    UI.hud();
  };

  function bar(label, v, cls, text) {
    return `<div class="stat"><span class="sl">${esc(label)}</span><span class="bar ${cls || ''}"><i style="width:${Math.round(Math.max(0, Math.min(1, v)) * 100)}%"></i></span><span class="sv">${text == null ? '' : esc(text)}</span></div>`;
  }

  function renderLeft(target) {
    const s = AD.state.S;
    if (!s) { el.left.innerHTML = ''; return; }
    if (target) {
      const d = AD.carDef(target.id);
      el.left.innerHTML = `<h3>Voertuig</h3><div class="body">
        <div class="carpic"><img src="${SP.carURL(target, 4)}" alt=""></div>
        <div class="name">${esc(d.name)} <span class="tier">tier ${d.tier}</span></div>
        <div class="value">${fmt(d.value)}</div>
        ${bar('Staat', target.condition, 'green', pct(target.condition))}
        ${bar('Slot', d.security, 'orange')}
        ${bar('Elektronica', d.tech, 'orange')}
        ${bar('Alarm', d.alarm, 'orange')}
        ${bar('Startonderbr.', d.immobilizer, 'orange')}
        ${bar('Snelheid', d.speed, 'blue')}
        ${bar('Wendbaar', d.handling, 'blue')}
        ${bar('Stevigheid', d.durability, 'blue')}
        ${target.hot ? '<div class="tag hot">HEET</div>' : '<div class="tag cold">KOUD</div>'}
      </div>`;
      return;
    }
    const c = AD.SETTINGS, mx = c.maxSkill;
    el.left.innerHTML = `<h3>Karakter</h3><div class="body">
      <div class="charrow"><img class="portrait" src="${SP.portraitURL(1, 'player', 4)}" alt="">
        <div><div class="name">Jij</div><div class="sub">Level ${s.level}</div>${s.skillPoints ? `<div class="sub pts">${s.skillPoints} punt te besteden</div>` : ''}</div></div>
      ${bar('Gezondheid', s.health / c.health.max, 'green', s.health)}
      ${bar('Slotenkennis', s.skills.inbreken / mx, 'orange', s.skills.inbreken)}
      ${bar('Rijden', s.skills.rijden / mx, 'orange', s.skills.rijden)}
      ${bar('Rennen', s.skills.rennen / mx, 'orange', s.skills.rennen)}
      ${bar('Praatjes', s.skills.gladheid / mx, 'orange', s.skills.gladheid)}
      ${bar('Schieten', s.skills.schieten / mx, 'orange', s.skills.schieten)}
    </div>`;
  }

  function renderBackpack() {
    const s = AD.state.S;
    if (!s) { el.backpack.innerHTML = ''; return; }
    const items = AD.rules.owned();
    let html = '';
    const n = Math.max(12, Math.ceil(items.length / 4) * 4);
    for (let i = 0; i < n; i++) {
      const it = items[i];
      if (!it) { html += '<div class="slot"></div>'; continue; }
      const cnt = it.def.consumable ? `<b>${s.inv[it.id]}</b>` : '';
      html += `<div class="slot" title="${esc(it.def.name + ': ' + it.def.desc)}"><img src="${SP.iconURL(it.id, 2)}" alt="">${cnt}</div>`;
    }
    el.backpack.innerHTML = html;
  }

  function renderRight() {
    const s = AD.state.S;
    if (!s) { el.right.innerHTML = ''; return; }
    const run = AD.engine.run(), R = AD.rules, radar = R.radar();
    let html = '';
    if (run && (lastView === 'street' || lastView === 'chase')) {
      const ch = run.chase;
      const units = ch ? ch.units : 0;
      let risk = null, riskLabel = 'Pakkans';
      if (ch && radar >= 2) risk = R.catchEstimate({ run, chase: ch, car: run.car });
      if (!ch && radar >= 1) { risk = R.patrolChance(run); riskLabel = 'Patrouille'; }
      let cops = '';
      for (let i = 0; i < 6; i++) cops += i < units ? `<div class="slot"><img src="${SP.portraitURL(100 + i, 'cop', 2)}" alt=""></div>` : '<div class="slot"></div>';
      html += `<section class="panel"><h3>Politie</h3><div class="body"><div class="grid3">${cops}</div>
        ${risk != null ? bar(riskLabel, risk, 'red', pct(risk)) : `<div class="sub">${radar ? 'Radar nodig voor pakkans' : 'Geen scanner: je weet niet waar ze zijn'}</div>`}
        ${ch && radar >= 3 ? `<div class="sub">${units} eenhe${units === 1 ? 'id' : 'den'}${s.heat >= AD.SETTINGS.chase.heliHeat ? ' + helikopter' : ''}</div>` : ''}
      </div></section>`;
    }
    if (run && run.spot && run.target && lastView === 'street') {
      const sp = run.spot;
      const st = { rustig: 'let niet op', kijkt: 'kijkt!', belt: 'belt politie!', weg: 'weg' };
      const list = sp.by.length ? sp.by.map(b => `<li class="${b.state}">${esc(b.text)} <span>${st[b.state]}</span></li>`).join('') : '<li>Niemand op straat.</li>';
      html += `<section class="panel"><h3>Omgeving</h3><div class="body"><div class="sub">${esc(sp.place.text)}</div><ul class="bylist">${list}</ul></div></section>`;
    }
    let team = `<div class="slot me"><img src="${SP.portraitURL(1, 'player', 2)}" alt="" title="Jij"><i style="width:${s.health}%"></i></div>`;
    for (let i = 0; i < AD.SETTINGS.crew.maxSize; i++) {
      const m = s.crew[i];
      team += m ? `<div class="slot" title="${esc(m.name + ' (' + AD.CREW_ROLES[m.role].name + ')')}"><img src="${SP.portraitURL(m.uid, 'crew', 2)}" alt=""><i style="width:${Math.max(0, m.hp)}%"></i></div>` : '<div class="slot"></div>';
    }
    html += `<section class="panel"><h3>Team</h3><div class="body"><div class="grid2">${team}</div>
      ${s.crew.length ? `<div class="sub">Crew-deel: ${pct(R.crewCut())}</div>` : ''}</div></section>`;
    let gar = '';
    for (let i = 0; i < s.garage.slots; i++) {
      const c = s.garage.cars[i];
      gar += c ? `<div class="slot car${c.hot ? ' hot' : ''}" title="${esc(AD.carDef(c.id).name)}"><img src="${SP.carURL(c, 2)}" alt=""></div>` : '<div class="slot car"></div>';
    }
    html += `<section class="panel"><h3>Garage</h3><div class="body"><div class="gar">${gar}</div></div></section>`;
    el.right.innerHTML = html;
  }

  function spark(hist) {
    const h = hist.slice(-12);
    if (h.length < 2) return '';
    const pts = h.map((v, i) => `${(i / (h.length - 1) * 100).toFixed(1)},${(24 - Math.max(0, Math.min(100, v)) / 100 * 22 - 1).toFixed(1)}`).join(' ');
    return `<svg class="spark" viewBox="0 0 100 24" preserveAspectRatio="none"><line x1="0" y1="23" x2="100" y2="23" class="zero"/><line x1="0" y1="1" x2="100" y2="1" class="top"/><polyline points="${pts}"/></svg>`;
  }
  function row(label, inner, val) { return `<div class="mrow"><span class="ml">${label}</span>${inner}<span class="mval">${val}</span></div>`; }

  function renderMeter() {
    const run = AD.engine.run();
    const radar = AD.rules.radar();
    const ch = run && run.chase, sp = run && run.spot;
    if (ch) {
      const d = Math.max(0, Math.min(100, Math.round(ch.distance)));
      const delta = ch.lastDelta;
      const trend = delta == null ? '' : `<em class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲ +' : '▼ '}${delta}</em>`;
      el.meter.className = 'on';
      el.meter.innerHTML =
        row('Voorsprong', `<span class="mbar"><i style="width:${d}%"></i><b style="left:${d}%"></b></span>`, `<strong>${d}</strong>/100 ${trend}`) +
        row('Verloop', spark(ch.history || [d]), `${ch.units} eenhe${ch.units === 1 ? 'id' : 'den'}`) +
        `<div class="mnote">0 = gepakt · 100 = ontsnapt${radar >= 1 ? '' : ' · koop een politiescanner voor exacte kansen per keuze'}</div>`;
      return;
    }
    if (sp && run.target && lastView === 'street') {
      const eta = Math.max(0, sp.eta);
      const close = Math.round(Math.max(0, Math.min(1, 1 - eta / 10)) * 100);
      const etaTxt = radar >= 1 ? `~${eta.toFixed(1).replace('.', ',')} min` : eta > 6 ? 'ver weg' : eta > 3 ? 'in de buurt' : 'dichtbij!';
      const here = sp.by.filter(b => b.state !== 'weg');
      const watch = here.filter(b => b.state === 'kijkt' || b.state === 'belt').length;
      const dots = here.map(b => `<i class="p ${b.state}" title="${esc(b.text + ': ' + b.state)}"></i>`).join('') || '<span class="none">niemand</span>';
      const att = Math.round(sp.attention);
      el.meter.className = 'on';
      el.meter.innerHTML =
        row(sp.called ? '<b class="alarm">GEMELD</b>' : 'Politie', `<span class="rbar police${sp.called ? ' alarm' : ''}"><i style="width:${close}%"></i></span>`, etaTxt) +
        row('Aandacht', `<span class="rbar att"><i style="width:${att}%"></i></span>`, `<strong>${att}%</strong>`) +
        row('Omstanders', `<span class="people">${dots}</span>`, here.length ? `${here.length}${watch ? `, <b>${watch} let${watch === 1 ? '' : 'ten'} op</b>` : ''}` : '0');
      return;
    }
    el.meter.innerHTML = ''; el.meter.className = '';
  }

  UI.hud = function () {
    const s = AD.state.S;
    if (!s) return;
    const c = AD.SETTINGS;
    el['hud-day'].textContent = s.day;
    el['hud-money'].textContent = fmt(s.money);
    el['hud-debt'].textContent = fmt(s.debt);
    el['hud-costs'].textContent = fmt(c.rentPerDay);
    el['hud-level'].textContent = s.level;
    const rec = document.getElementById('hud-record');
    if (rec) rec.textContent = (s.record || 0) + '/' + c.jail.maxConvictions;
    el['hud-xp'].style.width = Math.round(s.xp / AD.rules.xpForNext(s.level) * 100) + '%';
    el['hud-heat'].style.width = Math.round(s.heat) + '%';
    const heads = c.heat.heads, per = c.heat.max / heads;
    let h = '';
    for (let i = 0; i < heads; i++) h += `<img class="head${s.heat > i * per + 0.5 ? ' on' : ''}" src="${SP.portraitURL(100, 'cop', 1)}" alt="">`;
    el['hud-heads'].innerHTML = h;
    const run = AD.engine.run();
    el['hud-loc'].textContent = run ? run.district.name : 'Schuilplaats';
  };
})();
