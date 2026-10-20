// Willekeur-hulpjes
window.AD = window.AD || {};

AD.rng = {
  chance(p) { return Math.random() < p; },
  range(a, b) { return a + Math.random() * (b - a); },
  int(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  // [min,max] -> geheel getal ertussen, getal -> getal, leeg -> 0
  roll(spec) {
    if (Array.isArray(spec)) return this.int(spec[0], spec[1]);
    return spec || 0;
  },
  weighted(list, weightFn) {
    const total = list.reduce((s, x) => s + weightFn(x), 0);
    let r = Math.random() * total;
    for (const x of list) { r -= weightFn(x); if (r <= 0) return x; }
    return list[list.length - 1];
  },
  // Vaste reeks voor sprites/achtergronden (mulberry32)
  seeded(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
};
