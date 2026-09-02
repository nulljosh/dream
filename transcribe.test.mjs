import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequest } from "./transcribe.js";

const mk = (ai) => ({ RATE_LIMITER: { limit: async () => ({ success: true }) }, AI: { run: ai } });
const noAI = mk(async () => { throw new Error("reached the model"); });
const post = (env, body) =>
  onRequest({ env, request: new Request("https://d/api/transcribe", { method: "POST", body }) });

test("GET is rejected", async () => {
  const res = await onRequest({ env: noAI, request: new Request("https://d/api/transcribe") });
  assert.equal(res.status, 405);
});

test("empty body is rejected before the model", async () => {
  assert.equal((await post(noAI, new Uint8Array(0))).status, 400);
});

test("oversized body is rejected before the model", async () => {
  assert.equal((await post(noAI, new Uint8Array(6 * 1024 * 1024 + 1))).status, 413);
});

test("audio bytes reach whisper and text comes back", async () => {
  let got;
  const env = mk(async (_m, input) => { got = input.audio; return { text: "  the water was rising " }; });
  const res = await post(env, new Uint8Array([1, 2, 3]));
  assert.equal(res.status, 200);
  assert.deepEqual(got, [1, 2, 3]);
  assert.deepEqual(await res.json(), { text: "the water was rising" });
});

test("silence is a 422, not an empty dream", async () => {
  const env = mk(async () => ({ text: "" }));
  assert.equal((await post(env, new Uint8Array([1]))).status, 422);
});
