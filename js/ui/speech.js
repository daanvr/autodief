// =============================================================
//  VOORLEZEN: leest elk nieuw scherm voor met een systeemstem
//  (eerst de verhaaltekst, daarna "Druk 1 voor ...").
//  Aan/uit met de knop 'Voorlezen' bovenin of toets V.
//  R = laatste scherm nog eens, Esc = stil.
// =============================================================
window.AD = window.AD || {};

(function () {
  if (window.__AD_TTS__) return;
  window.__AD_TTS__ = true;
  const synth = window.speechSynthesis;
  const TTS = AD.tts = { on: false, rate: 1.05 };
  try { TTS.on = localStorage.getItem('autodief.tts') === '1'; } catch (e) { }
  let voice = null, last = null, btn = null, sel = null, note = null;

  // macOS 27 heeft een fout waardoor ingebouwde (niet-Premium) stemmen een harde kraak kunnen geven.
  // Zulke stemmen kiest het spel nooit zelf; de speler kan ze wel bewust aanzetten.
  let macRisk = /Mac/.test(navigator.platform || navigator.userAgent);   // onbekende versie: voorzichtig
  const ready = (async () => {
    const d = navigator.userAgentData;
    if (!macRisk || !d || !d.getHighEntropyValues) return;
    try { const v = parseInt((await d.getHighEntropyValues(['platformVersion'])).platformVersion, 10); if (v) macRisk = v >= 27; } catch (e) { }
  })();
  const risky = v => macRisk && v.localService && !/premium/i.test(v.name);
  let chosen = null;
  try { chosen = localStorage.getItem('autodief.stem'); } catch (e) { }

  // Beste Nederlandse stem zonder kraakrisico: Premium > Enhanced > overige nl-NL > nl-BE
  const voices = () => !synth ? [] : synth.getVoices().filter(v => /^nl/i.test(v.lang));
  function pickVoice() {
    const score = v => (/nl[-_]NL/i.test(v.lang) ? 10 : 0) + (/premium/i.test(v.name) ? 5 : /enhanced|verbeterd/i.test(v.name) ? 3 : 0) + (v.localService ? 1 : 0);
    const list = voices().sort((x, y) => score(y) - score(x));
    voice = list.find(v => v.voiceURI === chosen) || list.find(v => !risky(v)) || null;
    menu();
  }
  if (synth) { synth.addEventListener('voiceschanged', pickVoice); }

  // Tekst geschikt maken om uit te spreken
  function clean(t) {
    return String(t)
      .replace(/\*\*/g, '')
      .replace(/€\s?(\d{1,3}(?:\.\d{3})+|\d+)/g, (m, n) => n.replace(/\./g, '') + ' euro')
      .replace(/(\d+)%/g, '$1 procent')
      .replace(/~/g, 'ongeveer ')
      .replace(/(\d),(\d)/g, '$1 komma $2')
      .replace(/\s*·\s*/g, ', ')
      .replace(/→/g, ' naar ')
      .replace(/\bmin\b/g, 'minuten')
      .replace(/"/g, '');
  }

  function say(parts) {
    if (!synth) return;
    if (synth.speaking || synth.pending) synth.cancel();
    if (!voice) return;                          // liever stil dan een stem die kan kraken
    let list = parts.filter(Boolean).map(clean);
    if (risky(voice)) list = [list.map(t => /[.!?]$/.test(t.trim()) ? t : t + '.').join(' ')];   // één keer starten en stoppen
    list.forEach(t => {
      const u = new SpeechSynthesisUtterance(t);
      u.lang = voice.lang; u.voice = voice; u.rate = TTS.rate;
      synth.speak(u);
    });
  }

  function partsFor(o) {
    const parts = [];
    (o.lines || []).filter(Boolean).forEach(l => {
      const line = typeof l === 'string' ? { t: l } : l;
      if (/^>/.test(line.t)) return;            // je eigen gekozen actie niet herhalen
      parts.push(line.t);
    });
    const ch = (o.choices || []).filter(Boolean);
    ch.forEach((c, i) => {
      if (c.disabled) return;
      const key = i < 9 ? i + 1 : i === 9 ? 0 : null;
      if (key == null) return;
      let s = `Druk ${key} voor ${c.label}`;
      if (c.chance != null && c.odds === 'exact') s += `, ${Math.round(c.chance * 100)} procent kans`;
      else if (c.chance != null && c.odds === 'vague') s += c.chance >= 0.66 ? ', veilig' : c.chance >= 0.4 ? ', gok' : ', riskant';
      parts.push(s + '.');
    });
    return parts;
  }
  TTS.speakScreen = o => say(partsFor(o));
  TTS.stop = () => { if (synth) synth.cancel(); };

  function setOn(on) {
    TTS.on = on;
    try { localStorage.setItem('autodief.tts', on ? '1' : '0'); } catch (e) { }
    if (btn) { btn.textContent = on ? 'Voorlezen aan' : 'Voorlezen uit'; btn.classList.toggle('off', !on); }
    menu();
    if (on && last) ready.then(() => { pickVoice(); if (TTS.on) TTS.speakScreen(last); }); else TTS.stop();
    if (AD.rec) AD.rec.log('tts', { on });
  }
  TTS.toggle = () => setOn(!TTS.on);

  // Stemkeuze en uitleg, alleen zichtbaar als voorlezen aan staat
  function menu() {
    if (!sel) return;
    const list = voices();
    sel.innerHTML = '';
    const add = (value, text) => { const o = document.createElement('option'); o.value = value; o.textContent = text; sel.appendChild(o); };
    if (!voice) add('', 'Kies een stem');
    list.forEach(v => add(v.voiceURI, v.name.replace(/\s*\(.*?\)\s*$/, m => /premium|enhanced|verbeterd/i.test(m) ? m : '') + (risky(v) ? ' (kan kraken)' : v.localService ? '' : ' (online)')));
    sel.value = voice ? voice.voiceURI : '';
    sel.style.display = TTS.on && list.length ? '' : 'none';
    note.style.display = TTS.on && (!voice || risky(voice)) ? 'block' : 'none';
    note.textContent = !list.length ? 'Deze browser heeft geen Nederlandse stem. In Google Chrome werkt voorlezen meestal wel.'
      : !voice ? 'Voorlezen blijft stil: macOS 27 heeft een fout waardoor de ingebouwde stemmen hard kunnen kraken. Speel in Google Chrome (online stem), installeer een Premium-stem, of kies hierboven bewust een stem.'
        : 'Let op: deze stem kan op macOS 27 hard kraken. Zet je volume laag.';
  }

  // Om de UI heen hangen: elk nieuw scherm voorlezen als het aan staat
  function hook() {
    if (!AD.ui || !AD.ui.render || AD.ui.render.__tts) return false;
    const orig = AD.ui.render;
    const wrapped = function (o) {
      const r = orig.apply(this, arguments);
      last = o;
      if (TTS.on) TTS.speakScreen(o);
      return r;
    };
    Object.keys(orig).forEach(k => { wrapped[k] = orig[k]; });
    wrapped.__tts = true;
    AD.ui.render = wrapped;
    return true;
  }

  function button() {
    if (document.getElementById('tts-btn')) return;
    const bar = document.querySelector('.tbtns'); if (!bar) return;
    btn = document.createElement('button');
    btn.id = 'tts-btn'; btn.className = 'tbtn';
    btn.title = 'Lees de tekst en keuzes voor (V). R = herhaal, Esc = stil.';
    btn.addEventListener('click', () => TTS.toggle());
    bar.insertBefore(btn, bar.firstChild);
    btn.textContent = TTS.on ? 'Voorlezen aan' : 'Voorlezen uit';
    btn.classList.toggle('off', !TTS.on);
    sel = document.createElement('select');
    sel.id = 'tts-voice'; sel.className = 'tbtn'; sel.title = 'Stem om mee voor te lezen'; sel.style.maxWidth = '190px';
    sel.addEventListener('change', () => {
      chosen = sel.value;
      try { localStorage.setItem('autodief.stem', chosen); } catch (e) { }
      pickVoice(); if (TTS.on && last) TTS.speakScreen(last);
    });
    bar.insertBefore(sel, btn);
    note = document.createElement('div');
    note.id = 'tts-note';
    note.style.cssText = 'display:none;background:#f8e0a0;border-bottom:2px solid #7a4a20;padding:4px 12px;font-size:19px;color:#8a0c0c';
    document.querySelector('.titlebar').after(note);
    ready.then(pickVoice);
    if (!synth) { btn.disabled = true; btn.title = 'Deze browser kan niet voorlezen'; }
  }

  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'v' || e.key === 'V') TTS.toggle();
    else if ((e.key === 'r' || e.key === 'R') && last) TTS.speakScreen(last);
    else if (e.key === 'Escape') TTS.stop();
  });

  function init() { hook(); button(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
