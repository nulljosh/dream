# Dream Technical Whitepaper

**v1.0.0** | August 2026

## The problem
People who keep dream journals almost never read them back. The writing takes two minutes
at 6am and the payoff, noticing that the same anxiety has been staged in your head eleven
times this year, requires reading a hundred entries at once. Nobody does that. So the
journal becomes a write-only file and the habit dies inside a month.

Meanwhile, the "what does my dream mean" market is served by dream dictionaries: static
lookup tables that say a snake means betrayal regardless of who is dreaming. They are wrong
in a specific way, the meaning of a symbol is personal and only visible across repetitions.

## The idea
An app that makes the reading-back automatic. You write the dream; the app does the pattern
matching you were never going to do yourself, and hands back a short interpretation grounded
in your own previous entries.

The interpretation is the hook. The history is the product.

## Why now
Long-context language models make the retrieval-and-synthesis step cheap and good. A dream
journal is small, a heavy user writes maybe 300 entries a year, roughly 60k words. That
fits in context outright, so the hard version of this (embed, cluster, retrieve) is not
needed at the start and probably not ever for a single user's journal.

## What it does
1. Capture. Text or voice, in under thirty seconds, half-awake. This is the make-or-break
   surface, if capture is slow the app is dead no matter how good the interpretation is.
2. Interpret. Model gets the new entry plus the relevant history and returns: the emotional
   read, the two or three symbols that carry weight, and explicit callbacks to previous
   dreams that share them.
3. Look back. Recurring symbols over time, mood trend, "you dream about work every Sunday
   night." This is the part a dream dictionary can never do.

## What it is not
Not therapy, not diagnosis, not prophecy. It does not tell you the future and it does not
tell you what is wrong with you. It reflects your own material back with the repetitions
made visible, and it says so plainly in the copy.

## Why anyone pays
Free tier: capture, store, search, and a handful of interpretations a month. Paid: unlimited
interpretation plus the longitudinal views, which are the part that only gets better the
longer you stay. Every app in this codebase currently ships free (see GTM.md); this is the
one with an honest reason to charge, the marginal cost is a real API call.

## Risks, in order of how much they matter
1. **Retention.** Dream recall is bad and inconsistent, most people have nothing to write on
   most mornings. An app you open eight times a month is a hard habit to hold. Mitigation is
   a capture surface fast enough that a two-line fragment feels worth logging.
2. **Interpretation quality is unfalsifiable.** Nobody can tell you the reading was wrong,
   which sounds like an advantage and is actually a trap: it makes it easy to ship
   sycophantic horoscope text that feels good and means nothing. The defence is grounding
   every claim in a citation to the user's own entries.
3. **Privacy.** This is the most sensitive corpus of any app here. One leak is terminal.
   RLS, no content analytics, no server-side logging of bodies, export and delete in v1.
4. **Duty of care.** Dreams surface trauma, grief and self-harm ideation. Detect and hand
   over to real resources rather than interpreting.
5. **App Store framing.** Sell it as journaling with reflection. Health or medical claims
   invite a review fight nobody needs.

## The smallest thing worth building
One page: a textarea, a save, and a list of past entries. Interpretation calls the Worker
with the new entry plus the last N entries in the prompt. No accounts, no embeddings, no
mood charts, no notifications. If that is not compelling enough to use for a month, none of
the rest of it would have saved the idea.
