/**
 * Sneaks4Seek – Apps-Script-Backend
 *
 * Setup:
 * 1. Neues Projekt auf https://script.google.com anlegen, diesen Code
 *    in Code.gs einfügen.
 * 2. Datei > Projekteinstellungen > Script Properties:
 *      ACCESS_CODE       = <dein Zugangscode fürs Onboarding>
 *      WERKSTATT_CODE    = <separater Zugangscode für den internen Werkstatt-Bereich,
 *                           z.B. Sneaker-Modell-Checker — unabhängig von ACCESS_CODE,
 *                           André teilt den nicht mit Verkäufer:innen>
 *      DRIVE_FOLDER_ID   = <ID des Google-Drive-Ordners, in den hochgeladen wird>
 *      SHEET_ID          = <ID eines Google Sheets fürs Log> (optional, sonst wird eins erstellt)
 *      ANTHROPIC_API_KEY = <API-Key für die automatische Modellerkennung (nur Werkstatt)>
 *      ANTHROPIC_MODEL   = <optional, Standard: claude-sonnet-5-5>
 * 3. appsscript.json: Scope "https://www.googleapis.com/auth/script.external_request" ergänzen.
 * 4. Bereitstellen > Bereitstellungen verwalten > Bearbeiten > Neue Version
 *      - Ausführen als: Ich
 *      - Zugriff: Jeder
 * 5. Die Web-App-URL in assets/js/api.js unter APPS_SCRIPT_URL eintragen.
 */

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const props = PropertiesService.getScriptProperties();

    // Eigener Zugangscode für den internen Werkstatt-Bereich (Sneaker-Modell-
    // Checker etc.) — unabhängig von ACCESS_CODE, das ist für das Verkäufer-
    // Onboarding. Läuft am generischen Code-Check unten bewusst vorbei.
    if (body.action === "verifyWerkstattCode") {
      const validWerkstattCode = props.getProperty("WERKSTATT_CODE");
      return jsonOut({ ok: !!validWerkstattCode && body.code === validWerkstattCode });
    }

    // Werkstatt-Aktionen (Modellerkennung + Speichern) nur mit WERKSTATT_CODE —
    // die Claude-API kostet Geld, Verkäufer:innen sollen sie nicht auslösen können.
    if (body.action === "identify" || body.action === "saveModel") {
      const validWerkstattCode = props.getProperty("WERKSTATT_CODE");
      if (!validWerkstattCode || body.code !== validWerkstattCode) {
        return jsonOut({ error: "Ungültiger Werkstatt-Code." });
      }
      return jsonOut(body.action === "identify"
        ? handleIdentify(body, props)
        : handleSaveModel(body, props));
    }

    const validCode = props.getProperty("ACCESS_CODE");

    if (!body.code || body.code !== validCode) {
      return jsonOut({ error: "Ungültiger Zugangscode." });
    }

    switch (body.action) {
      case "init":     return jsonOut(handleInit(body, props));
      case "upload":   return jsonOut(handleUpload(body, props));
      case "finalize": return jsonOut(handleFinalize(body, props));
      case "contact":  return jsonOut(handleContact(body, props));
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

/**
 * Trägt Kontaktdaten (Name/E-Mail/Telefon/PLZ/Adresse) nachträglich in eine
 * bereits per finalize angelegte Zeile ein — Onboarding fragt diese Felder
 * inzwischen erst auf der Danke-Seite ab, nicht mehr beim ersten Absenden.
 * Findet die Zeile über die Submission-ID in Spalte B und überschreibt
 * Spalten C–G; mehrfaches Absenden korrigiert also einfach dieselbe Zeile.
 */
function handleContact(body, props) {
  const sheet = getLogSheet(props);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { error: "Unbekannte Submission-ID." };

  const ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  let rowIndex = -1;
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === body.submissionId) { rowIndex = i + 2; break; }
  }
  if (rowIndex === -1) return { error: "Unbekannte Submission-ID." };

  const c = body.contact || {};
  sheet.getRange(rowIndex, 3, 1, 5).setValues([[
    c.name || "", c.email || "", c.phone || "", c.plz || "", c.address || "",
  ]]);
  if (c.pickup) sheet.getRange(rowIndex, 14, 1, 1).setValue(c.pickup);

  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  NEU: Automatische Modellerkennung                                  */
/*  Erwartet: body.image = { base64, mimeType }  (Client verkleinert   */
/*  vorher auf max. 1024 px). Liefert nur einen Vorschlag.             */
/* ------------------------------------------------------------------ */
function handleIdentify(body, props) {
  const apiKey = props.getProperty("ANTHROPIC_API_KEY");
  if (!apiKey) return { error: "ANTHROPIC_API_KEY fehlt in den Script Properties." };
  if (!body.image || !body.image.base64) return { error: "Kein Bild übergeben." };

  const mimeType = body.image.mimeType || "image/jpeg";
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.indexOf(mimeType) === -1) return { error: "Bildformat nicht unterstützt: " + mimeType };

  const prompt =
    "Erkenne den Sneaker auf dem Foto. Antworte NUR mit JSON, ohne Text drumherum, in diesem Format: " +
    '{"brand":"","model":"","colorway":"","confidence":0}. ' +
    "confidence ist eine ganze Zahl von 0 bis 100. Wenn kein Sneaker erkennbar ist, " +
    "setze alle Felder leer und confidence auf 0. Rate nicht, wenn du unsicher bist – senke dann confidence.";

  const payload = {
    model: props.getProperty("ANTHROPIC_MODEL") || "claude-sonnet-5-5",
    max_tokens: 300,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mimeType, data: body.image.base64 } },
        { type: "text", text: prompt },
      ],
    }],
  };

  const res = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
    method: "post",
    contentType: "application/json",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  if (res.getResponseCode() !== 200) {
    return { error: "Erkennung fehlgeschlagen (HTTP " + res.getResponseCode() + ")." };
  }

  const data = JSON.parse(res.getContentText());
  const text = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { error: "Antwort nicht lesbar." };

  let r;
  try { r = JSON.parse(match[0]); } catch (e) { return { error: "Antwort nicht lesbar." }; }

  return {
    suggestion: {
      brand: String(r.brand || ""),
      model: String(r.model || ""),
      colorway: String(r.colorway || ""),
      confidence: Math.max(0, Math.min(100, parseInt(r.confidence, 10) || 0)),
    },
  };
}

/* ------------------------------------------------------------------ */
/*  NEU: Bestätigtes Modell speichern                                  */
/*  Erwartet: body.image = { base64, mimeType, filename? }             */
/*            body.model = { brand, model, colorway, condition }       */
/* ------------------------------------------------------------------ */
function handleSaveModel(body, props) {
  if (!body.image || !body.image.base64) return { error: "Kein Bild übergeben." };
  const m = body.model || {};
  const name = [m.brand, m.model].filter(Boolean).join(" ").trim();
  if (!name) return { error: "Modellname fehlt." };

  const rootFolder = DriveApp.getFolderById(props.getProperty("DRIVE_FOLDER_ID"));
  const it = rootFolder.getFoldersByName("Modelle");
  const folder = it.hasNext() ? it.next() : rootFolder.createFolder("Modelle");

  const mimeType = body.image.mimeType || "image/jpeg";
  const ext = mimeType.split("/")[1] || "jpg";
  const stamp = Utilities.formatDate(new Date(), "Europe/Berlin", "yyyyMMdd-HHmmss");
  const safe = name.replace(/[^\w\- ]+/g, "").replace(/\s+/g, "_").slice(0, 60);
  const filename = body.image.filename || (safe + "_" + stamp + "." + ext);

  const blob = Utilities.newBlob(Utilities.base64Decode(body.image.base64), mimeType, filename);
  const file = folder.createFile(blob);

  const sheet = getModelSheet(props);
  sheet.appendRow([
    new Date(),
    m.brand || "",
    m.model || "",
    m.colorway || "",
    m.condition || "",
    file.getUrl(),
  ]);

  return { fileId: file.getId(), fileUrl: file.getUrl(), label: name };
}

function getLogSheet(props) {
  const ss = getSpreadsheet(props);
  const sheet = ss.getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Zeitstempel", "Submission-ID", "Name", "E-Mail", "Telefon", "PLZ/Ort", "Adresse",
      "Marke", "Modell", "Größe", "Preis", "Zustand", "Notizen", "Abwicklung",
    ]);
  }
  return sheet;
}

function getModelSheet(props) {
  const ss = getSpreadsheet(props);
  let sheet = ss.getSheetByName("Modelle");
  if (!sheet) sheet = ss.insertSheet("Modelle");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Datum", "Marke", "Modell", "Colorway", "Zustand", "Bildlink"]);
  }
  return sheet;
}

function getSpreadsheet(props) {
  const sheetId = props.getProperty("SHEET_ID");
  if (sheetId) return SpreadsheetApp.openById(sheetId);
  const ss = SpreadsheetApp.create("Sneaks4Seek – Log");
  props.setProperty("SHEET_ID", ss.getId());
  return ss;
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
