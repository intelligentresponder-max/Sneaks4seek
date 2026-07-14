/* Sneaks4Seek – API-Wrapper für das Google-Apps-Script-Backend
   Trage hier die URL deiner deployten Apps-Script-Web-App ein
   (siehe /apps-script/Code.gs + README.md). */

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbznh7ttNtbXdgoSwLcSN6CAPXQJhwRfYT8pYkNBW1OePugQJG426L_lG3nPL95_eLhpmQ/exec";

async function callApi(action, payload) {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("PASTE_YOUR")) {
    throw new Error("Backend ist noch nicht konfiguriert (APPS_SCRIPT_URL fehlt in assets/js/api.js).");
  }
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // vermeidet CORS-Preflight bei Apps Script
    body: JSON.stringify({ action, ...payload })
  });
  if (!res.ok) throw new Error("Netzwerkfehler (" + res.status + ")");
  const data = await res.json();
  if (data && data.error) throw new Error(data.error);
  return data;
}

/** Startet eine neue Submission. Der Code wird server-seitig geprüft. */
function apiInit(code, contact) {
  return callApi("init", { code, contact });
}

/** Lädt eine einzelne Datei (Base64) für eine bestehende Submission hoch. */
function apiUpload(code, submissionId, file) {
  return callApi("upload", { code, submissionId, file });
}

/** Schließt die Submission ab, schreibt das Formular ins Log, liefert QR-Daten zurück. */
function apiFinalize(code, submissionId, formData) {
  return callApi("finalize", { code, submissionId, formData });
}
