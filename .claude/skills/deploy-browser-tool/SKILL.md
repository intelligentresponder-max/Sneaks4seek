---
name: deploy-browser-tool
description: Deploy a finished, locally-tested browser tool (a self-contained folder of HTML/CSS/JS, no build step) into a git repo's tools/<name>/ directory so it goes live on GitHub Pages, entirely autonomously — find the source folder and the target repo, run a security check for leaked API keys, run the tool's own test suite if it has one, copy, commit, push, and verify the live URL. Use this whenever the user says something like "bring this tool into my repo", "spiel das Tool ins Repo ein", "deploy this to GitHub Pages", "push the folder from my Downloads into tools/", or hands over a task/Auftrag file describing exactly this copy-test-commit-push sequence. Also use it — even without an explicit deploy request — whenever the tool being deployed or built includes browser-based microphone recording (getUserMedia, MediaRecorder), since this skill bundles a battle-tested, drop-in audio recorder module and the non-obvious fixes it encodes (iOS codec negotiation, disabling telephony-tuned audio filters, wake-lock during long takes, HTTPS-only mic access). The end user receiving the final report is often non-technical — assume no git vocabulary on their side.
---

# Deploy a browser tool into a repo

This generalizes a one-off task instruction (`CLAUDE_CODE_AUFTRAG.md` from the
`mindful7777` project) into a repeatable procedure. The situation it targets:
someone built and tested a small browser tool locally (an HTML/CSS/JS folder,
sometimes with a companion server component like a Cloudflare Worker), and it
needs to end up live on GitHub Pages, in a repo that already publishes other
pages from its root. The person asking often isn't a developer — the thing
they actually want at the end is one URL they can open on a phone.

Work autonomously through the steps below. Only stop and ask the user when a
step is genuinely ambiguous or fails — not for things you can resolve
yourself by searching or reading.

## Step 1 — Find both places

You need: the source tool folder, and the target repo.

```bash
# search common locations; adjust the folder name to what the user told you
find ~ -maxdepth 4 -iname "<source-folder-name>" -type d 2>/dev/null
find / -maxdepth 6 -iname "<tool-name>" -type d 2>/dev/null | grep -v node_modules

find ~ -maxdepth 5 -iname "<repo-name>" -type d 2>/dev/null
```

If a candidate repo folder turns up without git remotes matching, or you find
a stray `.git` folder elsewhere, check `git remote -v` in it before ruling it
out. If both are unique after this search, proceed without asking. Only ask
the user — offering the candidates you found — if it's still ambiguous (e.g.
multiple matches, or nothing found at all).

In a remote/cloud session with no access to the user's local filesystem
(their Downloads folder isn't reachable from a sandboxed container), skip the
filesystem search and ask the user to upload the tool's files directly into
the conversation instead. Say so plainly rather than pretending to search a
filesystem you can't reach.

## Step 2 — Security check before touching the repo

This is the step that exists specifically to prevent an embarrassing mistake:
a tool built against a paid API (speech, LLM, image, whatever) sometimes ends
up with a key hardcoded in client-side code during development. Committing
that key to a public GitHub Pages repo exposes it to anyone who views source.
Run this unconditionally before copying anything:

```bash
cd "<source-folder>"

grep -rniE "elevenlabs|xi-api-key|api\.anthropic|api\.openai|sk-ant-|sk-proj-|sk-live-|sk-[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z_-]{35}|AKIA[0-9A-Z]{16}|api[_-]?key\s*[:=]\s*['\"][a-zA-Z0-9_-]{16,}" \
  --include="*.html" --include="*.js" --include="*.css" --include="*.json" --include="*.webmanifest" . \
  && echo "STOP — see match above, do not copy" || echo "clean, continue"
```

Adjust the pattern to whatever provider(s) the tool actually talks to — the
point isn't this exact list, it's that client-side code (anything served to
the browser: the app itself, not a server-side worker/function directory)
must never carry a real secret. A companion backend directory (e.g.
`worker/`, `server/`, `api/`) that expects secrets to be set via `wrangler
secret put` or an equivalent at deploy time is fine and expected to reference
key *names*, not values.

Also remove any generated file that duplicates something already in source
control for no reason — e.g. a build step that bakes a prompt or config into
a second file alongside the original. Check the tool's own README for
anything it flags as a build artifact that shouldn't be committed.

If the tool ships its own test suite, run it now and require it to pass
before anything is committed:

```bash
# whatever the tool's README specifies — examples:
node test/*.test.mjs
npm test
```

A failing grep match or failing test suite means: stop, report exactly what
was found, and don't copy. Don't try to fix the tool's own code to make a
test pass — it's supposed to arrive already finished and tested; if it isn't,
that's the user's problem to resolve, not something to paper over.

## Step 3 — Copy in and push

```bash
mkdir -p "<repo-path>/tools"
cp -r "<source-folder>" "<repo-path>/tools/<tool-name>"

cd "<repo-path>"
git add "tools/<tool-name>"
git status --short   # confirm only tools/<tool-name>/* is staged, nothing else
git commit -m "<tool-name>: <one-line description>"
git push -u origin <branch-name>
```

Never touch any other file or folder in the repo — this is purely additive.
Never `git push --force`. If push fails (auth prompt, no remote configured,
branch conflict), report the exact failure to the user in one sentence and
stop; don't guess at credentials or force through it.

## Step 4 — Verify it's actually live

GitHub Pages takes roughly one to two minutes to pick up a push.

```bash
git remote get-url origin
# derive the Pages URL from it, e.g.
# git@github.com:name/repo.git  →  https://name.github.io/repo/
```

```bash
curl -sI "https://<user>.github.io/<repo>/tools/<tool-name>/" | head -1
```

`HTTP/2 200` (or `HTTP/1.1 200`) means it's live. If you get a 404 shortly
after pushing, that's expected — wait and retry once or twice before
concluding something is actually wrong.

## Step 5 — Report back in plain language

The final message to the user should read like something you'd tell someone
non-technical over the phone: the URL, and how to use the tool — not what
you did to get there. No git commands, no file paths, no "committed",
"pushed", "grep'd". For example:

> Fertig. Im Chrome-Browser öffnen:
> **https://\<user\>.github.io/\<repo\>/tools/\<tool-name\>/**
>
> [one or two sentences on the actual first action — tap X, allow
> microphone, tap the button]

If the tool includes a microphone feature, mention explicitly that the page
must be opened over `https://` for the browser to grant mic access — a plain
`http://` address (like a local IP on the same wifi) will silently refuse,
however often the user taps "allow".

---

## When the tool records audio in the browser

If the tool you're deploying — or one you're asked to build from scratch —
needs to record from the microphone, don't start from a blank
`getUserMedia` call. `assets/recorder.js` in this skill is a self-contained,
dependency-free ES module that already handles the parts that are easy to
get wrong and hard to notice are wrong until someone tests on the actual
target device:

- **iOS refuses `audio/webm`.** Format negotiation has to try MP4 first on
  iOS and Opus/WebM first everywhere else, or recording silently fails on
  every iPhone.
- **The browser's default audio filters are tuned for phone calls**, not for
  slow or quiet speech: `autoGainControl` pumps up silence between phrases,
  `noiseSuppression` eats breath sounds. Both need to be explicitly disabled
  when the recording itself is the deliverable (e.g. voice-cloning reference
  material, narration).
- **A long recording needs the screen kept awake** (`navigator.wakeLock`),
  re-acquired on returning from background — otherwise the OS throttles the
  tab mid-take and the recording gets gaps or cuts off.
- **Chunked recording** (`rec.start(1000)`, one blob per second) means an
  unexpected stop still leaves everything up to the last second recoverable,
  instead of losing the whole take.
- **This all requires HTTPS.** No exceptions, no workarounds — mobile
  browsers do not grant microphone access on a plain `http://` origin, even
  on the same local network.

Read `references/browser-audio-recording.md` for the full rationale behind
each of these before changing how a tool records audio — copy
`assets/recorder.js` into the new tool's `js/` (or equivalent) directory and
import it rather than re-deriving these fixes from scratch. It has no
dependencies and no provider-specific code, so it drops into any repo as-is.

---

## What this skill deliberately doesn't do

- It doesn't modify the tool's own source. The tool is assumed finished and
  already tested; this skill's job is getting it live, not improving it.
- It doesn't set up a companion backend (a Cloudflare Worker, an API
  gateway, etc.), even if the tool has one — that needs the user's own API
  keys and a deploy step (e.g. `wrangler deploy`) that's a separate,
  later decision, not part of "get it live for a first look."
- It doesn't invent a repo, a branch, or a Pages configuration that doesn't
  already exist. If GitHub Pages isn't already serving the target repo, say
  so and stop rather than trying to set up Pages from scratch.
