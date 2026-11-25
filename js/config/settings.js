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
    decayPerDay: 15,            // zoveel zakt je heat per dag (geen databases, papieren dossiers)
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

  xp: { perTier: 30, chaseBonus: 15, base: 100, growth: 1.2 },
  skillPerPoint: 0.04,          // +4% kans per vaardigheidspunt
  maxSkill: 10,
  // Leren door te doen: na (base + perLevel * huidig niveau) keer oefenen gaat een vaardigheid omhoog.
  // Een gelukte poging telt als 'ok', een mislukte als 'fail'.
  practice: { base: 5, perLevel: 3, ok: 1, fail: 0.5, speed: { inbreken: 0.5 } },   // speed: inbreken doe je zo vaak dat het half telt
  // Kennis van gereedschap en automodellen groeit door gebruik
  knowledge: { perUse: 0.01, toolMax: 0.1, perModel: 0.03, modelMax: 0.09 },

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
    maxSteps: 6,                // zoveel straten per nacht
    carsPerStreet: [4, 6],      // auto's om uit te kiezen per straat
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
    callEta: [3, 6],            // minuten tot de politie er is na een melding
    phoneWalk: [0.8, 2],        // minuten die een omstander nodig heeft om bij een telefoon te komen (geen mobieltjes)
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
    expireDays: 10,             // na zoveel dagen zonder veroordeling vervalt er een aantekening
  },

  chase: {
    escapeAt: 100,              // voorsprong 100 = ontsnapt, 0 = gepakt
    startAlarm: 40,
    startNoticed: 55,
    startFootAlarm: 50,
    driftSpeed: 10,             // effect van de topsnelheid van je auto per ronde
    pressureWeight: 8,         // hoe hard de politie per ronde inloopt
    pressurePenalty: 0.15,      // politiedruk verlaagt elke kans
    momentum: 0.12,             // voorsprong boven 50 groeit vanzelf, eronder krimpt hij (kortere achtervolgingen)
    bailOutKeep: 0.8,           // voorsprong die je houdt als je uitstapt
    wreckAt: 0.12,              // auto-conditie waarbij de motor het opgeeft
    shootoutHeat: 50,           // vanaf deze heat kan er geschoten worden
    shootoutChance: 0.35,
    heliHeat: 92,               // een helikopter komt alleen in uitzonderlijke gevallen
    loseSightAt: 60,            // vanaf deze voorsprong kan de politie je gewoon kwijtraken (geen GPS, geen camera's)
    loseSightChance: 0.45,
  },

  garage: { startSlots: 1, maxSlots: 5, slotCost: [0, 0, 800, 2000, 4500, 9000] },
  repairFactor: 0.35,
  resprayBase: 150,
  resprayFactor: 0.04,

  crew: {
    maxSize: 3, poolSize: 3,
    jobsPerLevel: 3, skillPerLevel: 0.05, maxSkill: 1.6,   // crew wordt beter van klussen
    bonusPay: 200, bonusLoyalty: 0.12, jobLoyalty: 0.03,
    doctorPerHp: 4,
    snitchBase: 0.7, snitchLoyalty: 0.6, hushMoney: 400,   // kans dat een achtergelaten crewlid praat
    holdGain: 45,                                          // voorsprong als iemand de politie ophoudt
  },

  // Buurten onthouden wat je er doet
  districtHeat: { theft: 6, alarm: 8, chase: 10, snitch: 40, decayPerDay: 12 },

  fight: { agentHp: 38, agentHit: 0.36, agentDmg: [6, 13], absorb: 0.65, reinforceFrom: 4, reinforceChance: 0.25, maxReinforce: 2, heatPerRound: 4 },

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
