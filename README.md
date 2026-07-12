# Sneaks4Seek

Onboarding-Website im Versandetikett-Look für Sneaker-Verkäufer:innen. Nach dem Ausfüllen gibt's ein Paar Socken als Dankeschön.

Live (nach Aktivierung von GitHub Pages): `https://intelligentresponder-max.github.io/Sneaks4seek/`

## Struktur

```
/
  index.html            Landing-Seite
  onboarding/index.html Formular (Zugangscode-geschützt) + Upload bis 10 Bilder / 10 Videos (je max. 50 MB)
  success/index.html    Danke-Seite mit QR-Code
  assets/css/           Design-Tokens (theme.css) + Komponenten (components.css)
  assets/js/            api.js (Backend-Anbindung), onboarding.js (Formularlogik), qrcode.js
  apps-script/Code.gs   Referenzcode fürs Google-Apps-Script-Backend
```

## Setup – 3 Schritte

### 1) Backend deployen (Google Apps Script)

1. Auf [script.google.com](https://script.google.com) ein neues Projekt anlegen und den Inhalt von `apps-script/Code.gs` einfügen.
2. Unter **Projekteinstellungen → Script Properties** anlegen:
   - `ACCESS_CODE` – der Code, mit dem die Onboarding-Seite geschützt ist
   - `DRIVE_FOLDER_ID` – ID des Google-Drive-Zielordners für Uploads
   - `SHEET_ID` – optional, sonst wird beim ersten Absenden automatisch ein Log-Sheet erstellt
3. **Bereitstellen → Neue Bereitstellung → Web-App**, Ausführen als „Ich", Zugriff „Jeder".
4. Die erzeugte Web-App-URL kopieren.

### 2) Frontend verbinden

In `assets/js/api.js` die Zeile

```js
const APPS_SCRIPT_URL = "PASTE_YOUR_DEPLOYED_WEB_APP_URL_HERE";
```

durch die Web-App-URL aus Schritt 1 ersetzen.

### 3) GitHub Pages aktivieren

Im Repo unter **Settings → Pages**: Branch `main`, Ordner `/ (root)` auswählen und speichern. Die Seite ist danach unter `https://intelligentresponder-max.github.io/Sneaks4seek/` erreichbar.

## Hinweis zum Zugangscode-Schutz

Der Code-Gate im Onboarding-Formular ist ein **Soft-Gate im Frontend** (blendet das Formular erst nach Eingabe ein). Die eigentliche Prüfung passiert **serverseitig** in `Code.gs` bei jedem `init`/`upload`/`finalize`-Aufruf – ein falscher Code wird dort abgelehnt, unabhängig vom Frontend. Da GitHub Pages nur statisches Hosting ist, ist das die pragmatischste Lösung ohne eigenen Server/echtes Login.

## Limits

- Bilder: max. 10, je max. 20 MB
- Videos: max. 10, je max. 50 MB (anpassbar in `assets/js/onboarding.js`, Konstanten `MAX_*`)
- Für größere Videos (>50 MB) müsste auf Chunk-Uploads oder einen anderen Storage-Dienst umgestellt werden.
