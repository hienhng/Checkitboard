import assert from "node:assert/strict";
import { test } from "node:test";
import OpenAI from "openai";

// Use synthetic keys and intercepted requests; these tests never call a provider.
process.env.GEMINI_API_KEY = "test-ai-studio-key";
process.env.GEMINI_MODEL = "test-gemini-model";
process.env.OPENAI_API_KEY = "test-fallback-key";

const service = await import("./gemini");
const ai = await import("./ai");
const { generateMultipleChoiceQuestion } = await import("./ai-questions");
const client = service.gemini!;
let content: unknown;
let requests: Record<string, any>[] = [];

client.fetch = async (url, init) => {
  assert.equal(String(url), "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
  assert.equal(new Headers(init?.headers as HeadersInit).get("authorization"), "Bearer test-ai-studio-key");
  const body = JSON.parse(String(init?.body));
  assert.equal(body.model, "test-gemini-model");
  assert.equal(body.reasoning_effort, "low");
  assert.ok(body.max_tokens >= 8192, "Leave output space for Gemini thinking tokens");
  requests.push(body);
  return new Response(JSON.stringify({
    choices: [{ message: { content: typeof content === "string" ? content : JSON.stringify(content) } }],
  }), { headers: { "Content-Type": "application/json" } });
};

test("Gemini powers every vocabulary feature and both question generators", async () => {
  assert.equal(service.isGeminiConfigured(), true);
  assert.equal(ai.getPrimaryAIProvider(), "Gemini");

  content = { resilient: "Able to recover." };
  assert.deepEqual(await ai.generateDefinitions(["resilient"]), content);

  content = { words: ["resilient", "adaptable", "resourceful"] };
  assert.deepEqual(await ai.analyzePassage("A resilient and adaptable explorer.", 2), ["resilient", "adaptable"]);

  content = "The resilient explorer continued the journey.";
  assert.equal(await ai.generatePassageFromWords(["resilient"]), content);
  assert.equal(requests.at(-1)?.response_format, undefined, "Passages remain plain text");

  content = { isCorrect: true, feedback: "Good understanding." };
  assert.deepEqual(await ai.gradeDefinition("resilient", "Can recover", "Able to recover"), content);

  content = { resilient: ["The resilient explorer continued."] };
  assert.deepEqual(await ai.generateExampleSentences(["resilient"]), content);

  const suggestions = [{ word: "adaptable", definition: "Can adjust", example: "She is adaptable.", category: "Daily Life", difficulty: "easy" }];
  content = { words: suggestions };
  assert.deepEqual(await ai.generateContextualSuggestions(["resilient"]), suggestions);
  assert.deepEqual(await ai.generateVocabularySuggestions(), suggestions);

  content = { difficultWords: ["resilient"], strategies: ["Use flashcards"], encouragement: "Keep going!" };
  assert.deepEqual(await ai.generateLearningStrategies(["resilient"], { resilient: false }), content);

  content = { distractors: ["Fragile", "Hasty", "Silent"] };
  const multipleChoice = await ai.generateMultipleChoice("resilient", "Able to recover");
  assert.equal(multipleChoice.correctAnswer, "Able to recover");
  assert.deepEqual([...multipleChoice.options].sort(), ["Able to recover", "Fragile", "Hasty", "Silent"].sort());

  content = { question: "What is resilient?", optionA: "Able to recover", optionB: "Fragile", optionC: "Hasty", optionD: "Silent", correctAnswer: "A" };
  assert.deepEqual(await generateMultipleChoiceQuestion({ word: "resilient" }), content);
  assert.equal(requests.length, 10);
  for (const request of requests.filter(request => request !== requests[2])) {
    assert.deepEqual(request.response_format, { type: "json_object" });
  }
});

test("question generation falls back to OpenAI when Gemini rejects the request", async () => {
  const originalFetch = client.fetch;
  const originalRequest = OpenAI.prototype.request;
  const fallbackQuestion = { question: "Meaning?", optionA: "Recover", optionB: "Break", optionC: "Stop", optionD: "Sleep", correctAnswer: "A" };
  client.fetch = async () => new Response(JSON.stringify({ error: { message: "Invalid key", type: "authentication_error" } }), {
    status: 401, headers: { "Content-Type": "application/json" },
  });
  let usedFallback = false;
  OpenAI.prototype.request = function (...args: Parameters<typeof originalRequest>) {
    if (this === client) return originalRequest.apply(this, args);
    assert.equal(this.baseURL, "https://api.openai.com/v1");
    usedFallback = true;
    return Promise.resolve({ choices: [{ message: { content: JSON.stringify(fallbackQuestion) } }] }) as ReturnType<typeof originalRequest>;
  };
  try {
    assert.deepEqual(await generateMultipleChoiceQuestion({ word: "resilient" }), fallbackQuestion);
    assert.equal(usedFallback, true);
  } finally {
    client.fetch = originalFetch;
    OpenAI.prototype.request = originalRequest;
  }
});

test("passage generation forwards the selected topic, level, style and paragraph count", async () => {
  content = "A resilient explorer stayed curious.\n\nShe would explore the ocean.";
  const passage = await ai.generatePassageFromWords(["resilient", "curious", "explore"], {
    topic: "the ocean", gradeLevel: "elementary school", paragraphCount: 2, style: "narrative",
  });
  assert.equal(passage, content);
  const prompt = requests.at(-1)!.messages[1].content;
  for (const expected of ["the ocean", "elementary school", "narrative", "exactly 2 paragraph(s)", "resilient, curious, explore"]) {
    assert.ok(prompt.includes(expected), `Prompt must include ${expected}`);
  }
});

test("passage generation preserves provider failure and still tries the backup", async () => {
  const originalFetch = client.fetch;
  const originalRequest = OpenAI.prototype.request;
  let backupCalls = 0;
  client.fetch = async () => new Response(JSON.stringify({ error: { message: "High demand" } }), {
    status: 503, headers: { "Content-Type": "application/json" },
  });
  OpenAI.prototype.request = function (...args: Parameters<typeof originalRequest>) {
    if (this === client) return originalRequest.apply(this, args);
    backupCalls++;
    return Promise.reject(new Error("Backup unavailable")) as ReturnType<typeof originalRequest>;
  };
  try {
    await assert.rejects(service.generatePassageFromWords(["resilient"]), /temporarily unavailable/);
    await assert.rejects(ai.generatePassageFromWords(["resilient"]), /backup AI service/);
    assert.equal(backupCalls, 1);
  } finally {
    client.fetch = originalFetch;
    OpenAI.prototype.request = originalRequest;
  }
});
