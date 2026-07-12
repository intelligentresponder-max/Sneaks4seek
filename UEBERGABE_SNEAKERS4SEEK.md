# 🧦 SNEAKERS4SEEK — ÜBERGABE (Trigger: 7*7 SNEAKERS4SEEK)

Stand: 12.07.2026, 07:50 Uhr · Gerät: Tablet
Repo: `github.com/intelligentresponder-max/Sneaks4seek` (**großes S!**, sonst 404)
Live: `https://intelligentresponder-max.github.io/Sneaks4seek/`

## 🔴 WO WIR GERADE STEHEN — nächster Schritt zuerst

Wir sind **mitten im Backend-Deployment** für die neue KI-Sneaker-Erkennung auf `verkaufen.html`.

**Gerade offen auf script.google.com:** "New project" wurde geklickt (oder steht kurz bevor). Nächste Schritte in dieser Reihenfolge:

1. Code aus `Code.gs` (siehe unten, bereits fertig gebaut) in den neuen Apps-Script-Editor einfügen, Projekt umbenennen zu "Sneaks4Seek Backend", speichern
2. Project Settings → Script Properties setzen:
   - `DRIVE_FOLDER_ID` = Drive-Ordner-ID (schon vorhanden, für Onboarding)
   - `OPENAI_API_KEY` = OpenAI-Key (noch einzutragen)
   - `DETECT_KEY` = frei erfundenes Passwort, z. B. `s4s-2026-xyz` (noch einzutragen)
3. Deploy → New deployment → Web app → Execute as **Me**, Access **Anyone**
4. Deploy-URL kopieren
5. Deploy-URL eintragen in:
   - `assets/js/api.js` → `APPS_SCRIPT_URL`
   - `verkaufen.html` → `DETECT_ENDPOINT` (+ `DETECT_CLIENT_KEY` = gleicher Wert wie `DETECT_KEY`)
6. `git add Code.gs verkaufen.html && git commit -m "feat: automatische Sneaker-Erkennung" && git push`

**Falls du das hier liest, weil eine neue Session gestartet ist:** frag André kurz, ob Schritt 1-6 schon fertig ist, bevor du von vorne anfängst.

## ✅ Was in dieser Session (12.07.) bereits fertig UND live ist

| Feature | Datei | Status |
|---|---|---|
| Landingpage repariert | `index.html` | ✅ live |
| Wert-Rechner (Slider + Zustand) | `rechner.html` | ✅ live |
| Foto-Guide (7 Schritte) | `zustand.html` | ✅ live |
| Hypno-Upload-Spirale | `spirale.html` | ✅ live, noch nicht im Nav verlinkt |
| Magic-Pulse CTA-Button | `index.html` | ✅ live |
| Merch-Vorschau Volt/Weiß-Umschalter | `merch-preview.html` + `merch/` | ✅ live |
| KI-Sneaker-Erkennung Backend | `Code.gs` (erweitert) | 🔴 Code fertig, **noch nicht deployed** |
| KI-Sneaker-Erkennung Frontend | `verkaufen.html` (erweitert) | 🔴 Code fertig, **noch nicht gepusht** (wartet auf Deploy-URL) |

## 📌 Bestehende Struktur (zur Einordnung)
- `magie.html` = "✨ 777" im Nav → Sneaker-Glücksrad
- `deal-magie.html` = internes Margen-Tool, `noindex`, bewusst nicht im Nav

## ⚠️ Wichtige Learnings aus dieser Session
- **Immer großes S:** `Sneaks4seek` nicht `sneaks4seek` — sonst 404 auf GitHub Pages
- **Nie Dateien blind überschreiben** — vor jedem Edit an bestehenden Dateien erst `cat dateiname.html` zeigen lassen. `index.html` war schon mal kaputt, weil eine alte Version drübergebügelt wurde
- Git-Remote zeigt evtl. noch auf `sneaks4seek.git` (klein) — funktioniert per Redirect, sauberer wäre `git remote set-url origin https://github.com/intelligentresponder-max/Sneaks4seek.git`

## 📁 Wo die fertigen Code-Dateien liegen
Alle in diesem Chat als Downloads bereitgestellt (Downloads-Ordner Tablet):
- `Code.gs` (erweitert um `detectSneaker`-Funktion, DETECT_KEY-Schutz, Tages-Limit)
- `verkaufen.html` (erweitert um Foto-Upload + Auto-Erkennung vor Marke/Modell)

Falls diese Downloads nicht mehr da sind: André hat den vollständigen Chat-Verlauf, in dem beide Dateien komplett abgedruckt sind (Nachrichten kurz vor dieser Übergabe).
