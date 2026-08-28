# Dream

Write down a dream, get back what it might mean.

Type or dictate a dream, it gets saved, and an interpretation comes back: the recurring
symbols, the likely emotional read, and what has shown up before in your own dreams.
The point is the second part. A one-off interpretation is a party trick; a year of dreams
with the same three symbols in them is worth something.

## Status
v1 live: https://dream.trommatic.workers.dev

Write a dream, save it, hit Interpret. Entries live in your browser only. See `WHITEPAPER.md`
for the product argument and `roadmap.md` for what is next.

## Stack
One Cloudflare Worker: static HTML/CSS/JS in `web/`, plus `/api/interpret` running Qwen on
Workers AI. No API keys, no build step, no dependencies, no database. Accounts and iOS are v2+.

## Not doing
No dream dictionary lookup table. No astrology, no numerology. No social feed.
