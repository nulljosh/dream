// Guard checks for /api/interpret. Run the dev server first:
//   npx wrangler pages dev web
//   node test.mjs [base-url]
import assert from "node:assert/strict";

const base = process.argv[2] || "http://localhost:8788";
const url = `${base}/api/interpret`;
const post = (body, init = {}) =>
  fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    ...init,
  });

const SECRET = "the flooded house on Alder Street";

assert.equal((await fetch(url)).status, 405, "GET must be rejected");
assert.equal((await post("{not json")).status, 400, "bad json must be rejected");
assert.equal((await post(JSON.stringify({ text: "   " }))).status, 400, "empty dream must be rejected");
assert.equal(
  (await post(JSON.stringify({ text: "x".repeat(8001) }))).status,
  400,
  "oversized dream must be rejected"
);
assert.equal(
  (await post(JSON.stringify({ text: "a dream", history: [{ at: Date.now(), text: "x".repeat(120001) }] }))).status,
  400,
  "oversized history must be rejected"
);

// An error path must never echo the dream back — that is how dream text ends up in
// a proxy log or a browser error report.
const echo = await post(JSON.stringify({ text: SECRET.repeat(400) }));
assert.equal(echo.status, 400);
assert.ok(!(await echo.text()).includes("Alder"), "error body must not echo dream text");

// Distress screen must fire before any model call, deterministically.
const crisis = await post(JSON.stringify({ text: "I dreamt I wanted to kill myself.", history: [] }));
assert.equal(crisis.status, 200);
assert.match((await crisis.json()).reading, /988/, "distress text must return the resources line");

console.log("ok");
