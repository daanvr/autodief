// =============================================================
//  RECORDER: legt het hele speelproces vast om later te analyseren.
//  - elk scherm (titel, tekst, aangeboden keuzes + kansen, spelstaat)
//  - elke keuze (welke, hoe: klik/toets/kaart, bedenktijd)
//  - klikken, toetsen, hover over keuzes, muispositie (2x per seconde)
//  - feedback-notities die je tijdens het spelen typt
//  Opslag: localStorage (per sessie) + POST naar tools/logserver.py,
//  die het wegschrijft in autodief/recordings/<sessie>.jsonl
//  Uitzetten: ?norec in de URL.
// =============================================================
window.AD = window.AD || {};

(function () {
  if (window.__AD_REC__) return;
  if (/[?&]norec\b/.test(location.search)) return;
  // Alleen opnemen bij lokaal spelen (of online met ?rec), nooit stiekem bij bezoekers
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(location.hostname);
  if (!isLocal && !/[?&]rec\b/.test(location.search)) return;
  window.__AD_REC__ = true;

  const ENDPOINT = 'http://127.0.0.1:8643/log';
  const LS_PREFIX = 'autodief.rec.';
  const MAX_LOCAL = 6000;
  const session = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '_' + Math.random().toString(36).slice(2, 6);
  let seq = 0, queue = [], local = [], shownAt = Date.now(), lastInput = 'onbekend', lastHover = null, lastMove = 0;

  const REC = AD.rec = { session };

  function snap() {
    try {
      const S = AD.state && AD.state.S; if (!S) return null;
      const run = AD.engine && AD.engine.run && AD.engine.run();
      return {
        day: S.day, money: S.money, debt: S.debt, heat: Math.round(S.heat), health: S.health, level: S.level, xp: S.xp,
        inv: Object.keys(S.inv).filter(k => S.inv[k] > 0), crew: S.crew.map(m => m.role), garage: S.garage.cars.length,
        district: run ? run.district.id : null, step: run ? run.step : null,
        chase: run && run.chase ? { mode: run.chase.mode, distance: Math.round(run.chase.distance), round: run.chase.round, units: run.chase.units } : null,
        car: run && run.car ? { id: run.car.id, cond: run.car.condition } : null,
        target: run && run.target ? run.target.id : null,
      };
    } catch (e) { return null; }
  }

  function rec(type, data) {
    const e = Object.assign({ s: session, n: seq++, t: Date.now(), type }, data || {});
    queue.push(e); local.push(e);
    if (local.length > MAX_LOCAL) local.splice(0, local.length - MAX_LOCAL);
    return e;
  }
  REC.log = rec;

  function saveLocal() {
    try { localStorage.setItem(LS_PREFIX + session, JSON.stringify(local)); } catch (e) { /* vol */ }
  }
  function flush(beacon) {
    saveLocal();
    if (!queue.length) return;
    const batch = queue.splice(0, 300);
    const body = JSON.stringify(batch);
    if (beacon && navigator.sendBeacon) {
      try { navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain' })); return; } catch (e) { }
    }
    fetch(ENDPOINT, { method: 'POST', body, headers: { 'Content-Type': 'text/plain' }, keepalive: true })
      .then(r => { if (!r.ok) throw new Error(r.status); REC.online = true; })
      .catch(() => { REC.online = false; queue = batch.concat(queue).slice(-3000); });
  }
  setInterval(flush, 3000);
  window.addEventListener('pagehide', () => { rec('pagehide'); flush(true); });
  document.addEventListener('visibilitychange', () => { rec('visibility', { state: document.visibilityState }); if (document.visibilityState === 'hidden') flush(true); });

  // ---------- Schermen en keuzes ----------
  function hook() {
    if (!AD.ui || !AD.ui.render || AD.ui.render.__rec) return false;
    const orig = AD.ui.render;
    const wrapped = function (o) {
      try {
        const list = (o.choices || []).filter(Boolean);
        list.forEach((c, i) => {
          if (!c.act || c.__rec) return;
          const act = c.act;
          c.act = function () {
            rec('pick', { i: i + 1, label: c.label, chance: c.chance != null ? Math.round(c.chance * 100) : null, odds: c.odds, via: lastInput, think: Date.now() - shownAt, title: o.title });
            lastInput = 'onbekend';
            return act.apply(this, arguments);
          };
          c.__rec = true;
        });
      } catch (e) { }
      const r = orig.apply(this, arguments);
      try {
        shownAt = Date.now();
        rec('screen', {
          title: o.title, view: o.view,
          lines: (o.lines || []).filter(Boolean).map(l => typeof l === 'string' ? l : (l.c ? '[' + l.c + '] ' : '') + l.t),
          choices: (o.choices || []).filter(Boolean).map(c => ({ label: c.label, chance: c.chance != null ? Math.round(c.chance * 100) : null, odds: c.odds, off: c.disabled ? (c.reason || true) : undefined })),
          state: snap(),
        });
      } catch (e) { }
      return r;
    };
    wrapped.__rec = true;
    AD.ui.render = wrapped;
    return true;
  }
  if (!hook()) document.addEventListener('DOMContentLoaded', hook);

  // ---------- Invoer ----------
  function describe(el) {
    if (!el || !el.closest) return null;
    const ch = el.closest('.choice'); if (ch) return { kind: 'keuze', text: ch.querySelector('.lbl') ? ch.querySelector('.lbl').textContent : ch.textContent.trim().slice(0, 80), disabled: ch.classList.contains('disabled') };
    if (el.id === 'scene') return { kind: 'kaart' };
    const b = el.closest('button'); if (b) return { kind: 'knop', text: (b.id || b.textContent.trim()).slice(0, 40) };
    const p = el.closest('.panel'); if (p) { const h = p.querySelector('h3'); return { kind: 'paneel', text: h ? h.textContent : '' }; }
    return { kind: el.tagName.toLowerCase() };
  }
  document.addEventListener('click', e => {
    const d = describe(e.target);
    lastInput = d && d.kind === 'kaart' ? 'kaart' : 'klik';
    const sc = document.getElementById('scene');
    let canvas = null;
    if (d && d.kind === 'kaart' && sc) { const r = sc.getBoundingClientRect(); canvas = [Math.round((e.clientX - r.left) / r.width * 320), Math.round((e.clientY - r.top) / r.height * 180)]; }
    rec('click', { x: e.clientX, y: e.clientY, w: innerWidth, h: innerHeight, on: d, canvas });
  }, true);
  document.addEventListener('keydown', e => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    lastInput = 'toets';
    rec('key', { key: e.key });
  }, true);
  document.addEventListener('mouseover', e => {
    const ch = e.target.closest && e.target.closest('.choice');
    const label = ch ? (ch.querySelector('.lbl') || ch).textContent : null;
    if (label && label !== lastHover) rec('hover', { label });
    lastHover = label;
  }, true);
  document.addEventListener('pointermove', e => {
    const now = Date.now(); if (now - lastMove < 500) return; lastMove = now;
    rec('move', { x: e.clientX, y: e.clientY, w: innerWidth, h: innerHeight });
  }, { passive: true });
  window.addEventListener('scroll', () => { const now = Date.now(); if (now - lastMove < 500) return; lastMove = now; rec('scroll', { y: Math.round(scrollY) }); }, { passive: true });
  window.addEventListener('error', e => rec('error', { msg: e.message, src: e.filename, line: e.lineno }));

  // ---------- Feedback-notities ----------
  function feedbackUI() {
    if (document.getElementById('fb-btn')) return;
    const bar = document.querySelector('.tbtns'); if (!bar) return;
    const btn = document.createElement('button');
    btn.id = 'fb-btn'; btn.className = 'tbtn'; btn.textContent = 'Feedback';
    btn.title = 'Schrijf een notitie bij wat je nu ziet (wordt opgeslagen in de opname)';
    bar.insertBefore(btn, bar.firstChild);
    const box = document.createElement('div');
    box.id = 'fb-box';
    box.style.cssText = 'display:none;position:fixed;right:12px;top:44px;z-index:50;width:min(360px,calc(100vw - 24px));background:#f4dcb0;border:2px solid #7a4a20;box-shadow:3px 3px 0 rgba(0,0,0,.35);padding:8px;font-family:VT323,monospace;font-size:19px;color:#3a2410';
    box.innerHTML = '<div style="margin-bottom:4px">Wat vind je hiervan? (wordt bij dit scherm opgeslagen)</div>' +
      '<div style="display:flex;gap:4px;margin-bottom:4px"><button data-m="leuk" class="tbtn">Leuk</button><button data-m="stom" class="tbtn">Stom</button><button data-m="saai" class="tbtn">Saai</button><button data-m="onduidelijk" class="tbtn">Onduidelijk</button><button data-m="bug" class="tbtn">Bug</button></div>' +
      '<textarea id="fb-text" rows="3" style="width:100%;font:inherit;background:#fff8e8;border:1px solid #7a4a20"></textarea>' +
      '<div style="display:flex;gap:6px;justify-content:flex-end;margin-top:4px"><span id="fb-ok" style="flex:1;color:#3a8a2a"></span><button id="fb-cancel" class="tbtn">Sluiten</button><button id="fb-save" class="tbtn">Opslaan</button></div>';
    document.body.appendChild(box);
    let mood = null;
    btn.addEventListener('click', () => { box.style.display = box.style.display === 'none' ? 'block' : 'none'; if (box.style.display === 'block') document.getElementById('fb-text').focus(); });
    box.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => { mood = b.dataset.m; box.querySelectorAll('[data-m]').forEach(x => x.style.outline = x === b ? '2px solid #b02020' : ''); }));
    document.getElementById('fb-cancel').addEventListener('click', () => { box.style.display = 'none'; });
    document.getElementById('fb-save').addEventListener('click', () => {
      const ta = document.getElementById('fb-text');
      if (!ta.value.trim() && !mood) return;
      const title = document.getElementById('title');
      const log = document.getElementById('log');
      rec('note', { mood, text: ta.value.trim(), title: title ? title.textContent : '', log: log ? log.innerText.slice(-600) : '', state: snap() });
      flush();
      ta.value = ''; mood = null; box.querySelectorAll('[data-m]').forEach(x => x.style.outline = '');
      document.getElementById('fb-ok').textContent = 'Opgeslagen!';
      setTimeout(() => { document.getElementById('fb-ok').textContent = ''; box.style.display = 'none'; }, 900);
    });
    box.addEventListener('keydown', e => e.stopPropagation());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', feedbackUI); else feedbackUI();

  // Alles downloaden als JSON (in de console: AD.rec.download())
  REC.download = function () {
    const all = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(LS_PREFIX)) { try { all.push(...JSON.parse(localStorage.getItem(k))); } catch (e) { } } }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(all)], { type: 'application/json' }));
    a.download = 'autodief-opnames.json'; a.click();
  };

  rec('start', { url: location.href, ua: navigator.userAgent, w: innerWidth, h: innerHeight, state: snap(), title: (document.getElementById('title') || {}).textContent });
})();
