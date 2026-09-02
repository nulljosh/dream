// POST <audio bytes> (webm/opus from Chrome, mp4 from Safari) -> { text }
// Whisper on Workers AI. Same rules as interpret.js: never log a body, it is a dream.
const MODEL = "@cf/openai/whisper";
// ponytail: 6 MB is ~5 minutes of browser opus. Enough for a dream told half-awake.
const MAX_BYTES = 6 * 1024 * 1024;

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return json({ error: "POST only" }, 405);

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const { success } = await env.RATE_LIMITER.limit({ key: ip });
  if (!success) return json({ error: "rate limited" }, 429);

  const len = Number(request.headers.get("content-length") || 0);
  if (len > MAX_BYTES) return json({ error: "recording too long" }, 413);

  const audio = new Uint8Array(await request.arrayBuffer());
  if (audio.length === 0) return json({ error: "empty recording" }, 400);
  if (audio.length > MAX_BYTES) return json({ error: "recording too long" }, 413);

  let out;
  try {
    out = await env.AI.run(MODEL, { audio: [...audio] });
  } catch {
    return json({ error: "transcription failed" }, 502);
  }
  const text = (out?.text || "").trim();
  if (!text) return json({ error: "heard nothing" }, 422);
  return json({ text });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}
