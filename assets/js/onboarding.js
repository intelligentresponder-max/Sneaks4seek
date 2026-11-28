/* Sneaks4Seek – Onboarding-Formular (öffentlich, ohne Zugangscode)
   Kontakt-Pflicht (E-Mail oder Messenger), Datei-Validierung/-Vorschau,
   Upload- und Submit-Flow gegen apps-script/Code.gs (pubInit / pubUpload / pubFinalize).
   APPS_SCRIPT_URL kommt aus assets/js/api.js. */
(function () {
  "use strict";

  const MAX_IMAGES = 10;
  const MAX_VIDEOS = 10;
  const MAX_IMAGE_MB = 20;   // pro Bild (vor dem Verkleinern)
  const MAX_VIDEO_MB = 50;   // pro Video
  const IMAGE_MAX_PX = 1600; // längste Seite nach dem Verkleinern

  let images = [];
  let videos = [];

  const $ = (id) => document.getElementById(id);

  // ---------- Server-Aufruf ----------
  async function callApi(payload) {
    if (typeof APPS_SCRIPT_URL === "undefined") {
      throw new Error("Konfiguration fehlt (APPS_SCRIPT_URL).");
    }
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // vermeidet CORS-Preflight
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data && data.error) {
      const err = new Error(data.error);
      err.server = true;
      throw err;
    }
    return data;
  }

  async function callApiRetry(payload) {
    try {
      return await callApi(payload);
    } catch (err) {
      if (err.server) throw err;           // Server hat klar abgelehnt: nicht wiederholen
      return await callApi(payload);       // Netzwerkfehler: ein zweiter Versuch
    }
  }

  // ---------- Datei-Helfer ----------
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result.split(",")[1]);
      r.onerror = () => reject(new Error("Datei konnte nicht gelesen werden: " + file.name));
      r.readAsDataURL(file);
    });
  }

  // Bilder vor dem Upload verkleinern (schnellerer Upload am Handy). Bei Problemen
  // (z. B. HEIC) wird das Original unverändert hochgeladen.
  function resizeImage(file) {
    return new Promise((resolve) => {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { resolve(file); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, IMAGE_MAX_PX / Math.max(img.width, img.height));
        if (scale === 1 && file.size < 1.5 * 1024 * 1024) { resolve(file); return; }
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return; }
          const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
          resolve(new File([blob], name, { type: "image/jpeg" }));
        }, "image/jpeg", 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  function showUploadError(msg) {
    const el = $("upload-error");
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 4000);
  }

  function renderThumbs(list, container, kind) {
    container.innerHTML = "";
    list.forEach((entry, i) => {
      const div = document.createElement("div");
      div.className = "thumb" + (kind === "video" ? " video" : "");
      if (kind === "image") {
        const img = document.createElement("img");
        img.src = entry.previewUrl;
        div.appendChild(img);
      } else {
        div.textContent = entry.file.name;
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "remove";
      btn.textContent = "×";
      btn.addEventListener("click", () => {
        list.splice(i, 1);
        renderThumbs(list, container, kind);
      });
      div.appendChild(btn);
      container.appendChild(div);
    });
  }

  function handleFiles(fileList, list, container, kind, maxCount, maxMb) {
    const incoming = Array.from(fileList);
    for (const file of incoming) {
      if (list.length >= maxCount) {
        showUploadError(`Maximal ${maxCount} ${kind === "image" ? "Bilder" : "Videos"} erlaubt.`);
        break;
      }
      if (file.size > maxMb * 1024 * 1024) {
        showUploadError(`"${file.name}" ist größer als ${maxMb} MB.`);
        continue;
      }
      const entry = { file, previewUrl: kind === "image" ? URL.createObjectURL(file) : null };
      list.push(entry);
    }
    renderThumbs(list, container, kind);
  }

  const imageInput = $("image-input");
  const videoInput = $("video-input");
  const imageBox = $("image-box");
  const videoBox = $("video-box");
  const imageThumbs = $("image-thumbs");
  const videoThumbs = $("video-thumbs");

  imageBox.addEventListener("click", () => imageInput.click());
  videoBox.addEventListener("click", () => videoInput.click());

  imageInput.addEventListener("change", (e) => {
    handleFiles(e.target.files, images, imageThumbs, "image", MAX_IMAGES, MAX_IMAGE_MB);
    imageInput.value = "";
  });
  videoInput.addEventListener("change", (e) => {
    handleFiles(e.target.files, videos, videoThumbs, "video", MAX_VIDEOS, MAX_VIDEO_MB);
    videoInput.value = "";
  });

  // ---------- Kontakt: E-Mail ODER Messenger ----------
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const contactError = $("contact-error");
  const messengerType = $("messenger-type");
  const messengerHandle = $("messenger-handle");

  function isPhone(s) {
    return /^\+?\d{7,15}$/.test(String(s).replace(/[\s()\/.-]/g, ""));
  }

  function validateContact() {
    const email = $("email").value.trim();
    const type = messengerType.value;
    const handle = messengerHandle.value.trim();

    if (!email && !type && !handle) return "Bitte E-Mail oder Messenger angeben, eins davon ist Pflicht.";
    if (email && !EMAIL_RE.test(email)) return "Die E-Mail-Adresse sieht nicht richtig aus.";
    if (type || handle) {
      if (!type || !handle) return "Bitte Messenger und Nummer oder Name zusammen angeben.";
      const ok = type === "Telegram"
        ? (/^@?[A-Za-z0-9_]{4,32}$/.test(handle) || isPhone(handle))
        : isPhone(handle);
      if (!ok) {
        return type === "Telegram"
          ? "Bitte @Name (mind. 4 Zeichen) oder Handynummer angeben."
          : "Bitte die Handynummer mit Vorwahl angeben, z. B. +49 170 1234567.";
      }
    }
    return "";
  }

  messengerType.addEventListener("change", () => {
    messengerHandle.placeholder = messengerType.value === "Telegram"
      ? "@name oder Handynummer"
      : "z. B. +49 170 1234567";
  });

  // ---------- Submit-Flow ----------
  const form = $("onboarding-form");
  const submitBtn = $("submit-btn");
  const progressTrack = $("progress-track");
  const progressFill = $("progress-fill");
  const statusMsg = $("status-msg");
  const submitError = $("submit-error");

  function setProgress(pct, text) {
    progressTrack.style.display = "block";
    progressFill.style.width = pct + "%";
    statusMsg.textContent = text || "";
  }

  function showThanks(ref, contact) {
    const via = [];
    if (contact.email) via.push("per E-Mail");
    if (contact.messengerType) via.push("per " + contact.messengerType);
    $("thanks-text").textContent =
      "Wir haben deine Fotos und Angaben erhalten und melden uns " + via.join(" oder ") +
      " mit Angebot und Abholung.";
    $("thanks-ref").textContent = ref;
    const tag = $("ref-tag");
    if (tag) tag.textContent = "Ref: " + ref;
    form.style.display = "none";
    $("thanks").style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitError.classList.remove("show");
    contactError.classList.remove("show");

    const contactMsg = validateContact();
    if (contactMsg) {
      contactError.textContent = contactMsg;
      contactError.classList.add("show");
      contactError.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!images.length) {
      showUploadError("Bitte mindestens ein Foto hinzufügen.");
      imageBox.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const fd = Object.fromEntries(new FormData(form).entries());
    const contact = {
      name: (fd.name || "").trim(),
      email: (fd.email || "").trim(),
      messengerType: fd.messenger_type || "",
      messengerHandle: (fd.messenger_handle || "").trim(),
    };
    const details = {
      brand: fd.brand || "",
      model: fd.model || "",
      size: fd.size || "",
      price: fd.price || "",
      condition: fd.condition || "",
      notes: fd.notes || "",
    };

    submitBtn.disabled = true;
    setProgress(3, "Sende Anfrage…");

    try {
      const init = await callApi({ action: "pubInit", contact, website: fd.website || "" });
      const submissionId = init.submissionId;
      const token = init.token;

      const allFiles = [
        ...images.map((e) => ({ file: e.file, kind: "image" })),
        ...videos.map((e) => ({ file: e.file, kind: "video" })),
      ];
      const total = allFiles.length;
      for (let i = 0; i < total; i++) {
        const entry = allFiles[i];
        setProgress(5 + (i / total) * 85, `Lade Datei ${i + 1}/${total} hoch…`);
        const file = entry.kind === "image" ? await resizeImage(entry.file) : entry.file;
        const base64 = await fileToBase64(file);
        await callApiRetry({
          action: "pubUpload",
          submissionId,
          token,
          file: {
            filename: file.name,
            mimeType: file.type || (entry.kind === "image" ? "image/jpeg" : "video/mp4"),
            base64,
            kind: entry.kind,
          },
        });
      }

      setProgress(95, "Schließe Anfrage ab…");
      const fin = await callApi({ action: "pubFinalize", submissionId, token, formData: details });
      setProgress(100, "Fertig!");
      showThanks(fin.ref || submissionId, contact);
    } catch (err) {
      submitBtn.disabled = false;
      progressTrack.style.display = "none";
      statusMsg.textContent = "";
      submitError.textContent = "Senden fehlgeschlagen: " + err.message;
      submitError.classList.add("show");
    }
  });
})();
