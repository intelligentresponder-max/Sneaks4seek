/**
 * Sneaks4Seek – Werkstatt-Zugangsschutz
 *
 * Serverseitig gegen Code.gs geprüft (WERKSTATT_CODE), nicht nur ein
 * sessionStorage-Trick wie mindful7777s VIP-Seiten — der Code steht nirgends
 * im Quelltext, die Prüfung läuft über denselben Apps-Script-Endpunkt wie das
 * Onboarding, nur mit einem eigenen, von ACCESS_CODE unabhängigen Property.
 *
 * Einmal pro Browser-Tab entsperrt (sessionStorage), gilt dann für jede
 * weitere Seite auf dieser Domain, die dieses Skript einbindet — einfach
 * <script src="../assets/js/werkstatt-gate.js"></script> (Pfad anpassen)
 * vor dem schließenden </body> jeder zu schützenden Seite einfügen.
 */
(function () {
  "use strict";

  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbznh7ttNtbXdgoSwLcSN6CAPXQJhwRfYT8pYkNBW1OePugQJG426L_lG3nPL95_eLhpmQ/exec";
  const SESSION_KEY = "s4s_werkstatt_unlocked";

  if (sessionStorage.getItem(SESSION_KEY) === "1") return; // schon entsperrt in diesem Tab

  const style = document.createElement("style");
  style.textContent = `
    html.werkstatt-locked body > *:not(#werkstattGate){ display:none !important; }
    #werkstattGate{
      position:fixed; inset:0; z-index:9999;
      background:#0b0c0e; color:#f2efe9;
      display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; padding:32px; text-align:center;
    }
    #werkstattGate p.label{ font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#8b8d92; margin:0; }
    #werkstattGate input{
      background:#141517; border:1px solid #232427; color:#f2efe9;
      padding:11px 14px; border-radius:7px; font-size:16px; text-align:center; letter-spacing:.25em; outline:none; width:200px;
    }
    #werkstattGate input:focus{ border-color:#c9a876; }
    #werkstattGate button{
      background:#c9a876; color:#16140f; border:none; border-radius:7px;
      padding:11px 26px; font-size:14px; font-weight:600; cursor:pointer;
    }
    #werkstattGate button:disabled{ opacity:.5; cursor:not-allowed; }
    #werkstattGate .err{ color:#e06b56; font-size:12.5px; display:none; }
    #werkstattGate .err.show{ display:block; }
  `;
  document.head.appendChild(style);
  document.documentElement.classList.add("werkstatt-locked");

  function mount() {
    const gate = document.createElement("div");
    gate.id = "werkstattGate";
    gate.innerHTML =
      '<p class="label">Werkstatt-Bereich</p>' +
      '<input type="password" id="werkstattCode" placeholder="Code" autocomplete="off" inputmode="text">' +
      '<button id="werkstattSubmit">Entsperren</button>' +
      '<p class="err" id="werkstattErr">Falscher Code.</p>';
    document.body.appendChild(gate);

    const input = document.getElementById("werkstattCode");
    const btn = document.getElementById("werkstattSubmit");
    const err = document.getElementById("werkstattErr");

    async function submit() {
      const code = input.value.trim();
      if (!code) return;
      btn.disabled = true;
      btn.textContent = "Prüfe…";
      err.classList.remove("show");
      try {
        const res = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" }, // vermeidet CORS-Preflight bei Apps Script
          body: JSON.stringify({ action: "verifyWerkstattCode", code }),
        });
        const data = await res.json();
        if (data && data.ok) {
          sessionStorage.setItem(SESSION_KEY, "1");
          gate.remove();
          document.documentElement.classList.remove("werkstatt-locked");
        } else {
          err.textContent = "Falscher Code.";
          err.classList.add("show");
          btn.disabled = false;
          btn.textContent = "Entsperren";
        }
      } catch (e) {
        err.textContent = "Verbindung fehlgeschlagen — Internet prüfen.";
        err.classList.add("show");
        btn.disabled = false;
        btn.textContent = "Entsperren";
      }
    }

    btn.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    input.focus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
