// =============================================================
//  BALANS & INSTELLINGEN
//  Alle getallen die het spel moeilijker/makkelijker maken staan hier.
//  Kansen zijn 0..1, geld in euro's, heat (gezocht-niveau) 0..100.
// =============================================================
window.AD = window.AD || {};

AD.SETTINGS = {
  startMoney: 150,
  startItems: ['schroevendraaier'],
  rentPerDay: 20,               // huur van je schuilplaats per dag

  // Je staat in het krijt bij de Baas. Afbetalen = gewonnen.
  debt: { start: 50000, interestPerDay: 0 },  // rente per dag, bv. 0.002 = 0,2%

  heat: {
    max: 100,
    heads: 4,                   // aantal politiehoofdjes in de HUD (GTA1 had er 4)
    decayPerDay: 12,            // zoveel zakt je heat per nieuwe dag
    lieLowDecay: 35,            // extra daling bij onderduiken
    lieLowCost: 60,
  },

  heatGain: {
    theftPerTier: 4,            // heat per diefstal = tier * dit
    alarm: 8,
    chase: 6,
    escape: 4,
    fightCop: 15,               // extra bovenop wapen-heat bij verzet tegen arrestatie
    bribe: 5,
  },

  health: { max: 100, regenPerDay: 15, doctorCostPerHp: 6 },

  xp: { perTier: 25, chaseBonus: 15, base: 100, growth: 1.45 },
  skillPerPoint: 0.04,          // +4% kans per vaardigheidspunt
  maxSkill: 10,

  breakin: {
    base: 0.9,                  // kans = base - beveiliging + gereedschap + skill
    min: 0.03, max: 0.97,
    retryPenalty: 0.12,         // elke nieuwe poging: minder kans...
    retryAlarmBonus: 0.12,      // ...en meer kans op alarm
    failAlarmBonus: 0.12,       // mislukken maakt meer lawaai
    ownerChance: 0.1,           // kans dat de eigenaar terugkomt
  },

  start: { base: 0.95, min: 0.05, max: 0.98, panicPenalty: 0.15, retryPenalty: 0.1, failAlarm: 0.15 },

  street: {
    maxSteps: 8,                // zoveel 'stappen' per nacht
    eventChance: 0.15,          // kans op een straat-gebeurtenis (de rest: een auto)
    suspicionPerStep: 4,
    patrolBase: 0.02,
  },

  // Inbraak-scène: tijd, aandacht, omstanders, politie-ETA (zie spots.js)
  scene: {
    patrolEtaBase: 9,           // minuten tot er een patrouille langskomt...
    patrolEtaPolice: 6,         // ...min politie-aanwezigheid van de wijk * dit
    patrolEtaHeat: 0.04,        // ...min heat * dit
    patrolEtaMin: 1.5,
    callEta: [2, 4],            // minuten tot de politie er is na een melding
    waitTime: 2,                // 'wachten tot de kust veilig is'
    callShare: 0.6,             // kans dat een omstander die je ziet ook echt belt
    noisePerMinute: 6,          // aandacht per minuut prutsen
    toolNoise: 60,              // tool.noise * dit = extra aandacht
  },

  // Kans dat de politie je ziet wegrijden met een gestolen auto
  notice: { base: 0.04, policeWeight: 0.2, heatWeight: 0.003, perTier: 0.015 },

  // Gepakt = cel + strafblad. Pas bij maxConvictions is het echt game over (zet op 1 voor hardcore).
  jail: {
    maxConvictions: 3,
    baseDays: 2,                // dagen cel...
    daysPerHeat: 0.08,          // ...plus heat * dit
    confiscate: 0.3,            // deel van je cash dat in beslag wordt genomen
    heatAfter: 30,              // heat na vrijlating
  },

  chase: {
    escapeAt: 100,              // voorsprong 100 = ontsnapt, 0 = gepakt
    startAlarm: 40,
    startNoticed: 55,
    startFootAlarm: 50,
    driftSpeed: 10,             // effect van de topsnelheid van je auto per ronde
    pressureWeight: 10,         // hoe hard de politie per ronde inloopt
    pressurePenalty: 0.15,      // politiedruk verlaagt elke kans
    momentum: 0.12,             // voorsprong boven 50 groeit vanzelf, eronder krimpt hij (kortere achtervolgingen)
    bailOutKeep: 0.8,           // voorsprong die je houdt als je uitstapt
    wreckAt: 0.12,              // auto-conditie waarbij de motor het opgeeft
    shootoutHeat: 50,           // vanaf deze heat kan er geschoten worden
    shootoutChance: 0.35,
    heliHeat: 75,
  },

  garage: { startSlots: 1, maxSlots: 5, slotCost: [0, 0, 800, 2000, 4500, 9000] },
  repairFactor: 0.35,
  resprayBase: 150,
  resprayFactor: 0.04,

  crew: { maxSize: 3, poolSize: 3 },

  // Wie koopt je auto's?
  buyers: [
    { id: 'sloper', name: 'Sloperij Joop', mult: 0.4, needCold: false,
      desc: 'Geen vragen, contant. Betaalt weinig.' },
    { id: 'heler', name: 'Heler Dirk', mult: 0.65, needCold: true, minCondition: 0.4,
      desc: 'Betere prijs, maar alleen voor overgespoten auto\'s.' },
    { id: 'export', name: 'Exporthaven', mult: 0.9, needCold: true, minTier: 3, minCondition: 0.8, risk: 0.12,
      desc: 'Topprijs voor dure, gave auto\'s. Kans op douanecontrole.' },
  ],
};
