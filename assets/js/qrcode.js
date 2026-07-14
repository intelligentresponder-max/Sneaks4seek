/* Sneaks4Seek – QR-Code-Generierung auf der Success-Seite
   Nutzt die "qrcodejs"-Bibliothek (per CDN in success/index.html eingebunden). */

(function () {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || "UNBEKANNT";
  const ref = params.get("ref") || id;

  document.getElementById("ref-tag").textContent = "Ref: " + ref;
  document.getElementById("qr-caption").textContent = ref;

  const targetUrl = window.location.origin + window.location.pathname + "?id=" + encodeURIComponent(id);

  if (window.QRCode) {
    new QRCode(document.getElementById("qr"), {
      text: targetUrl,
      width: 96,
      height: 96,
      colorDark: "#1B1815",
      colorLight: "#F6F2E9",
    });
  } else {
    document.getElementById("qr").textContent = "QR-Bibliothek konnte nicht geladen werden.";
  }
})();
