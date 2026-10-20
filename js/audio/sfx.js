// =============================================================
//  GELUID: kleine retro-effecten via WebAudio (geen bestanden).
// =============================================================
window.AD = window.AD || {};

(function () {
  const A = AD.sfx = { muted: false };
  let ac = null, sirenTimer = null, sirenOsc = null, sirenGain = null;

  function ensure() {
    if (A.muted) return null;
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(freq, dur, type, vol, slideTo, delay) {
    const a = ensure(); if (!a) return;
    const t0 = a.currentTime + (delay || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol || 0.05, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol, delay, hp) {
    const a = ensure(); if (!a) return;
    const t0 = a.currentTime + (delay || 0);
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp || 400;
    src.buffer = buf; g.gain.setValueAtTime(vol || 0.1, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(a.destination); src.start(t0);
  }

  A.select = () => tone(660, 0.05, 'square', 0.03);
  A.click = () => { tone(1200, 0.03, 'square', 0.03); tone(900, 0.04, 'square', 0.03, null, 0.06); };
  A.cash = () => { tone(1320, 0.07, 'square', 0.04); tone(1760, 0.12, 'square', 0.04, null, 0.08); };
  A.levelup = () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.1, 'square', 0.04, null, i * 0.08));
  A.alarm = () => { for (let i = 0; i < 6; i++) tone(i % 2 ? 880 : 1100, 0.12, 'square', 0.035, null, i * 0.13); };
  A.radio = () => { noise(0.25, 0.04, 0, 1500); tone(440, 0.05, 'sine', 0.03, null, 0.25); };
  A.hit = () => { noise(0.1, 0.12, 0, 200); tone(120, 0.12, 'square', 0.06, 60); };
  A.crash = () => { noise(0.3, 0.15, 0, 100); tone(90, 0.25, 'sawtooth', 0.06, 40); };
  A.shots = () => { for (let i = 0; i < 3; i++) noise(0.08, 0.14, i * 0.12, 800); };
  A.freeze = () => { tone(300, 0.3, 'sawtooth', 0.05, 200); };
  A.busted = () => [392, 349, 311, 262].forEach((f, i) => tone(f, 0.25, 'square', 0.05, null, i * 0.22));

  A.siren = function (on) {
    if (!on || A.muted) {
      if (sirenTimer) { clearInterval(sirenTimer); sirenTimer = null; }
      if (sirenOsc) { try { sirenOsc.stop(); } catch (e) { } sirenOsc = null; }
      return;
    }
    if (sirenTimer) return;
    const a = ensure(); if (!a) return;
    sirenOsc = a.createOscillator(); sirenGain = a.createGain();
    sirenOsc.type = 'triangle'; sirenGain.gain.value = 0.025;
    sirenOsc.connect(sirenGain); sirenGain.connect(a.destination); sirenOsc.start();
    let hi = false;
    const flip = () => { hi = !hi; if (sirenOsc) sirenOsc.frequency.setValueAtTime(hi ? 960 : 720, a.currentTime); };
    flip(); sirenTimer = setInterval(flip, 450);
  };
  A.stopLoops = () => A.siren(false);
  A.toggle = function () { A.muted = !A.muted; if (A.muted) A.stopLoops(); return !A.muted; };
})();
