# 🧦 Sneaks4Seek — Übergabe (Backend-Deployment-Saga, 22.11.2026)

Stand: 22.11.2026, Nachmittag/Abend · Gerät: PC (Git Bash, Windows, User "Holy New")
Repo: `github.com/intelligentresponder-max/Sneaks4seek` (**großes S!**, sonst 404)
Live: `https://intelligentresponder-max.github.io/Sneaks4seek/`

## 🔴 WO WIR GERADE STEHEN — nächster Schritt zuerst

**Offenes Problem:** Das Onboarding-Formular bricht beim Absenden ab mit
`Serverfehler: Access denied: DriveApp.` — reproduzierbar, auch nach Service-Worker-Fix
und frischem Hard-Reload. Das ist **kein Cache-Problem mehr**, sondern ein echtes
Scope-Problem im Apps-Script-Projekt.

**Diagnose bisher:**
- Manuelles Ausführen einer Funktion im Editor zeigt **keinen** Autorisierungs-Dialog
  → Drive/Sheets-Scopes sind dem Projekt schon iwie zugeteilt, aber vermutlich nur der
  **eingeschränkte** Scope `drive.file` (nur Dateien, die das Skript selbst erstellt hat),
  nicht der volle `drive`-Scope (Zugriff auf beliebige Datei/Ordner-ID).
- Der Ziel-Ordner (`DRIVE_FOLDER_ID`, siehe unten) öffnet im Browser für den Projekt-Owner
  problemlos — das Problem ist also nicht Sharing/Besitz, sondern der Skript-eigene OAuth-Scope.

**Nächster Schritt (angefangen, nicht fertig):**
1. Im SNEAKERSSEEK-Projekt: Zahnrad (Projekteinstellungen) → Haken bei
   **„`appsscript.json`-Manifestdatei im Editor anzeigen"**.
2. Zurück zum Editor (`</>`) → Datei `appsscript.json` sollte jetzt in der Liste auftauchen.
3. Ihren aktuellen Inhalt ansehen und ergänzen um:
   ```json
   "oauthScopes": [
     "https://www.googleapis.com/auth/drive",
     "https://www.googleapis.com/auth/spreadsheets",
     "https://www.googleapis.com/auth/script.external_request"
   ]
   ```
   (bestehende Keys wie `timeZone`, `runtimeVersion`, `exceptionLogging` nicht anfassen,
   nur `oauthScopes` als neuen Key in dasselbe JSON-Objekt einfügen.)
4. Speichern, dann **erneut manuell eine Funktion ausführen** (▷ Ausführen) — diesmal sollte
   wegen des geänderten Scope-Bedarfs ein **neuer** Autorisierungs-Dialog erscheinen. Diesen
   komplett durchklicken (Konto wählen → „Erweitert" → „Zu SNEAKERSSEEK (unsicher) wechseln"
   → „Zulassen").
5. Onboarding-Testdurchlauf wiederholen (ACCESS_CODE aus Script Properties, Foto, Häkchen, absenden).

**Falls das nicht reicht:** Deployment womöglich neu anlegen (Deploy → New deployment),
da eine bestehende Deployment-Version manchmal eine ältere Autorisierungs-Momentaufnahme
behält. Neue URL dann wieder in `api.js` + `werkstatt-gate.js` eintragen (siehe unten, Muster
ist jetzt eingespielt).

## ✅ Was in dieser Session bereits fertig UND live ist

| Feature | Datei(en) | Status |
|---|---|---|
| Onboarding vereinfacht (Kontaktdaten erst auf Danke-Seite, Marke/Modell optional) | `onboarding/index.html`, `assets/js/onboarding.js` | ✅ live |
| Kontakt-Formular auf Danke-Seite (neue Backend-Aktion `contact`) | `success/index.html`, `assets/js/success-contact.js`, `apps-script/Code.gs` | ✅ Code live, ⚠️ noch nicht erfolgreich live getestet (wegen DriveApp-Fehler oben) |
| Beispielfotos "So fotografierst du am besten" im Onboarding | `onboarding/index.html`, `assets/images/examples/*.jpg` | ✅ live |
| Sneaker-Modell-Checker erweitert: New Balance, Vans, Converse, Puma, Reebok, Air Jordan 5, Adidas Yeezy Boost 350, Nike Shox | `tools/sneaker-modell-checker.html` | ✅ live |
| Preis-Lookup-Buttons (StockX/GOAT/eBay-Suche, keine echten Live-Preise — gibt's nirgends kostenlos) | `tools/sneaker-modell-checker.html` | ✅ live |
| Zustands-Checkliste (4 Stufen wie Onboarding-Formular) | `tools/sneaker-modell-checker.html` | ✅ live |
| Foto-Galerie mit persistenten Icons (IndexedDB, lokal im Browser) | `tools/sneaker-modell-checker.html` | ✅ live, per Playwright getestet |
| Service Worker: Netzwerk-zuerst statt Cache-zuerst (Cache v2→v3) | `service-worker.js` | ✅ live — **wichtiger Dauerfix**, sonst cachen Browser `api.js` für immer |
| QR-Flyer (DE dominant + EN, A4, druckfertig) | Artifact (nicht im Repo), Link siehe Chat-Verlauf | ✅ erstellt |

## 🔑 Aktuelle Zugangsdaten / IDs (Stand jetzt)

**Apps-Script-Projekt „SNEAKERSSEEK"** (das ist jetzt das maßgebliche Projekt — es gab
mehrere gleichnamige/verwaiste Projekte aus früheren Sessions, dieses hier ist aktiv):
- Script-ID: `1W2Aww_O6q-tR3uaGgNeWKCFdCDBqk5OQ9vUOmQXae4qzL7u9QsV-AypP`
- Projekt-URL: `https://script.google.com/u/3/home/projects/1W2Aww_O6q-tR3uaGgNeWKCFdCDBqk5OQ9vUOmQXae4qzL7u9QsV-AypP/edit`
  (das `/u/3/` ist wichtig — André hat mehrere Google-Konten im selben Browser, ohne das
  landet man beim falschen Konto und bekommt „unable to open")
- Aktuelle Deployment-URL: siehe `assets/js/api.js` (Konstante `APPS_SCRIPT_URL`,
  identisch auch in `assets/js/werkstatt-gate.js`) — dort bewusst nicht wiederholt, aber
  im Repo selbst schon öffentlich sichtbar (Client-Code muss sie kennen).
- Script Properties (NICHT in diesem öffentlichen Repo dokumentieren — nur im
  Apps-Script-Projekt selbst unter Projekteinstellungen → Script Properties nachsehen):
  - `ACCESS_CODE` — Zugangscode fürs Onboarding, André weiß ihn / steht im privaten Notizen
  - `WERKSTATT_CODE` — separater Code für den internen Bereich, nicht mit Verkäufer:innen teilen
  - `DRIVE_FOLDER_ID` = `13_HosAnBhSEGJiqDY_NlK8IlIczd4t_M` (Ordner „Sneaks4Seek Uploads",
    öffnet im Browser problemlos, enthält bereits Test-Submission-Unterordner — diese ID ist
    kein Geheimnis, nur ein Ziel-Ordner, daher unbedenklich hier zu nennen)
  - `SHEET_ID` — **noch nicht bestätigt vorhanden**, sollte sich bei erstem erfolgreichen
    `finalize`-Aufruf automatisch anlegen (`getLogSheet()` in `Code.gs`). Nach dem DriveApp-Fix
    oben nachsehen, ob er aufgetaucht ist.

**Auto-Login-Link für Verkäufer:** Onboarding-URL + `?code=<ACCESS_CODE>` — den aktuellen
Code aus den Script Properties einsetzen, nicht hier im Repo niederschreiben (Repo ist
öffentlich, der Code soll es nicht sein).

## ⚠️ Wichtige Learnings aus dieser Session

- **GitHub-Credential-Verwechslung:** André hat mehrere GitHub-Accounts/Orgs
  (`intelligentresponder-max`, `nordstern-ffm`). Windows Credential Manager cached mal den
  falschen → `git push` liefert 403 „Permission denied to nordstern-ffm". Fix: Windows
  Anmeldeinformationsverwaltung → Eintrag `git:https://github.com` entfernen → beim nächsten
  Push neu einloggen, richtigen Account wählen.
- **Mehrere gleichnamige Apps-Script-Projekte:** Es gab zwei Projekte namens
  „Sneaks4Seek Backend" plus eines namens „SNEAKERSSEEK" plus drei „Untitled project" —
  alle mit unterschiedlichen, teils toten Deployment-URLs. Immer über
  **Deploy → Manage deployments** die tatsächliche URL gegen die in `api.js` abgleichen,
  nie nach Projektname vertrauen.
- **`notepad.exe` fehlt im Git-Bash-PATH** auf diesem Rechner. Für Zwischenablage-Kopien
  stattdessen: `powershell -NoProfile -Command "Get-Content -Raw -Encoding UTF8 'datei' | Set-Clipboard"`
  — behandelt Umlaute korrekt, `clip.exe` verstümmelt sie (UTF-8 wird falsch interpretiert).
- **Git Bash verstümmelt lange Heredocs/Base64-Zeilen:** Zeilen über ~5000–7000 Zeichen
  reißen manchmal ab oder lösen Autovervollständigungs-Artefakte aus (geschweifte Klammern
  triggern eine Ordner-Glob-Einfügung). Fix: Base64 in ≤4000-Byte-Blöcke splitten
  (`split -b 4000 -d`), per `echo -n ... >> datei` anhängen, dann `base64 -d`. Technik ist
  dokumentiert in `.claude/skills/deploy-browser-tool/references/patch-handover.md`.
- **Service Worker cachte `api.js` dauerhaft** (Cache-zuerst-Strategie) — jede
  Backend-URL-Änderung kam bei Browsern mit alten Service Worker nie an, ohne dass es
  online sichtbar war. Jetzt auf Netzwerk-zuerst umgestellt (`service-worker.js`, Cache v3).
  **Bei jeder künftigen Debug-Session zuerst prüfen**, ob der Service Worker im DevTools
  (Application → Service Workers) die neueste Version zeigt, bevor man an anderen Ursachen sucht.
- **Downloads landen nicht immer in `~/Downloads`** — bei André teils in `~/Documents`
  (Browser-Einstellung). Bei „No such file or directory" immer `find ~ -iname "<datei>*"`
  probieren, bevor man an der Datei selbst zweifelt.
- **Zwei lokale Repo-Klone existieren:** `C:\Users\Holy New\sneaks4seek` (veraltet, Stand
  August, alte Ordnerstruktur ohne `assets/`-Unterordner) und
  `C:\Users\Holy New\Projects\Sneaks4seek` (aktuell, **immer diesen verwenden**).

## 📁 Wo was liegt (Repo-Struktur, relevant für diese Übergabe)

```
Sneaks4seek/
├── apps-script/Code.gs          ← Referenzkopie, MUSS manuell in Apps-Script-Editor
│                                    eingefügt werden (kein Git-Deploy zu Apps Script)
├── assets/js/api.js              ← APPS_SCRIPT_URL hier eintragen
├── assets/js/werkstatt-gate.js   ← dieselbe URL hier auch eintragen
├── assets/js/onboarding.js       ← Auto-Login per ?code=, Gate-Logik
├── assets/js/success-contact.js  ← Kontakt-Formular Danke-Seite
├── assets/images/examples/       ← 4 Beispielfotos (Sohle/Zehenbox/Seite/Ferse)
├── onboarding/index.html
├── success/index.html
├── service-worker.js              ← Netzwerk-zuerst, Cache v3
└── tools/
    ├── werkstatt.html             ← Hub, passwortgeschützt (WERKSTATT_CODE)
    └── sneaker-modell-checker.html ← Checkliste + Preis-Lookup + Galerie
```

**Patch-Übergabe-Workflow gilt weiterhin:** Claude hat keinen direkten Push-Zugriff auf
dieses Repo (per `add_repo` mit `access: push` ausdrücklich verweigert) — Änderungen werden
lokal committet und als Base64-Block/Datei an André übergeben, der selbst committet/pusht.
