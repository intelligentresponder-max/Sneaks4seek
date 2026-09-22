# Übergabe: Sneaks4seek — Design-Info für Claude Code

Stand: aus einer Chat-Session zusammengetragen, Repo-Werte direkt aus `main` geprüft.

## Repo & Workflow

```
https://github.com/intelligentresponder-max/Sneaks4seek.git
```
- Branch: **main** (`git push origin main`)
- Live: https://intelligentresponder-max.github.io/Sneaks4seek/ (großes S Pflicht)
- **Wichtig:** Bisheriger Workflow war, dass Claude keinen Push-Zugriff hat — Änderungen werden lokal committet und als Patch/Datei übergeben, André pusht selbst. Falls Claude Code direkten Terminalzugriff hat und selbst pushen soll, das explizit mit André klären, nicht stillschweigend abweichen.

## Design-Tokens (aus `assets/css/theme.css`, wörtlich)

```css
--paper:      #C4A67A;   /* Kraftpapier-Ton */
--paper-dark: #AE8F62;   /* Hintergrund-Verlauf, dunkler */
--ink:        #1B1815;   /* Tiefschwarz-Tinte */
--sock:       #F6F2E9;   /* Sock-Weiß */
--stamp:      #C1442D;   /* Stempel-Rot — Akzent/Fehler/Hover */
--muted:      #8B8478;   /* gedämpftes Grau */
--line: rgba(27,24,21,.22);
--dash: rgba(27,24,21,.35);
--radius: 16px;

--mono:    "IBM Plex Mono", ui-monospace, "Courier New", monospace;
--body:    "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
--display: "Oswald", Impact, Haettenschweiler, sans-serif;
```

**Offen — noch keine finale Entscheidung:** Lime-Grün-Akzentfarbe soll laut Layout-Entscheidung vom 13.08. zusätzlich verwendet werden (stammt aus einer verworfenen dritten Design-Richtung). Kein Hex-Wert festgelegt. Volt-Grün `#CCFF00` aus dem alten Archiv-Design funktioniert NICHT auf Kraftpapier/Sock-Weiß (Kontrast ~1,9:1 bzw. ~1,05:1 — für Text unbrauchbar). Falls Lime als Text vorkommen soll, zusätzliche dunklere Variante nötig, z. B. `#5C6E00` (~5,6:1 auf Sock-Weiß). Vor Verwendung mit André abstimmen, nicht selbst festlegen.

## Grundprinzip: Versandetikett-Look

Body-Hintergrund ist ein radialer Verlauf über `--paper-dark`, die Karte selbst (`.label`) sitzt in `--sock` mit gestrichelter Innenkontur (`.label::before`) — bewusst wie ein aufgeklebtes Etikett auf Kraftpapier. Perforationslöcher (`.perf-left`/`.perf-right`) an Sektionsrändern verstärken den Versandschein-Eindruck.

## Komponenten (aus `assets/css/components.css`, wörtlich, gekürzt kommentiert)

**Karte/Label:**
```css
.label{ background: var(--sock); border: 2px solid var(--ink); border-radius: var(--radius);
  box-shadow: 0 18px 40px rgba(0,0,0,0.25); }
```

**Stempel** (rundes, gedrehtes Element, z. B. für Status/Badge):
```css
.stamp{ width: 92px; height: 92px; border: 3px solid var(--stamp); border-radius: 50%;
  color: var(--stamp); font-family: var(--display); transform: rotate(-9deg); }
```

**Formularfelder** — Unterstrich-Stil, kein Kasten:
```css
input, select, textarea{ background: var(--sock); border: none; border-bottom: 2px solid var(--ink);
  font-family: var(--body); }
input:focus{ outline: 3px solid var(--stamp); outline-offset: 2px; }
```

**Chips** (z. B. Zustands-Auswahl) — Pill-Form, aktiv = invertiert:
```css
.chip span{ border: 2px solid var(--ink); border-radius: 999px; font-family: var(--mono);
  text-transform: uppercase; }
.chip input:checked + span{ background: var(--ink); color: var(--sock); }
```

**Buttons:**
```css
.btn{ background: var(--ink); color: var(--sock); border-radius: 999px;
  font-family: var(--display); text-transform: uppercase; }
.btn:hover{ background: var(--stamp); }
.btn-secondary{ background: var(--sock); color: var(--ink); border: 2px solid var(--ink); }
```

**Section-Tag** (Abschnitts-Label mit Linie):
```css
.section-tag{ font-family: var(--mono); text-transform: uppercase; color: var(--muted); }
.section-tag::after{ content:""; flex:1; height:1px; background: var(--line); }
```

Grundregel für neue Komponenten: `--mono` für Labels/Meta/Zahlen, `--display` (Oswald, uppercase) für Headlines/Buttons, `--body` (Inter) für Fließtext/Inputs. Kanten entweder scharf mit 2px Volltonlinie (`--ink`) oder komplett rund (999px Pills) — keine mittleren Radien außer der Karte selbst (16px).

## Struktur

```
index.html                          Landing (Kraftpapier)
onboarding/index.html + assets/js/onboarding.js   Code-Gate → Formular → Upload
success/index.html + assets/js/qrcode.js          Danke-Seite mit QR
apps-script/Code.gs                 Backend: init → upload → finalize, ACCESS_CODE-Gate
assets/css/theme.css + components.css
blog.html, warum.html               Content-Seiten, gleiches Kraftpapier-Design
tools/foto-collage.html             Bildbearbeitung (Helligkeit/Kontrast/Vignette/Crop/PNG-Export)
archive/                            alte "Sneakers4Seeker"-Richtung (Volt-Grün/Schwarz, WhatsApp-Flow) — bewusst archiviert, nicht gelöscht
```

## Layout-Entscheidung (13.08.2026)

- **Richtung A „Versandschein"** → Startseite (das aktuelle `.label`-Prinzip)
- **Richtung B „Inventarkarte"** → Katalogansicht (noch umzusetzen/zu prüfen, ob vorhanden)
- Lime-Grün zusätzlich als Akzent — offen, siehe oben

## Scope & Ton (bindend für alle Texte/Formulare)

Reiner Artikelmarkt: getragene Sneaker/Socken per Versand, ausschließlich Produktfotos, keine persönlichen Treffen, keine Personenfotos, 18+-Pflicht. Kein Charity-/Spenden-Framing (Entscheidung 13.08. — explizit verworfen). Ton: Vertrauen, klarer Ablauf, Diskretion — nicht Streetwear-Hype wie im archivierten Vorgänger.

Abwicklung: Zahlung über Stripe, Versand mit DHL versichert, Lieferzeit 3–5 Tage, Antwortzeit auf Anfragen max. 7 Stunden.

## Zu verifizieren, bevor daran gearbeitet wird (widersprüchliche/unbestätigte Stände)

- **index.html:** Ein Stand berichtet noch alte „gemeinnützige Non-Profit-Initiative"-Sprache und #-Platzhalter-Links (Impressum, Datenschutz, NGO-Partnerprofile, Social Media) — widerspricht der Entscheidung gegen Charity-Framing. Ein direkter Live-Check der aktuellen Seite zeigte dagegen eine schlichte Version ohne diese Sprache. Vor Änderungen den tatsächlichen aktuellen Inhalt direkt aus dem Repo lesen, nicht von einem der beiden Stände ausgehen.
- **WhatsApp-Nummer:** Korrekt ist `491634692255`. `blog.html` und `warum.html` hatten fälschlich `4916346922255` (eine 2 zu viel) — laut Notiz bereits korrigiert, aber vor weiterer Arbeit an diesen Dateien selbst gegenprüfen.
- **Sheet-Log-Zeile** für Test-Ref `S4S-D52C2826` nie bestätigt — im Google Sheet „Sneaks4Seek – Log" nachsehen, ob `finalize` sauber durchlief.
- **Video-Payload:** 50-MB-Videos als Base64 ergeben ~67 MB pro Request — Apps-Script-Limits vor echtem Einsatz testen.
- **foto-collage.html:** Referenz-Kopier-Funktion und ein serieller 5-Bilder-Test sind unbestätigt.

## Wiederverwendbare Medien aus `archive/`

`combo.mp4` (1080×1920, 13,4 s), `spin360.mp4` (1080×1920, 7,1 s, Produktdreh), `joker-spiral.webp` (abstrakte S/W-Spirale, keine Personen) — alle direkt nutzbar für Social-/Kanal-Content, vertikales Format bereits passend.

## Sonstiges

- Telegram-Kanal live: t.me/sneaks4seek
- Google Photos Picker Integration wartet noch auf OAuth Client ID
- Learnings: GitHub-Web-Upload flacht Ordnerstrukturen ab (nur über Git arbeiten); `git mv` mit mehreren Quelldateien bricht komplett ab, wenn eine fehlt — einzeln ausführen; `<br id="...">` zeigt per JS gesetzten `textContent` nicht an — `<span>` verwenden.
