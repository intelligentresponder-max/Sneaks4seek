# Patch-Übergabe: handing files to someone who applies them themselves

Some repos document that Claude doesn't push directly — changes get
committed locally in Claude's own session and handed over as files, and the
person applies and pushes them from their own machine. This is a legitimate,
explicitly-chosen workflow in some projects (check the repo's own handover
docs for a line like "Claude hat keinen Push-Zugriff" / "Claude has no push
access" before assuming you should push), not a limitation to work around
quietly. It also applies whenever the person is working from their own local
clone in parallel with your session — pushing directly risks fighting over
the same branch.

## The two delivery paths, and when each works

**File download** (`SendUserFile` or equivalent) is the default — fast, and
the person just drags the file into place. But some environments refuse to
download certain file types (`.js` in particular has triggered silent
download failures in the field, likely a browser/OS security heuristic
around script files) with no useful error message, just "doesn't download."
When that happens, don't retry the same download — switch immediately to
the terminal method below.

**Terminal one-liner** (`cat > file << 'EOF' ... EOF` or the base64 method
below) — the person pastes a block directly into their shell. This works
even when downloads fail, but heredocs are not always safe to paste
verbatim: some terminal setups (observed in Git Bash on Windows, likely an
AI-powered autocomplete or shell-prediction plugin reacting to pasted text)
insert spurious completions whenever a `{` character appears mid-paste,
silently corrupting the file with garbage shell-glob text spliced in at
every brace. This is invisible until someone inspects the result — the
heredoc command itself reports success, and the corruption only shows up
when the file is read back or fails to parse. If a person reports a file
"looks wrong" or a script throws a syntax error right after a heredoc
paste, suspect this before anything else, especially if the original
content contained `{` or `}`.

## The fix: base64, not heredoc, for anything containing `{`

Base64 output uses only `A-Za-z0-9+/=` — no braces, no backticks, no `$`,
no quotes, nothing a shell or a terminal's autocomplete can misinterpret.
It's also binary-safe, so the same method works for images or any other
file a download has refused to deliver, not just text.

**Generate the one-liner** (in your own session, not the user's):

```bash
base64 -w0 path/to/file.js
```

(`-w0` disables line-wrapping — without it, `base64` on Linux wraps at 76
characters by default, which breaks the single-line paste. macOS/BSD
`base64` wraps differently and has no `-w` flag at all; use `base64 -b 0`
there instead, or just accept the wrapped multi-line output since it's still
brace-free and safe to paste, just less tidy.)

**Verify it decodes back to the exact same file before handing it over** —
this is not optional, it's the entire point of switching methods:

```bash
echo "<the base64 blob>" | base64 -d > /tmp/verify.js
diff /tmp/verify.js path/to/file.js && echo "IDENTISCH"
```

**Give the person this single line** to run in their own terminal, with
their own target path:

```bash
echo "<the base64 blob>" | base64 -d > path/to/file.js
```

**Have them verify on their end too** — a substring `grep` for something
you know is in the file (e.g. a URL or unique string you just changed) is a
quick sanity check, but it only proves that one string survived, not that
the whole file is byte-correct. Where the file matters a lot (you're mid
incident-recovery, or the file is large), prefer a full checksum comparison
instead — compute it on your side and give them the one-liner to compute
and compare on theirs:

```bash
sha256sum path/to/file.js
```

```bash
sha256sum path/to/file.js   # run this after the echo | base64 -d above, compare by eye
```

A substring grep is fine for small, low-stakes confirmations (did the URL
update land); reach for the checksum once the file is complex enough, or
the moment matters enough, that "contains this string" isn't the same as
"is correct."

## Don't over-apply this

Base64 is for the specific failure mode above — corrupted braces, or a
download that silently refuses. It's harder to read and harder to spot-
check by eye than a plain heredoc, so it's a fallback, not the default.
Try the plain heredoc or a normal file download first; switch to base64
only after one of them has actually failed, and say plainly why you're
switching so the person isn't confused by the sudden wall of letters.
