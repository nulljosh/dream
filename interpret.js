// POST { text, history: [{ at, text }] } -> { reading }
// Runs on Cloudflare Workers AI, so there is no API key and nothing to bill.
// ponytail: never log a request body here, not even in a catch. Dream text is the
// most personal content in this codebase and a log line is a leak.
const MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";
const MAX_TEXT = 8000;
const MAX_HISTORY_CHARS = 120000;

const CRISIS =
  "This one sounds heavy. If you are in distress, talking to a person helps more than a " +
  "reading: call or text 988 (US and Canada) any time.";

// ponytail: keyword screen, not a classifier. The model ignores the same instruction in
// the system prompt often enough that it cannot be the only guard -- a deterministic
// check that costs nothing beats an inference call that can be talked out of it.
// A false positive costs one reading; a false negative interprets a suicide note.
// Upgrade to a real classifier only if the false positives actually annoy someone.
const DISTRESS =
  /\b(kill(ing)? myself|killed myself|end(ing)? (my|it) (life|all)|take my own life|suicid|self[- ]harm|cut(ting)? myself|want(ed)? to die|don'?t want to (be here|wake up|live)|not want to wake up|overdos)/i;

const SYSTEM = `You interpret dreams for someone keeping a private dream journal.

You are given tonight's dream and that person's previous entries with their dates.

Write three short paragraphs of plain prose. No markdown, no headings, no lists, no line
breaks inside a paragraph.

Paragraph 1: one sentence naming the emotional read of tonight's dream.

Paragraph 2: two or three images from tonight's dream that carry weight, and what each one
is doing in this dream specifically. Full sentences, not fragments. Not what the image
means "generally" — no dream-dictionary lore.

Paragraph 3: recurrence. Before citing any date, check that the detail you are citing
actually appears in that entry's text, and name the shared detail out loud so the person
can check you: "the same rising water as in the Mar 3 entry." A date you cannot quote a
shared detail from is a date you must not cite. If nothing genuinely recurs, say so in one
sentence and stop — never stretch for a pattern, and never treat two entries as related
just because they are both anxious.

Rules:
- Ground every claim in words the person actually wrote.
- Do not predict the future. Do not diagnose. Do not flatter.
- Under 200 words total. No preamble, no sign-off, no emoji.
- If the dream describes self-harm, suicidal thinking or acute distress, skip the
  interpretation entirely and reply only: "This one sounds heavy. If you are in distress,
  talking to a person helps more than a reading: call or text 988 (US/Canada) any time."`;

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return json({ error: "POST only" }, 405);

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const { success } = await env.RATE_LIMITER.limit({ key: ip });
  if (!success) return json({ error: "rate limited" }, 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }

  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return json({ error: "empty dream" }, 400);
  if (text.length > MAX_TEXT) return json({ error: "dream too long" }, 400);

  if (DISTRESS.test(text)) return json({ reading: CRISIS });

  const history = Array.isArray(body?.history) ? body.history : [];
  const past = formatHistory(history);
  if (past.length > MAX_HISTORY_CHARS) return json({ error: "history too long" }, 400);

  const user = past
    ? `Previous entries:\n${past}\n\nTonight's dream:\n${text}`
    : `This is their first entry. There is no history to compare against.\n\nTonight's dream:\n${text}`;

  let out;
  try {
    out = await env.AI.run(MODEL, {
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `${user} /no_think` },
      ],
      temperature: 0.4,
      max_tokens: 700,
    });
  } catch {
    return json({ error: "interpretation failed" }, 502);
  }

  const msg = out?.choices?.[0]?.message;
  // Reasoning models sometimes hit max_tokens mid-thought and leave content null.
  const reading = (out?.response || msg?.content || "").trim();
  if (!reading) return json({ error: "interpretation failed" }, 502);
  return json({ reading });
}

// Oldest first, so recurrence reads chronologically. Undated entries are skipped
// rather than dated "Invalid Date" — a wrong citation is worse than a missing one.
function formatHistory(history) {
  return history
    .filter((e) => e && typeof e.text === "string" && e.text.trim())
    .map((e) => {
      const d = new Date(e.at);
      if (isNaN(d)) return null;
      return `[${d.toISOString().slice(0, 10)}] ${e.text.trim()}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}
