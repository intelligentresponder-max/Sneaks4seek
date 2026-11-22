/* Sneaks4Seek – Kontakt-Formular auf der Danke-Seite
   Kontaktdaten werden erst hier abgefragt, nicht mehr beim Onboarding selbst.
   Erscheint nur direkt nach dem eigenen Absenden (Code liegt in sessionStorage) —
   nicht, wenn die Seite später per QR-Code erneut aufgerufen wird (Abholung,
   fremdes Gerät). So bleibt die Danke-Seite bei einem späteren Rescan reine
   Beleg-Anzeige ohne Bearbeitungs-Formular. */

(function () {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const submissionId = params.get("id");
  if (!submissionId) return;

  let code = "";
  try { code = sessionStorage.getItem("s4s_code") || ""; } catch (e) {}

  let alreadyDone = false;
  try { alreadyDone = sessionStorage.getItem("s4s_contact_done_" + submissionId) === "1"; } catch (e) {}

  const section = document.getElementById("contact-section");
  if (!code && alreadyDone) return; // nichts zu zeigen, reiner Rescan später
  if (!code) return; // kein Code aus dieser Sitzung bekannt -> kein Formular anzeigen

  section.style.display = "block";

  const form = document.getElementById("contact-form");
  const doneMsg = document.getElementById("contact-done");
  const codeField = document.getElementById("contact-code-field");
  const codeInput = document.getElementById("contact-code");
  const submitBtn = document.getElementById("contact-submit");
  const statusMsg = document.getElementById("contact-status");
  const errorMsg = document.getElementById("contact-error");

  if (alreadyDone) {
    form.style.display = "none";
    doneMsg.style.display = "block";
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.classList.remove("show");
    submitBtn.disabled = true;
    statusMsg.textContent = "Sende…";

    const useCode = (codeInput.value.trim() || code);

    try {
      await apiContact(useCode, submissionId, {
        name: document.getElementById("contact-name").value.trim(),
        email: document.getElementById("contact-email").value.trim(),
        phone: document.getElementById("contact-phone").value.trim(),
        plz: document.getElementById("contact-plz").value.trim(),
        address: document.getElementById("contact-address").value.trim(),
        pickup: document.getElementById("contact-pickup").value,
      });

      try { sessionStorage.setItem("s4s_contact_done_" + submissionId, "1"); } catch (e) {}
      statusMsg.textContent = "";
      form.style.display = "none";
      doneMsg.style.display = "block";
    } catch (err) {
      submitBtn.disabled = false;
      statusMsg.textContent = "";
      errorMsg.textContent = "Fehler: " + err.message;
      errorMsg.classList.add("show");
      if (/code/i.test(err.message)) {
        codeField.style.display = "block";
      }
    }
  });
})();
