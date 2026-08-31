// node --test — the request ladder in interpret.js, with no server and no AI call.
// integration.mjs covers the same ground over HTTP but needs `wrangler pages dev` running,
// so it cannot be the CI check. Every case here short-circuits before env.AI is reached.
import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequest } from "./interpret.js";

// env.AI throws if anything reaches it — that is the point: these paths must not call the
// model. RATE_LIMITER always allows, so a failure here is never a rate-limit artifact.
const env = {
  RATE_LIMITER: { limit: async () => ({ success: true }) },
  AI: { run: async () => { throw new Error("reached the model on a path that should short-circuit"); } },
};
const post = body =>
  onRequest({ env, request: new Request("https://d/api/interpret", { method: "POST", body }) });

test("GET is rejected", async () => {
  const res = await onRequest({ env, request: new Request("https://d/api/interpret") });
  assert.equal(res.status, 405);
});

test("malformed json is rejected", async () => {
  assert.equal((await post("{not json")).status, 400);
});

test("an empty or whitespace dream is rejected", async () => {
  assert.equal((await post(JSON.stringify({ text: "   " }))).status, 400);
  assert.equal((await post(JSON.stringify({}))).status, 400);
});

test("an oversized dream is rejected", async () => {
  assert.equal((await post(JSON.stringify({ text: "x".repeat(8001) }))).status, 400);
});

test("oversized history is rejected", async () => {
  const history = [{ at: Date.now(), text: "x".repeat(120001) }];
  assert.equal((await post(JSON.stringify({ text: "a dream", history }))).status, 400);
});

// The one that actually matters. A false negative here interprets a suicide note as a
// dream, so each phrasing the regex claims to cover gets an assertion of its own.
test("distress short-circuits to the crisis line instead of the model", async () => {
  const phrasings = [
    "I dreamt about killing myself",
    "a dream where I want to die",
    "I dreamed of self-harm",
    "dream about suicide",
    "I don't want to wake up",
    "a dream about an overdose",
  ];
  for (const text of phrasings) {
    const res = await post(JSON.stringify({ text }));
    assert.equal(res.status, 200, `${text} -> ${res.status}`);
    const { reading } = await res.json();
    assert.match(reading, /988/, `"${text}" did not return the crisis line`);
  }
});

test("an ordinary dream is not flagged as distress", () => {
  // If this starts failing, the regex has grown greedy and every dream gets the crisis
  // line instead of a reading. The stub env.AI throws, and interpret.js turns a model
  // failure into a 502 — so 502 here means the guard correctly declined to short-circuit
  // and the request went on to the model.
  return post(JSON.stringify({ text: "I was flying over a field of blue horses" }))
    .then(res => assert.equal(res.status, 502));
});
