/**
 * Sneaks4Seek – Apps-Script-Backend
 *
 * Setup:
 * 1. Neues Projekt auf https://script.google.com anlegen, diesen Code
 *    in Code.gs einfügen.
 * 2. Datei > Projekteinstellungen > Script Properties:
 *      ACCESS_CODE   = <dein Zugangscode fürs Onboarding>
 *      DRIVE_FOLDER_ID = <ID des Google-Drive-Ordners, in den hochgeladen wird>
 *      SHEET_ID      = <ID eines Google Sheets fürs Log> (optional, sonst wird eins erstellt)
 * 3. Bereitstellen > Neue Bereitstellung > Web-App
 *      - Ausführen als: Ich
 *      - Zugriff: Jeder
 * 4. Die Web-App-URL in assets/js/api.js unter APPS_SCRIPT_URL eintragen.
 */

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
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

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
