/**
 * Aufnahme.
 *
 * Zwei Dinge, an denen mobile Audio-Apps regelmäßig scheitern und die hier
 * bewusst gelöst sind:
 *
 * 1. Safari liefert kein audio/webm. Ohne MimeType-Aushandlung bricht die App
 *    auf jedem iPhone — und das Handy ist hier das Hauptgerät.
 * 2. Die Standard-Audiofilter des Browsers sind auf Telefonie optimiert. Bei
 *    leiser, langsamer Sprache regelt autoGainControl die Pausen hoch und
 *    noiseSuppression frisst die Atemgeräusche weg. Beides ist genau das
 *    Material, das hier gebraucht wird. Also: alles aus.
 */

/**
 * Format-Aushandlung.
 *
 * Die Reihenfolge ist plattformabhängig, weil beide Seiten je einen Zwang haben:
 * Safari kann kein WebM, und auf Android ist Opus der ausgereiftere Pfad — die
 * MP4-Unterstützung im MediaRecorder ist dort je nach Chrome-Version und
 * Hersteller-Build unterschiedlich verlässlich. Samsung-Geräte laufen deshalb
 * bewusst auf Opus, auch wenn MP4 gemeldet wird.
 */
const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const OPUS_FIRST = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
];
const MP4_FIRST = [
  'audio/mp4',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/webm;codecs=opus',
  'audio/webm',
];

export function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const t of (IOS ? MP4_FIRST : OPUS_FIRST)) {
    if (MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return '';
}

export class Recorder extends EventTarget {
  constructor() {
    super();
    this.stream = null;
    this.rec = null;
    this.chunks = [];
    this.ctx = null;
    this.analyser = null;
    this.raf = null;
    this.startedAt = 0;
    this.peak = 0;
    this.clipped = false;
    this.wakeLock = null;

    // Nach einem Wechsel in den Hintergrund ist das Wake Lock weg.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.rec?.state === 'recording' && !this.wakeLock) {
        this._lockScreen();
      }
    });
  }

  async arm() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Dieser Browser erlaubt keine Aufnahme.');
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 48000,
        },
      });
    } catch (e) {
      const msg = e.name === 'NotAllowedError'
        ? 'Kein Mikrofonzugriff. Einstellungen → Safari → Mikrofon erlauben.'
        : 'Mikrofon nicht verfügbar.';
      throw new Error(msg);
    }

    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    src.connect(this.analyser);
    this._meter();
    return pickMimeType();
  }

  _meter() {
    const buf = new Float32Array(this.analyser.fftSize);
    const tick = () => {
      this.analyser.getFloatTimeDomainData(buf);
      let peak = 0;
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const a = Math.abs(buf[i]);
        if (a > peak) peak = a;
        sum += buf[i] * buf[i];
      }
      const rms = Math.sqrt(sum / buf.length);
      if (peak > 0.985) this.clipped = true;
      this.peak = peak;
      this.dispatchEvent(new CustomEvent('level', {
        detail: {
          peak,
          rms,
          db: rms > 0 ? 20 * Math.log10(rms) : -90,
          clipped: this.clipped,
          elapsed: this.rec?.state === 'recording' ? (Date.now() - this.startedAt) / 1000 : 0,
        },
      }));
      this.raf = requestAnimationFrame(tick);
    };
    tick();
  }

  /**
   * Bildschirmsperre verhindern.
   *
   * Ohne das ist ein zehnminütiger Take auf einem Android-Gerät ein Glücksspiel:
   * geht der Bildschirm aus, drosselt das System den Tab, und die Aufnahme
   * bricht ab oder bekommt Lücken. Das Wake Lock geht verloren, sobald der Tab
   * in den Hintergrund wechselt — deshalb wird es beim Zurückkommen erneut
   * angefordert.
   */
  async _lockScreen() {
    if (!('wakeLock' in navigator)) return;
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      this.wakeLock.addEventListener('release', () => { this.wakeLock = null; });
    } catch { /* Akkusparmodus verweigert das — kein Grund abzubrechen */ }
  }

  _releaseScreen() {
    this.wakeLock?.release().catch(() => {});
    this.wakeLock = null;
  }

  start() {
    if (!this.stream) throw new Error('Recorder nicht bereit.');
    const mimeType = pickMimeType();
    this.chunks = [];
    this.clipped = false;
    this.rec = new MediaRecorder(this.stream, mimeType ? { mimeType, audioBitsPerSecond: 192000 } : undefined);
    this.rec.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    // Ein Chunk pro Sekunde: bricht die Aufnahme unerwartet ab, ist alles bis
    // zur letzten Sekunde bereits gesichert.
    this.rec.start(1000);
    this.startedAt = Date.now();
    this._lockScreen();
    this.dispatchEvent(new Event('start'));
  }

  pause() { this.rec?.state === 'recording' && this.rec.pause(); }
  resume() { this.rec?.state === 'paused' && this.rec.resume(); }

  stop() {
    return new Promise((res) => {
      if (!this.rec || this.rec.state === 'inactive') return res(null);
      this.rec.onstop = () => {
        this._releaseScreen();
        const type = this.rec.mimeType || pickMimeType() || 'audio/webm';
        res({
          blob: new Blob(this.chunks, { type }),
          duration: (Date.now() - this.startedAt) / 1000,
          clipped: this.clipped,
          mimeType: type,
        });
      };
      this.rec.stop();
    });
  }

  release() {
    this._releaseScreen();
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close();
    this.stream = null;
    this.ctx = null;
  }
}

/** Grobe Qualitätsprüfung vor dem Klon-Upload. */
export async function inspect(blob) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
  const d = buf.getChannelData(0);

  let peak = 0, sum = 0, silent = 0;
  const win = Math.floor(buf.sampleRate * 0.05);
  for (let i = 0; i < d.length; i++) {
    const a = Math.abs(d[i]);
    if (a > peak) peak = a;
    sum += d[i] * d[i];
  }
  for (let i = 0; i < d.length; i += win) {
    let w = 0;
    for (let j = i; j < Math.min(i + win, d.length); j++) w = Math.max(w, Math.abs(d[j]));
    if (w < 0.005) silent += win;
  }
  const rms = Math.sqrt(sum / d.length);
  await ctx.close();

  const warnings = [];
  if (peak > 0.99) warnings.push('Übersteuert. Abstand zum Mikrofon vergrößern.');
  if (rms < 0.012) warnings.push('Sehr leise. Näher ans Mikrofon oder Gain erhöhen.');
  if (silent / d.length > 0.45) warnings.push('Viel Stille im Take. Für den Klon eher durchsprechen.');

  return {
    duration: buf.duration,
    peak,
    rmsDb: 20 * Math.log10(rms || 1e-9),
    silenceRatio: silent / d.length,
    warnings,
  };
}
