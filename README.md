# AUTODIEF

Een tekstgebaseerd actiespel in je browser. Je steelt auto's, verkoopt ze en koopt beter gereedschap. Ondertussen ontloop je de politie. Wordt je gepakt, dan is het **BUSTED** en game over.
Visueel: pixel-art in de stijl van de jaren 90 (bovenaanzicht à la GTA 1). De interface heeft de sfeer van de oude Car Thief-spellen, met perkament-panelen, een stadskaart met ronde icoontjes, team- en garagepanelen en een log.

## Spelen

**Online spelen:** https://daanvr.github.io/autodief/

Of lokaal: Open `index.html` in een browser. Dat werkt zonder server. Of start een lokale server:

```bash
python3 -m http.server 8642 --directory autodief
```

en ga naar http://localhost:8642. Kiezen doe je met klikken of met de toetsen **1-9**. **M** zet het geluid aan of uit. Op de kaart kun je ook direct op de ronde icoontjes klikken.

## De spellus

1. **Schuilplaats (kaart):** winkel, garage, kroeg (crew), dokter, de Baas (schuld afbetalen), vaardigheden en onderduiken.
2. **Op pad:** kies een wijk. Elke stap op straat kom je een auto tegen of gebeurt er iets. Bij elke auto zie je per gereedschap de **slagingskans** en de **alarmkans**.
3. **Inbreken:** elke auto staat ergens (onder een lantaarnpaal, in een steeg...) en er lopen soms **omstanders** rond. Elke actie kost **minuten** en trekt **aandacht** (0-100%). Omstanders kunnen je zien, gaan kijken en de politie bellen. Daarna telt de **politie-ETA** af. Je ziet dit allemaal in balken onder het beeld. Je kunt altijd **wachten tot de kust veilig is** of **afhaken en weglopen**.
4. **Politie ziet je in de auto:** kies **wegrijden**, **uitstappen en rennen** of **doen alsof er niets is**.
5. **Achtervolging:** elke ronde een tekst-situatie met keuzes. Je *voorsprong* loopt van 0 (gepakt) tot 100 (ontsnapt). Bij hoge heat wordt er **geschoten**. Je kunt dan terugschieten met elk wapen dat je hebt, of je **crew** laten terugvuren. Je kunt ook elke ronde uitstappen en te voet verder vluchten.
6. **Gepakt?** Overgeven, omkopen, vechten of schieten (per wapen), je crew laten ingrijpen of je losrukken. Mislukt dat, dan ga je een paar dagen de **cel** in: je raakt een deel van je cash kwijt en krijgt een aantekening op je **strafblad**. Pas bij de 3e veroordeling is het game over (`jail.maxConvictions` in settings.js). Een advocaat voorkomt één aantekening.
7. **Buit:** verkoop direct aan de sloperij (weinig geld) of stal de auto in je garage. Daar kun je repareren en overspuiten, en dan verkopen aan de heler of de exporthaven (meer geld).
8. **Doel:** betaal je schuld van €50.000 af bij de Baas.

**Heat** (de politiehoofdjes) stijgt bij elke diefstal, elk alarm, elke achtervolging en elk schot. Heat zakt elke dag; onderduiken versnelt dat.
**Radar:** zonder scanner zie je bij achtervolgingen alleen vage kansen ("veilig / gok / riskant"). Met de politiescanner zie je exacte kansen. De politieradar toont ook hoe dichtbij de politie is en je pakkans. De satelliet-tracker laat het aantal eenheden en de helikopter zien.

## Voorlezen

Met de knop **Voorlezen** bovenin (of toets **V**) leest je systeemstem elk scherm voor: eerst de tekst, daarna de keuzes ("Druk 1 voor ..., 73 procent kans"). Het spel kiest automatisch de beste Nederlandse stem (op de Mac: Xander). **R** herhaalt het laatste scherm, **Esc** stopt het voorlezen. De instelling wordt onthouden. Code: `js/ui/speech.js`.

## Opnames en feedback

Het spel neemt het hele speelproces op: elk scherm met de getoonde tekst, keuzes en kansen, elke keuze (met bedenktijd en of je klikte of een toets gebruikte), klikken, hovers, muisbewegingen en de spelstaat.
Met de knop **Feedback** rechtsboven sla je een notitie op bij het scherm waar je op dat moment bent (leuk / stom / saai / onduidelijk / bug, plus vrije tekst).

- Opnames gaan naar `recordings/<sessie>.jsonl` zolang de logserver draait:

  ```bash
  python3 tools/logserver.py
  ```
- Draait de server niet, dan blijft alles in de browser bewaard en wordt het later alsnog verstuurd. Je kunt het ook downloaden via de console: `AD.rec.download()`.
- Opname staat alleen aan als je lokaal speelt (localhost of index.html openen). Op de online versie staat hij uit, tenzij je `?rec` achter de URL zet. Lokaal uitzetten kan met `?norec`. Geluid uit bij het laden: `?mute`.

## Alles aanpassen zonder de rest te raken

Het spel is opgebouwd uit losse modules. De meeste wijzigingen zijn alleen data.

| Wat wil je aanpassen? | Bestand |
|---|---|
| Balans: startgeld, schuld, huur, heat, kansformules, prijzen garage/kopers | `js/config/settings.js` |
| Auto's (waarde, slot, elektronica, alarm, snelheid, kleur, sprite) | `js/config/cars.js` |
| Winkel: gereedschap, gadgets, radar, wapens, diensten | `js/config/items.js` |
| Crew-rollen, bonussen, namen | `js/config/crew.js` |
| Wijken (politie, welke auto's) | `js/config/districts.js` |
| Plekken en omstanders bij het inbreken | `js/config/spots.js` |
| Alle tekst-situaties en keuzes (straat, politie, achtervolging, vuurgevecht), met gewicht, cooldown, wijken, varianten en vervolgsituaties | `js/config/events.js` |
| Opname van het speelproces | `js/core/recorder.js` + `tools/logserver.py` |
| Kansberekeningen (formules) | `js/core/rules.js` |
| Spelflow (schermen, volgorde) | `js/core/engine.js` |
| Pixel-sprites, iconen (als tekst-tekeningen), font, portretten | `js/render/sprites.js` |
| Scènes (kaart, straat, achtervolging, garage, winkel, kroeg) | `js/render/scene.js` |
| Kleuren en layout van de interface | `css/style.css` |
| Geluidseffecten | `js/audio/sfx.js` |

**Nieuwe achtervolgingssituatie toevoegen:** zet in `events.js` een object bij `chaseCar` of `chaseFoot`:

```js
{ id: 'tunnel', text: 'Een tunnel!', choices: [
  { label: 'Lichten uit en erin', c: { b: 0.5, s: 'handling', w: 1 },
    ok: { gain: [20, 30], text: 'Ze zien je niet meer.' },
    fail: { loss: [10, 15], damage: [10, 20], text: 'Een paaltje...' } },
] }
```

**Nieuw icoon:** teken het als 12 regels van 12 tekens in `ICONS` in `sprites.js`. Elke letter is een kleur uit `PAL`.

## Pixel-techniek

Alles wordt getekend op een canvas van **320×180**. Dat canvas wordt met een **geheel getal** opgeschaald via `image-rendering: pixelated`, met `imageSmoothingEnabled = false`. Zo blijven de pixels scherp. Auto's draaien niet met `rotate()`: ze worden per richting pixel voor pixel gespiegeld, zodat er geen wazige randen ontstaan. Het CRT-effect (scanlines) zet je aan en uit met de knop rechtsboven.

## Over Car Thief 6

De originele Car Thief 6 (Maxima Games, 2002-2006) is alleen gebruikt als **inspiratie** voor sfeer en indeling. Volgens de licentie van dat spel liggen alle rechten bij Maxima Games, en kopiëren en aanpassen is niet toegestaan. Daarom bevat deze map **geen** afbeeldingen, geluiden of teksten uit het origineel. Alles hier is nieuw gemaakt.
