// =============================================================
//  WIJKEN
//  police     : politie-aanwezigheid (0..1) — maakt alles riskanter
//  tierWeights: hoe vaak elke tier auto voorkomt
//  style      : uiterlijk van de gebouwen (brick | city | villa | glass)
// =============================================================
window.AD = window.AD || {};

AD.DISTRICTS = [
  { id: 'arbeiders', name: 'Arbeiderswijk', minLevel: 1, police: 0.15, style: 'brick',
    desc: 'Oude barrels, weinig blauw op straat.',
    tierWeights: { 1: 70, 2: 28, 3: 2 } },
  { id: 'centrum', name: 'Centrum', minLevel: 1, police: 0.35, style: 'city',
    desc: 'Van alles wat. Meer politie.',
    tierWeights: { 1: 30, 2: 45, 3: 22, 4: 3 } },
  { id: 'villapark', name: 'Villapark', minLevel: 3, police: 0.5, style: 'villa',
    desc: 'Dure auto\'s, goede sloten, buurtwacht.',
    tierWeights: { 2: 25, 3: 45, 4: 25, 5: 5 } },
  { id: 'haven', name: 'Zakenwijk & Haven', minLevel: 5, police: 0.65, style: 'glass',
    desc: 'Supercars. En de politie weet dat ook.',
    tierWeights: { 3: 30, 4: 45, 5: 25 } },
];
