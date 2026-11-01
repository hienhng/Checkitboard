import assert from "node:assert/strict";
import { test } from "node:test";
import { generatePassageFromWords } from "./aiService";

test("passage requests send options and return real content", async () => {
  const options = { topic: "ocean", gradeLevel: "elementary school", paragraphCount: 2, style: "narrative" };
  const words = ["resilient", "curious", "explore"];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "/api/ai/generate-passage");
    assert.equal(init?.credentials, "include");
    assert.deepEqual(JSON.parse(String(init?.body)), { words, ...options });
    return Response.json({ passage: "  A curious explorer.\n\nA resilient crew.  " });
  };
  try {
    assert.deepEqual(await generatePassageFromWords(words, options), { passage: "A curious explorer.\n\nA resilient crew." });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("failed generation never becomes a successful placeholder passage", async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const [status, body, message] of [
      [401, { message: "Not authenticated" }, /sign in again/],
      [403, { message: "Only educators can use this feature" }, /Only educators/],
      [503, { message: "Gemini is temporarily unavailable" }, /temporarily unavailable/],
      [200, { fallback: true }, /returned no passage/],
      [200, { passage: "   " }, /returned no passage/],
    ] as const) {
      globalThis.fetch = async () => Response.json(body, { status });
      await assert.rejects(generatePassageFromWords(["curious"]), message);
    }
    globalThis.fetch = async () => { throw new Error("Network offline"); };
    await assert.rejects(generatePassageFromWords(["curious"]), /Network offline/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
