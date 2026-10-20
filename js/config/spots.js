// =============================================================
//  PLEKKEN & OMSTANDERS (voor het inbreken)
//  Elke auto staat ergens (place) en er lopen 0-4 omstanders rond.
//  Elke actie kost tijd (minuten) en maakt lawaai (aandacht 0-100).
//  Omstanders kunnen je zien en de politie bellen; de politie-ETA telt af.
//
//  place.see     : hoe goed je te zien bent (licht, open ruimte)
//  place.crowd   : extra omstanders
//  bystander.call  : hoe snel diegene de politie belt
//  bystander.leaves: hoe snel diegene weer weggaat
// =============================================================
window.AD = window.AD || {};

AD.SPOTS = {
  places: [
    { id: 'lantaarn', text: 'onder een felle lantaarnpaal', see: 1.35, weight: 3 },
    { id: 'straat', text: 'gewoon langs de stoep', see: 1.0, weight: 4 },
    { id: 'donker', text: 'in een donkere hoek waar de lamp kapot is', see: 0.55, weight: 2 },
    { id: 'steeg', text: 'in een steegje achter de winkels', see: 0.5, weight: 2, districts: ['centrum', 'arbeiders'] },
    { id: 'cafe', text: 'recht tegenover een café dat nog open is', see: 1.2, crowd: 1, weight: 1.5, districts: ['centrum', 'arbeiders'] },
    { id: 'parkeerplaats', text: 'op een lege parkeerplaats achter de supermarkt', see: 0.8, weight: 2, districts: ['arbeiders', 'centrum'] },
    { id: 'parkeergarage', text: 'op de tweede verdieping van een parkeergarage', see: 0.75, weight: 1.5, districts: ['centrum', 'haven'] },
    { id: 'oprit', text: 'op een oprit, met licht achter de ramen', see: 1.1, weight: 3, districts: ['villapark', 'arbeiders'] },
    { id: 'heg', text: 'half verstopt achter een hoge heg', see: 0.6, weight: 2, districts: ['villapark'] },
    { id: 'kade', text: 'langs de kade, tussen de containers', see: 0.7, weight: 2, districts: ['haven'] },
    { id: 'lobby', text: 'voor een kantoorlobby met een portier', see: 1.3, crowd: 1, weight: 2, districts: ['haven'] },
  ],

  // [min, max] omstanders per wijk
  crowd: { arbeiders: [0, 2], centrum: [0, 3], villapark: [0, 2], haven: [0, 2] },

  bystanders: [
    { id: 'hond', text: 'een man die zijn hond uitlaat', call: 0.35, leaves: 0.6 },
    { id: 'raam', text: 'een buurvrouw achter het raam', call: 0.5, leaves: 0.25, districts: ['arbeiders', 'villapark'] },
    { id: 'stel', text: 'een stelletje op een bankje', call: 0.15, leaves: 0.45 },
    { id: 'jongeren', text: 'een groepje hangjongeren', call: 0.04, leaves: 0.3, districts: ['arbeiders', 'centrum'] },
    { id: 'dronken', text: 'een dronken man die een liedje zingt', call: 0.03, leaves: 0.5, districts: ['arbeiders', 'centrum'] },
    { id: 'taxi', text: 'een taxichauffeur die op een klant wacht', call: 0.3, leaves: 0.4, districts: ['centrum', 'haven'] },
    { id: 'fietser', text: 'een fietser', call: 0.1, leaves: 1.2 },
    { id: 'bezorger', text: 'een maaltijdbezorger op een scooter', call: 0.08, leaves: 1.0, districts: ['centrum', 'arbeiders', 'villapark'] },
    { id: 'jogger', text: 'een nachtelijke hardloper', call: 0.12, leaves: 1.3, districts: ['villapark', 'centrum'] },
    { id: 'beveiliger', text: 'een beveiliger op ronde', call: 0.7, leaves: 0.35, districts: ['haven', 'villapark'] },
    { id: 'portier', text: 'de portier van het gebouw', call: 0.6, leaves: 0.1, districts: ['haven'] },
    { id: 'roker', text: 'iemand die buiten een sigaret rookt', call: 0.25, leaves: 0.7 },
  ],
};
