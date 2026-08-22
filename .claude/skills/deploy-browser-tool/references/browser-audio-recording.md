# Browser-based microphone recording — what breaks and why

This is the reasoning behind `assets/recorder.js`. Read it before changing
that file, or before writing a recorder from scratch for a tool that doesn't
use it yet. Every point here comes from a real failure mode on a real device,
not a theoretical concern.

## 1. Format negotiation has to be platform-aware

`MediaRecorder` doesn't support the same codecs everywhere. Safari (and any
WebKit-based browser, which on iOS means *every* browser — Chrome on iOS is
Safari underneath) has no `audio/webm` support at all. If a recorder always
requests WebM/Opus first, recording works everywhere in testing except the
one platform most likely to matter: someone's iPhone, in the field, with no
one around to debug it.

The fix is a platform check and two ordered fallback lists:

```js
const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS reports as Mac

const OPUS_FIRST = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
const MP4_FIRST  = ['audio/mp4', 'audio/mp4;codecs=mp4a.40.2', 'audio/webm;codecs=opus', 'audio/webm'];
```

Android is the less obvious half of this: MP4 recording support in
`MediaRecorder` varies by Chrome version and device manufacturer, while Opus
is the mature, consistently-supported path. So even though Android *can*
report MP4 support, prefer Opus there — don't assume "not iOS" means "any
format is fine."

Always check with `MediaRecorder.isTypeSupported()` at runtime rather than
hardcoding a single mime type — this is what actually protects you as
browsers change codec support over time.

## 2. Turn off the phone-call filters

`getUserMedia`'s audio constraints default to a telephony-tuned pipeline:

- `autoGainControl` — continuously rides the gain up during quiet passages
  and down during loud ones. Great for a phone call where you want
  consistent perceived volume. Actively harmful for recording something
  where the *dynamics* are the point — slow, quiet speech will have its
  pauses and quiet passages amplified into audible noise floor.
- `noiseSuppression` — tuned to strip out non-speech sound. It also strips
  breath sounds, room tone, and anything else that isn't a clean speech
  formant. Fine for a conference call, destructive if the recording target
  is meant to sound natural or unprocessed.
- `echoCancellation` — necessary for two-way calls with a speaker output
  active. Irrelevant and sometimes audibly degrading for a single-source,
  headphone-or-quiet-room recording.

For any tool where the recording *is* the deliverable (voice cloning
reference material, narration, a produced audio product), request all three
disabled explicitly:

```js
navigator.mediaDevices.getUserMedia({
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false,
           channelCount: 1, sampleRate: 48000 },
});
```

This does mean the raw take can clip or run quiet if the speaker doesn't
self-manage — which is why `recorder.js` also does its own real-time peak/RMS
metering (`_meter()`) so the UI can show the person recording whether they're
too hot or too quiet, since the browser won't correct it for them anymore.

## 3. Long recordings need the screen kept awake

Mobile OSes throttle backgrounded or screen-off tabs to save battery. A
ten-minute recording on a screen-off phone is a coin flip: the tab may get
suspended mid-take, producing gaps or a truncated file. `navigator.wakeLock`
prevents the screen from sleeping while a lock is held —  but the lock is
also *released automatically* whenever the tab goes to the background
(switching apps, screen timeout override aside), so it must be re-acquired on
`visibilitychange` when the tab becomes visible again and a recording is
still active:

```js
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && this.rec?.state === 'recording' && !this.wakeLock) {
    this._lockScreen();
  }
});
```

Wrap the acquisition in a try/catch that fails silently — aggressive battery
saver modes on some Android devices refuse wake lock requests outright, and
that's not a reason to abort the recording, just a reason the user might need
to tap the screen occasionally to keep it from throttling.

## 4. Record in chunks, not as one blob at the end

`this.rec.start(1000)` — passing an interval to `MediaRecorder.start()` — makes
it emit a `dataavailable` chunk once a second instead of building up a single
blob it only hands over on `stop()`. This means an unexpected failure (tab
crash, browser kill, accidental navigation) loses at most the last second of
audio instead of the entire take. Push every chunk into an array as it
arrives and only assemble the final `Blob` on stop.

## 5. All of the above requires HTTPS, no exceptions

`getUserMedia` is gated behind a "secure context" check in every major
browser: `https://`, or `localhost` for local development. A page served over
plain `http://` — including a local IP address like `http://192.168.1.20:8080`
reached from another device on the same network — will refuse to grant
microphone access, and will typically do so *silently or with a generic
"not available" error*, not with an explanation that the problem is the
protocol. This is the single most common reason a "the microphone button
doesn't do anything" report turns out to be nothing to do with the
recording code at all.

For local testing across devices before something is deployed:
`cloudflared tunnel --url http://localhost:8080` produces a temporary
`https://` address pointing at a local dev server — a new URL each session,
but zero deploy step. For anything meant to stick around, deploying to
GitHub Pages (or any static host with HTTPS by default) is simpler than
maintaining a tunnel.

## 6. A basic quality check before the recording gets used for anything

If the recording feeds into something downstream that's expensive or
irreversible to redo badly (e.g. sent off to a paid voice-cloning API),
catching an obviously bad take locally first is worth the few lines it
costs. `recorder.js`'s `inspect()` decodes the finished blob and flags:

- clipping (`peak > 0.99`) — too close to the mic, or gain too hot
- too quiet (`rms < 0.012`) — too far from the mic
- too much silence (`silenceRatio > 0.45`) — dead air dominating the take

None of this replaces a human listening on real headphones before doing
anything expensive with the file — it's a cheap first filter, not a
substitute for that step.
