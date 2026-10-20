// =============================================================
//  AUTO'S
//  security    : hoe moeilijk de deur open gaat (0..1)
//  tech        : hoe elektronisch de beveiliging is (0 = oud slot, 1 = keyless)
//                mechanisch gereedschap werkt slecht op hoge tech, elektronisch juist goed
//  alarm       : basiskans op alarm
//  immobilizer : hoe moeilijk de motor te starten is
//  speed / handling / durability : rijeigenschappen in de achtervolging (0..1)
//  look        : sprite (w x h in pixels, kind = car | van | sport | taxi | suv)
// =============================================================
window.AD = window.AD || {};

AD.CARS = [
  // ---- Tier 1: oude barrels ----
  { id: 'pandino', name: 'Pandino', tier: 1, value: 650,
    security: 0.10, tech: 0.0, alarm: 0.05, immobilizer: 0.05,
    speed: 0.30, handling: 0.60, durability: 0.35,
    look: { w: 8, h: 14, kind: 'car' }, colors: ['#d8c23a', '#c0392b', '#3c78c8', '#e8e0d0'] },
  { id: 'brikkie', name: 'Brikkie 1.1', tier: 1, value: 900,
    security: 0.14, tech: 0.0, alarm: 0.08, immobilizer: 0.08,
    speed: 0.35, handling: 0.50, durability: 0.45,
    look: { w: 10, h: 16, kind: 'car' }, colors: ['#7a8a3a', '#a05a2a', '#8a8a8a'] },
  { id: 'krabbel', name: 'Krabbel', tier: 1, value: 1100,
    security: 0.12, tech: 0.0, alarm: 0.04, immobilizer: 0.05,
    speed: 0.30, handling: 0.45, durability: 0.55,
    look: { w: 10, h: 15, kind: 'car' }, colors: ['#4aa0c8', '#e07a2a', '#e8d8a0', '#5aa04a'] },

  // ---- Tier 2: gezinsauto's en werkpaarden ----
  { id: 'familia', name: 'Familia Combi', tier: 2, value: 2400,
    security: 0.28, tech: 0.10, alarm: 0.18, immobilizer: 0.20,
    speed: 0.50, handling: 0.45, durability: 0.60,
    look: { w: 10, h: 18, kind: 'car' }, colors: ['#5a6a8a', '#8a2a2a', '#c8c8c8'] },
  { id: 'cabbie', name: 'Cabbie Taxi', tier: 2, value: 2100,
    security: 0.25, tech: 0.10, alarm: 0.12, immobilizer: 0.20,
    speed: 0.50, handling: 0.50, durability: 0.65,
    look: { w: 10, h: 18, kind: 'taxi' }, colors: ['#f0c020'] },
  { id: 'bestel', name: 'Bestelbus', tier: 2, value: 2900,
    security: 0.22, tech: 0.05, alarm: 0.10, immobilizer: 0.18,
    speed: 0.38, handling: 0.30, durability: 0.80,
    look: { w: 12, h: 22, kind: 'van' }, colors: ['#e8e8e8', '#3a5a9a', '#c84a2a'] },

  // ---- Tier 3: snelle jongens ----
  { id: 'stallion', name: 'Stallion GT', tier: 3, value: 7000,
    security: 0.45, tech: 0.25, alarm: 0.35, immobilizer: 0.35,
    speed: 0.78, handling: 0.55, durability: 0.50,
    look: { w: 10, h: 18, kind: 'sport' }, colors: ['#c82020', '#202020', '#e8e8e8'] },
  { id: 'bavaria', name: 'Bavaria 525', tier: 3, value: 9000,
    security: 0.52, tech: 0.45, alarm: 0.40, immobilizer: 0.45,
    speed: 0.70, handling: 0.65, durability: 0.60,
    look: { w: 10, h: 18, kind: 'car' }, colors: ['#1a2a4a', '#5a5a5a', '#e8e8e8'] },
  { id: 'hothatch', name: 'Hatch R', tier: 3, value: 6000,
    security: 0.40, tech: 0.30, alarm: 0.30, immobilizer: 0.30,
    speed: 0.70, handling: 0.80, durability: 0.45,
    look: { w: 10, h: 15, kind: 'sport' }, colors: ['#e8e8e8', '#2a8a3a', '#2a5ac8'] },

  // ---- Tier 4: luxe ----
  { id: 'panther', name: 'Panther SUV', tier: 4, value: 18000,
    security: 0.65, tech: 0.65, alarm: 0.55, immobilizer: 0.60,
    speed: 0.62, handling: 0.40, durability: 0.90,
    look: { w: 12, h: 20, kind: 'suv' }, colors: ['#101010', '#e8e8e8', '#3a3a4a'] },
  { id: 'mercator', name: 'Mercator S', tier: 4, value: 23000,
    security: 0.70, tech: 0.75, alarm: 0.60, immobilizer: 0.65,
    speed: 0.75, handling: 0.60, durability: 0.75,
    look: { w: 10, h: 20, kind: 'car' }, colors: ['#8a8a92', '#101010', '#4a2a2a'] },

  // ---- Tier 5: supercars ----
  { id: 'itali', name: 'Itali Turbo', tier: 5, value: 45000,
    security: 0.80, tech: 0.80, alarm: 0.70, immobilizer: 0.75,
    speed: 0.92, handling: 0.85, durability: 0.45,
    look: { w: 10, h: 18, kind: 'sport' }, colors: ['#e83a1a', '#f0d020'] },
  { id: 'furore', name: 'Furore V12', tier: 5, value: 70000,
    security: 0.86, tech: 0.90, alarm: 0.75, immobilizer: 0.80,
    speed: 0.97, handling: 0.80, durability: 0.50,
    look: { w: 12, h: 20, kind: 'sport' }, colors: ['#e8e8e8', '#1a1a1a', '#7a1ac8'] },
];

// Look-ups voor speciale voertuigen die je niet kunt stelen
AD.POLICE_LOOK = { w: 10, h: 18, kind: 'police' };

AD.carDef = function (id) { return AD.CARS.find(c => c.id === id); };
