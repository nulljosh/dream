# Architecture

Dream is a personal dream journal with AI interpretation. Users write or speak a dream entry, the app interprets it by analyzing the entry against the user's entire dream history (looking for recurring symbols, patterns, emotions), and saves everything to the browser's localStorage. No accounts, no server-side storage, no analytics on dream content. The interpretation runs on Cloudflare Workers AI using Qwen; dream text never leaves the browser unless the user exports it. The interface is a static HTML app with a procedurally generated shader background (kaleidoscopic fractal breathing and rotating).

## How it runs

**Web:** User navigates to dream.heyitsmejosh.com. Static HTML loads. User types or speaks a dream (Whisper transcription via `/api/transcribe` runs in a Worker, converting audio to text). They press "Interpret" or Cmd+Enter. The app sends the entire journal history plus the new dream to `/api/interpret`. The Worker passes it to `@cf/qwen/qwen3-30b-a3b-fp8` on Workers AI, gets back an interpretation (symbols, likely feelings, references to earlier dreams), and returns it to the browser. The dream and interpretation are saved to `localStorage` only. Export and delete functions are local-only (no server calls).

## Cloudflare Worker

| File | What it owns |
|---|---|
| `worker.js` | Entry point. Routes `/api/interpret` to `interpret.js`, `/api/transcribe` to `transcribe.js`, and all other paths to static assets in `web/`. Binds to `env.AI` (Workers AI) and `env.RATE_LIMIT` (rate limiting, max 100 calls per hour). |
| `interpret.js` | Interpretation engine. Takes the entire dream journal (from the request body) and the new dream, builds a prompt with guardrails, and calls `@cf/qwen/qwen3-30b-a3b-fp8`. The prompt requires the model to cite specific details from previous dreams when claiming recurrence ("the same rising water as in the Mar 3 entry"), forbidding made-up dates. Detects acute distress via regex (`DISTRESS`) and returns a crisis resources line instead of an interpretation. Never logs dream text server-side, even in error paths. |
| `transcribe.js` | Speech-to-text via Workers AI Whisper model. Takes an audio blob, runs it through `@cf/openai/whisper`, and returns the transcribed text. Audio is not saved. |

## Web app

| File | What it owns |
|---|---|
| `web/index.html` | Main app. Text area for dream entry, "Speak" button (triggers `transcribe.js`), "Interpret" button, list of saved dreams, export/import buttons, delete button (two-step confirmation). A live region `#status` announces interpretations and errors (moved focus for accessibility). Cmd+Ctrl+Enter saves the entry. |
| `web/app.js` | App logic. Manages `localStorage` (load/save journal), calls `/api/interpret`, handles UI state (loading, error, success), renders the dream list and interpretations. No server sync; all state is local. |
| `web/onboarding.js` | First-run flow. If the journal is empty, show a welcome screen with explanation and an example dream. Dismissed on first entry. |
| `web/bg.js` | Background shader (fragment shader, kaleidoscopic fractal). Procedurally generates a breathing, slowly rotating sixfold-symmetric fractal in deep blue and amber/coral. Runs at 30fps and two-thirds resolution. Frozen (not blanked) under `prefers-reduced-motion`. Stops drawing when the tab is hidden. Falls back to solid color if WebGL is unsupported. |
| `web/sw.js` | Service worker. Caches the app shell for offline loading (though offline mode will not work without a cached API response). |
| CSS and design | `web/index.html` embeds or links styles. Color palette from `tokens.css` (deep blue, amber, coral). No light mode. Text never sits directly on the shader background; all text is on an opaque or frosted panel with sufficient contrast (17:1 for primary text, 10:1 for dimmed). Focus ring is visible (golden, `#ffd79a`). No gradients, no gradients, no emojis, no teal or purple. Sans-serif only (SF or Helvetica). |

## Testing

| File | What it owns |
|---|---|
| `interpret.test.mjs` | Test suite for `interpret.js`. Verifies prompt construction, distress detection, citation of previous dreams, and edge cases. Run with `node interpret.test.mjs`. |
| `transcribe.test.mjs` | Test suite for `transcribe.js`. Verifies audio transcription against test audio files. |
| `integration.mjs` | End-to-end integration tests. Calls the Worker endpoints and verifies full flows (dream entry → interpretation, speech input → transcription). |

## Kotlin Multiplatform

Note: Dream's KMP implementation is in development. It mirrors the web app's logic in Kotlin.

| File | What it owns |
|---|---|
| `kmp/shared/src/commonMain/kotlin/com/nulljosh/dream/DreamClient.kt` | Shared network code. Calls `/api/interpret` and `/api/transcribe`, decodes responses. |
| `kmp/shared/src/commonMain/kotlin/com/nulljosh/dream/Entries.kt` | Dream entry model and journal logic. Mirrors `localStorage` logic in Kotlin. |
| `kmp/shared/src/commonMain/kotlin/com/nulljosh/dream/Store.kt` | Abstract storage interface. Platform-specific implementations use Android Preferences or JVM UserPreferences. |
| `kmp/shared/src/commonMain/kotlin/com/nulljosh/dream/Clock.kt` | Abstract time source. Platform-specific overrides for Android and JVM. |
| `kmp/shared/src/commonTest/kotlin/com/nulljosh/dream/EntriesTest.kt` | Tests for the Kotlin entries model. Verifies interpretation parsing and journal operations. |
| `kmp/composeApp/src/commonMain/kotlin/com/nulljosh/dream/AppScreen.kt` | Shared Compose UI for Android and desktop. Same dream entry and list UI as the web app. |
| `kmp/composeApp/src/androidMain/kotlin/com/nulljosh/dream/MainActivity.kt` | Android entry point. Boots the Compose app. |
| `kmp/composeApp/src/desktopMain/kotlin/com/nulljosh/dream/Main.kt` | Desktop (JVM) entry point. Boots the Compose app as a window. |

## Local storage

| Key | What it stores |
|---|---|
| `dream.journal` | Array of dreams. Each entry: `{id, text, interpretation, createdAt, updatedAt}`. Entries are never sent to the server, only to the interpretation endpoint (the new entry plus the journal for context, history is sent but never saved server-side). |
| `dream.settings` | User preferences. Theme (dark-only currently), notification settings, etc. |

## Guardrails and safety

| Mechanism | Purpose |
|---|---|
| `DISTRESS` regex in `interpret.js` | Detects phrases indicating acute self-harm or crisis (keywords like "suicide", "cut", "overdose", etc.). If detected, returns a crisis resources line instead of calling the model. A false positive costs one reading; a false negative interprets a crisis entry as poetry. Keeps the regex. |
| Prompt instruction | The model is instructed to cite specific details when claiming recurrence, forbidding date-only citations. Prevents the model from fabricating connections. |
| No dream logging | Dream text is never logged to the Worker's console or error logs, not even on failure. Only timestamps and counts are logged (for rate limiting). |
| localStorage-only storage | Until accounts land (v2), dreams are 100% local. Clearing site data = total loss, no backup, no server copy. Export is the only backstop. |
| Two-step delete | Delete is first "Delete" button (announces intent), then a second "Delete for good?" confirmation that auto-dismisses after 4 seconds. Prevents accidental loss. |
| Export v1 feature | Export to JSON shipped in v1 ahead of schedule. Users can back up their entire journal before any account sync. |

## Prompt quality

The interpretation prompt (`interpret.js`, `SYSTEM` variable) is tuned to avoid two failure modes:

1. **Fabricated recurrence:** Early versions cited dreams from dates that had nothing in common with the current entry. The prompt now requires naming the shared detail out loud ("the same rising water as in the Mar 3 entry") so the user can check it. Prevents hallucination.
2. **Fragment lists:** Without explicit instruction, the model returns bullet-point fragments that read like a horoscope ("You are powerful," "Water means change"). The prompt requires full sentences explaining the symbolism in the user's own journal. |

## Whitepaper and roadmap

- `WHITEPAPER.md`: Technical and philosophical case for dream journaling and the design choices.
- `roadmap.md`: v1 shipped (localStorage, interpretation, speech input). v2 adds accounts, end-to-end encryption, multi-device sync via Supabase. v3 adds iOS native app (SwiftUI, not WebView).

## Gotchas

- **No light mode:** The shader background is bright, moving, and high-contrast. A light mode has no semantic meaning and would clash. Stays dark-only.
- **Shader performance:** The background runs at 30fps and two-thirds resolution on purpose. Full resolution on a retina panel (1080p+) is expensive fill, half resolution gets smeared details, two-thirds is the sweet spot.
- **Fallback:** If WebGL is unsupported, the shader does not render. The page falls back to a solid dark background color. The app is still fully usable.
- **Hidden tab:** The shader stops drawing when the page is hidden (`document.hidden`), saving CPU and battery. Resumes when the tab becomes visible again.
- **localStorage quota:** A typical journal of 100 dreams with interpretations is under 1MB, well within the 5-10MB typical quota. Exporting periodically is still wise.
- **Workers AI model names rotate:** `@cf/qwen/qwen3-30b-a3b-fp8` may be deprecated in the future. If the model fails, `/api/interpret` returns a 500. The app tells the user "interpretation unavailable" instead of breaking. The Worker logs the error (not the dream text) so the model name can be updated.
- **Audio upload limit:** `/api/transcribe` has a file size limit (typically 25MB, but check Cloudflare docs). Users should check that their audio file is reasonable size.
