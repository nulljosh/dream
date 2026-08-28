# Dream — roadmap

## v0 — decide it is worth building
DONE 2026-08-27. Prompt tested against real dreams before shipping; it fabricated a
recurrence on the first pass and was rewritten. Name and domain deferred, `.workers.dev`
is fine until the thing has been used for a month.

## v0 — leftovers
- [ ] Name + App Store availability check (`asc-name-creator`). "Dream" is certainly taken.
- [ ] Buy/point a domain. Only worth it once v1 has survived a month of real use.

## v1 — the smallest useful thing — SHIPPED 2026-08-27
- [x] Single page: textarea, save, list of past entries. localStorage only, no backend.
- [x] Worker with static assets + `/api/interpret`, Workers AI (no key), rate limited by IP.
- [x] Interpret button: sends the new entry + previous entries, renders the reading.
- [x] `test.mjs` — guards on method, bad JSON, empty/oversized bodies, no dream text echoed in an error, and the distress screen. Run against the dev server or the live URL.
- [x] Landing page hero (animated drifting blurred lights, pure CSS).
- [ ] Use it for a month. This is the actual gate on everything below.

## v2 — accounts and persistence
- [ ] Supabase auth + `dreams` table with RLS keyed to auth.uid(). Check the shared spark
      project's free-tier headroom before creating anything.
- [ ] Export all entries (JSON + plain text) and delete-everything. Both ship here, not later.
- [ ] Migrate localStorage entries on first sign-in.

## v3 — the part people pay for
- [ ] Recurring symbols across the journal.
- [ ] Mood/theme trend over time.
- [ ] Search across entries.
- [ ] Stripe paywall on interpretation volume. Note: Paid Apps Agreement is still the
      standing blocker across this whole codebase.

## v4 — iOS
- [ ] Native SwiftUI, same Worker API. Not a WebView.
- [ ] Voice capture (on-device Speech), because typing at 6am is the retention problem.
- [ ] Optional morning notification.

## Deliberately not doing
Dream dictionary lookups. Social feed / shared dreams. Astrology, tarot, numerology.
Lucid-dreaming trainers. Sleep tracking (that is a hardware product).

## Open questions
- Voice-first from the start? It is the single biggest lever on capture speed, and pushing
  it to v4 may be wrong.
- How much history goes in the prompt: everything while it fits, or a retrieval step?
  Start with everything, it is simpler and fits for years.
- Does interpretation happen on save (magic, costs money on every entry) or on demand
  (cheap, one extra tap)? Start on demand.
