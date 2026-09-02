# Dream, roadmap

## v0, decide it is worth building
DONE 2026-08-27. Prompt tested against real dreams before shipping; it fabricated a
recurrence on the first pass and was rewritten.

## v1, the smallest useful thing, SHIPPED 2026-08-27
- [ ] Use it for a month. This is the actual gate on everything below.

## v2, voice entry and accounts, VOICE DONE 2026-09-02
- [x] Voice entry via Whisper on Workers AI (shipped 2026-09-02, 5 tests, records via MediaRecorder, posts blob with same 6 MB cap and rate limiter as text)
- [ ] Supabase auth + `dreams` table with RLS keyed to auth.uid(). Check the shared spark
      project's free-tier headroom before creating anything.
- [ ] Delete-everything and ensure no recovery path. Ship with export, not later.
- [ ] Migrate localStorage entries on first sign-in.

## v3, the part people pay for
- [ ] Recurring symbols across the journal.
- [ ] Mood/theme trend over time.
- [ ] Search across entries.
- [ ] Stripe paywall on interpretation volume. Note: Paid Apps Agreement is still the
      standing blocker across this whole codebase.

## v4, iOS
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
