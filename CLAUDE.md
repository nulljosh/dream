# Dream

Dream journal with interpretation. v1 live at https://dream.trommatic.workers.dev

## What it is
User writes a dream, app stores it, an LLM returns an interpretation. Value accrues over
time: the app reads the user's *history*, not just the one entry, so the interpretation can
say "this is the fourth time you have dreamt about the same house."

## The one rule that shapes everything
**Interpretation is generated from the whole journal, not the single entry.** Any design
that treats a dream as a stateless prompt is the wrong design — that is a chat window with
extra steps and there is no reason to use this app over Claude directly.

## Stack (v1 as built)
- One Worker serves everything: `worker.js` routes `/api/interpret` to `interpret.js` and
  hands every other path to the static assets in `web/`. **Pages was the obvious host and
  does not work here** — Pages config rejects the `unsafe` rate-limit binding, and an
  unthrottled public endpoint that bills Workers AI is worse than a slightly odd layout.
- Model: `@cf/qwen/qwen3-30b-a3b-fp8` on Workers AI. **No API key, no paid provider** — the
  user's standing call is that users don't get billed-for AI yet. Swapping to Anthropic later
  is one function body.
- Storage: `localStorage` only. No accounts, no Supabase, nothing server-side. Supabase +
  RLS is v2 and the rules below apply the moment it lands.
- iOS: native SwiftUI later, talking to the same Worker. Not a WebView wrapper — that is a
  guaranteed 4.2 rejection.

## Privacy is the product constraint
Dream text is intimate. Rules, not aspirations:
- Row-level security on every table, keyed to auth.uid(). No service-role key in any client.
- No analytics on dream content. Ever. Counts and timestamps only.
- Export and delete-everything are v1 features, not "later".
- Never log a dream body server-side, including in Worker error paths.

## The prompt is the product
`SYSTEM` in `interpret.js`. Two things it earns its length for, both found by testing:
- **Fabricated recurrence.** The first version cited a date whose entry had nothing in
  common with tonight's dream. The prompt now requires naming the shared detail out loud
  ("the same rising water as in the Mar 3 entry") so the person can check it, and forbids
  citing a date it cannot quote a detail from.
- **Full sentences.** Without it the model returns fragment lists that read like a horoscope.

## Interpretation guardrails
Not a therapist, not a psychic. The copy and the prompt both stay on the side of
"here is what recurs in your own writing" rather than "this means you will meet a stranger."
Mental-health-adjacent content (self-harm, acute distress) gets a plain resources line, not
an interpretation. **The prompt instruction alone does not work** — tested with an explicit
suicidal dream and the model interpreted it anyway. So the real guard is `DISTRESS`, a
deterministic regex in `interpret.js` that returns the resources line before any model call.
Keep it. A false positive costs one reading; a false negative interprets a suicide note.
The footer carries a standing resources line too, because neither guard catches everything.

## Hero
Same shape as the bookrank/quotestreak landing heroes. The background is **drifting fog
drawn as a fragment shader** (`web/bg.js`) — the first version used blurred CSS orbs and
read as exactly what it was, a gradient. A shader was the way to get something video-like
with no file to download, no licence, no autoplay rules and no loop seam.

Domain-warped value-noise fbm, five octaves, folded twice so the shapes move through each
other rather than sliding past. It runs at half resolution and 30fps — it is fog, nobody
can tell, and it quarters the GPU cost. Frozen (not blanked) under
`prefers-reduced-motion`, and it stops drawing on a hidden tab. No WebGL means the hero's
flat night colour, which is a fine floor.

The `::after` scrim stays: it is legibility over the fog, not decoration. **The journal UI
below the hero stays flat.**

## House rules that apply here
No purple, no teal, no gradients, no emojis, no border-stripe accents, no monospace UI.
Sans-serif only (SF or Helvetica via `--font-body`). Design tokens come from
`nulljosh.github.io` `tokens.css` — edit that, do not fork a theme.
