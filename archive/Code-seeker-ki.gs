/**
 * Sneaks4Seek – Apps-Script-Backend
 *
 * Setup:
 * 1. Neues Projekt auf https://script.google.com anlegen, diesen Code
 *    in Code.gs einfügen.
 * 2. Datei > Projekteinstellungen > Script Properties:
 *      ACCESS_CODE     = <dein Zugangscode fürs Onboarding>
 *      DRIVE_FOLDER_ID = <ID des Google-Drive-Ordners, in den hochgeladen wird>
 *      SHEET_ID        = <ID eines Google Sheets fürs Log> (optional, sonst wird eins erstellt)
 *      OPENAI_API_KEY  = <dein OpenAI API-Key> (für die Sneaker-Erkennung auf verkaufen.html)
 *      DETECT_KEY      = <ein beliebiges eigenes Passwort> (einfacher Schutz gegen Fremd-Zugriff auf die Erkennung)
 * 3. Bereitstellen > Neue Bereitstellung > Web-App
 *      - Ausführen als: Ich
 *      - Zugriff: Jeder
 * 4. Die Web-App-URL in assets/js/api.js unter APPS_SCRIPT_URL eintragen
 *    UND in verkaufen.html unter DETECT_ENDPOINT eintragen (gleiche URL).
 */

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    // Sneaker-Erkennung (verkaufen.html) läuft OHNE Onboarding-Zugangscode,
    // dafür mit eigenem, leichtem Schutz (DETECT_KEY) + Tages-Limit gegen Kostenmissbrauch.
    if (body.action === "detectSneaker") {
      return jsonOut(handleDetectSneaker(body, PropertiesService.getScriptProperties()));
    }

    const props = PropertiesService.getScriptProperties();
    const validCode = props.getProperty("ACCESS_CODE");

    if (!body.code || body.code !== validCode) {
      return jsonOut({ error: "Ungültiger Zugangscode." });
    }

    switch (body.action) {
      case "init":     return jsonOut(handleInit(body, props));
      case "upload":   return jsonOut(handleUpload(body, props));
      case "finalize": return jsonOut(handleFinalize(body, props));
      default:
        return jsonOut({ error: "Unbekannte Aktion: " + body.action });
    }
  } catch (err) {
    return jsonOut({ error: "Serverfehler: " + err.message });
  }
}

function handleInit(body, props) {
  const rootFolder = DriveApp.getFolderById(props.getProperty("DRIVE_FOLDER_ID"));
  const submissionId = "S4S-" + Utilities.getUuid().slice(0, 8).toUpperCase();
  const folder = rootFolder.createFolder(submissionId);
  return { submissionId, folderUrl: folder.getUrl() };
}

function handleUpload(body, props) {
  const rootFolder = DriveApp.getFolderById(props.getProperty("DRIVE_FOLDER_ID"));
  const folders = rootFolder.getFoldersByName(body.submissionId);
  if (!folders.hasNext()) return { error: "Unbekannte Submission-ID." };
  const folder = folders.next();

  const f = body.file;
  const bytes = Utilities.base64Decode(f.base64);
  const blob = Utilities.newBlob(bytes, f.mimeType, f.filename);
  const file = folder.createFile(blob);
  return { fileId: file.getId(), name: file.getName() };
}

function handleFinalize(body, props) {
  const sheet = getLogSheet(props);
  const row = [
    new Date(),
    body.submissionId,
    body.formData.name || "",
    body.formData.email || "",
    body.formData.phone || "",
    body.formData.plz || "",
    body.formData.address || "",
    body.formData.brand || "",
    body.formData.model || "",
    body.formData.size || "",
    body.formData.price || "",
    body.formData.condition || "",
    body.formData.notes || "",
    body.formData.pickup || "",
  ];
  sheet.appendRow(row);
  return { ref: body.submissionId };
}

function getLogSheet(props) {
  const sheetId = props.getProperty("SHEET_ID");
  let ss;
  if (sheetId) {
    ss = SpreadsheetApp.openById(sheetId);
  } else {
    ss = SpreadsheetApp.create("Sneaks4Seek – Log");
    props.setProperty("SHEET_ID", ss.getId());
  }
  const sheet = ss.getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Zeitstempel", "Submission-ID", "Name", "E-Mail", "Telefon", "PLZ/Ort", "Adresse",
      "Marke", "Modell", "Größe", "Preis", "Zustand", "Notizen", "Abwicklung",
    ]);
  }
  return sheet;
}

/* ---------- Sneaker-Erkennung (neu) ---------- */

function handleDetectSneaker(body, props) {
  // 1) leichter Schutz: eigener Key, den nur deine Seite kennt
  const detectKey = props.getProperty("DETECT_KEY");
  if (detectKey && body.clientKey !== detectKey) {
    return { error: "unauthorized" };
  }

  // 2) einfaches Tages-Limit gegen Kostenmissbrauch (global, kein Login nötig)
  const cache = CacheService.getScriptCache();
  const dayKey = "detect_count_" + Utilities.formatDate(new Date(), "Etc/UTC", "yyyy-MM-dd");
  const count = Number(cache.get(dayKey) || 0);
  const limit = Number(props.getProperty("DETECT_DAILY_LIMIT") || 60);
  if (count >= limit) {
    return { error: "limit_reached", notes: "Tageslimit erreicht, versuch's morgen wieder." };
  }
  cache.put(dayKey, String(count + 1), 21600); // 6h Cache-Fenster, reicht für Tageszählung in Kombination mit Reset

  const imageBase64 = body.imageBase64;
  const mimeType = body.mimeType || "image/jpeg";
  if (!imageBase64) return { error: "missing_image" };

  const apiKey = props.getProperty("OPENAI_API_KEY");
  if (!apiKey) return { error: "missing_api_key" };

  const prompt = "Du bist Sneaker-Experte. Erkenne Marke und Modell aus dem Foto. " +
    "Antworte NUR als JSON mit keys: brand, model, confidence (0..1), notes.";

  const payload = {
    model: "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: "data:" + mimeType + ";base64," + imageBase64 }
        ]
      }
    ]
  };

  try {
    const r = UrlFetchApp.fetch("https://api.openai.com/v1/responses", {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      headers: { Authorization: "Bearer " + apiKey },
      muteHttpExceptions: true
    });

    const parsed = JSON.parse(r.getContentText());
    const outText = extractOutputText_(parsed);
    const result = safeParseJson_(outText) || { brand: "", model: "", confidence: 0, notes: "unparsed" };
    return result;
  } catch (err) {
    return { error: "detect_failed", notes: String(err) };
  }
}

function extractOutputText_(resp) {
  try {
    const out = resp.output || [];
    for (let i = 0; i < out.length; i++) {
      const c = out[i].content || [];
      for (let j = 0; j < c.length; j++) {
        if (c[j].type === "output_text" && c[j].text) return c[j].text;
      }
    }
  } catch (e) {}
  return "";
}

function safeParseJson_(s) {
  if (!s) return null;
  s = s.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  try { return JSON.parse(s); } catch (e) { return null; }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
