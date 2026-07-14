/* Sneaks4Seek – Onboarding-Formular
   Code-Gate, Datei-Validierung/-Vorschau, Upload- und Submit-Flow */

(function () {
  "use strict";

  const MAX_IMAGES = 10;
  const MAX_VIDEOS = 10;
  const MAX_IMAGE_MB = 20;   // pro Bild
  const MAX_VIDEO_MB = 50;   // pro Video (kleine Videos, s. Vorgabe)

  let accessCode = "";
  let images = [];
  let videos = [];

  // ---------- Zugangscode-Gate ----------
  const gate = document.getElementById("gate");
  const gateCode = document.getElementById("gate-code");
  const gateError = document.getElementById("gate-error");

  document.getElementById("gate-submit").addEventListener("click", () => {
    const val = gateCode.value.trim();
    if (!val) {
      gateError.textContent = "Bitte Code eingeben.";
      gateError.classList.add("show");
      return;
    }
    accessCode = val;
    gateError.classList.remove("show");
    gate.classList.add("hidden");
    // Hinweis: Der Code wird erst beim Absenden server-seitig geprüft
    // (siehe apps-script/Code.gs). Ein falscher Code führt dort zum Fehler.
  });

  gateCode.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); document.getElementById("gate-submit").click(); }
  });

  // ---------- Datei-Helfer ----------
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result.split(",")[1]);
      r.onerror = () => reject(new Error("Datei konnte nicht gelesen werden: " + file.name));
      r.readAsDataURL(file);
    });
  }

  function showUploadError(msg) {
    const el = document.getElementById("upload-error");
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

  const imageInput = document.getElementById("image-input");
  const videoInput = document.getElementById("video-input");
  const imageBox = document.getElementById("image-box");
  const videoBox = document.getElementById("video-box");
  const imageThumbs = document.getElementById("image-thumbs");
  const videoThumbs = document.getElementById("video-thumbs");

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

  // ---------- Submit-Flow ----------
  const form = document.getElementById("onboarding-form");
  const submitBtn = document.getElementById("submit-btn");
  const progressTrack = document.getElementById("progress-track");
  const progressFill = document.getElementById("progress-fill");
  const statusMsg = document.getElementById("status-msg");
  const submitError = document.getElementById("submit-error");

  function setProgress(pct, text) {
    progressTrack.style.display = "block";
    progressFill.style.width = pct + "%";
    statusMsg.textContent = text || "";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitError.classList.remove("show");

    if (!accessCode) {
      gate.classList.remove("hidden");
      gateError.textContent = "Bitte zuerst den Zugangscode eingeben.";
      gateError.classList.add("show");
      return;
    }

    const formData = Object.fromEntries(new FormData(form).entries());

    submitBtn.disabled = true;
    setProgress(3, "Sende Anfrage-Daten…");

    try {
      const initRes = await apiInit(accessCode, { name: formData.name, email: formData.email });
      const submissionId = initRes.submissionId;

      const allFiles = [
        ...images.map((e) => ({ ...e, kind: "image" })),
        ...videos.map((e) => ({ ...e, kind: "video" })),
      ];
      const total = allFiles.length || 1;

      for (let i = 0; i < allFiles.length; i++) {
        const entry = allFiles[i];
        setProgress(5 + (i / total) * 85, `Lade Datei ${i + 1}/${allFiles.length} hoch…`);
        const base64 = await fileToBase64(entry.file);
        await apiUpload(accessCode, submissionId, {
          filename: entry.file.name,
          mimeType: entry.file.type,
          base64,
          kind: entry.kind,
        });
      }

      setProgress(95, "Schließe Anfrage ab…");
      const finalRes = await apiFinalize(accessCode, submissionId, formData);

      setProgress(100, "Fertig!");
      const params = new URLSearchParams({
        id: submissionId,
        ref: finalRes.ref || submissionId,
      });
      window.location.href = "../success/?" + params.toString();
    } catch (err) {
      submitBtn.disabled = false;
      progressTrack.style.display = "none";
      statusMsg.textContent = "";
      submitError.textContent = "Fehler: " + err.message;
      submitError.classList.add("show");

      // Falscher Zugangscode → Gate erneut anzeigen
      if (/code/i.test(err.message)) {
        accessCode = "";
        gate.classList.remove("hidden");
        gateError.textContent = "Zugangscode wurde vom Server abgelehnt. Bitte erneut eingeben.";
        gateError.classList.add("show");
      }
    }
  });
})();
