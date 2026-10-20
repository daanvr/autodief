// Opstarten
(function () {
  // Pixel-ruis voor de perkament-achtergrond
  function paper() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const x = c.getContext('2d'), r = AD.rng.seeded(3);
    x.fillStyle = '#e2c290'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 900; i++) {
      const v = r();
      x.fillStyle = v < 0.4 ? '#d8b680' : v < 0.7 ? '#e8cc9c' : v < 0.9 ? '#dcbc88' : '#cfa972';
      x.fillRect(Math.floor(r() * 64), Math.floor(r() * 64), 1 + Math.floor(r() * 2), 1);
    }
    document.documentElement.style.setProperty('--paper', `url(${c.toDataURL()})`);
  }
  function start() {
    if (/[?&]mute\b/.test(location.search)) AD.sfx.muted = true;
    paper();
    AD.scene.init(document.getElementById('scene'));
    AD.ui.init();
    AD.engine.title();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
