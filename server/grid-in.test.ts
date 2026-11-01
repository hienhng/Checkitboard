import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import pg from "pg";
import express from "express";

test("automatic grid-in questions, publishing, answer saves and AI assessment", {
  skip: !process.env.TEST_DATABASE_URL,
}, async t => {
  const schema = `grid_in_test_${process.pid}_${Date.now()}`;
  const admin = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const connection = new URL(process.env.TEST_DATABASE_URL!);
  connection.searchParams.set("options", `-c search_path=${schema}`);
  process.env.DATABASE_URL = connection.toString();
  process.env.GEMINI_API_KEY = "test-key";
  process.env.GEMINI_MODEL = "test-model";
  process.env.SESSION_SECRET = "test-session-secret";
  delete process.env.OPENAI_API_KEY;
  await admin.query(`CREATE SCHEMA ${schema}`);
  let pool: pg.Pool | undefined;
  let server: import("node:http").Server | undefined;
  try {
    const sql = (await readFile(new URL("../db/setup.sql", import.meta.url), "utf8"))
      .replace("SET LOCAL search_path TO public;", `SET LOCAL search_path TO ${schema};`);
    await admin.query(sql);
    const database = await import("../db/index.js");
    pool = database.pool;
    const { storage } = await import("./storage.js");
    const { ensureDefaultGridInQuestions } = await import("./grid-in.js");
    const { gemini } = await import("./gemini.js");
    const { registerRoutes } = await import("./routes.js");
    const educator = await storage.createUser({ email: "teacher@test.invalid", password: "unused", name: "Teacher", role: "educator", emailVerified: true });
    const learner = await storage.createUser({ email: "learner@test.invalid", password: "unused", name: "Learner", role: "learner", emailVerified: true });
    let calls = 0;
    let fail = false;
    let malformed = false;
    gemini!.fetch = async (_url, init) => {
      calls++;
      if (fail) return Response.json({ error: { message: "High demand" } }, { status: 503 });
      const request = JSON.parse(String(init?.body));
      const { answers, passage } = JSON.parse(request.messages[1].content);
      assert.ok(passage.includes("resilient"));
      assert.ok(request.messages[0].content.includes("paraphrases"));
      const assessments = malformed ? [] : answers.map((answer: any) => ({
        questionId: answer.questionId, isCorrect: answer.studentAnswer === "able to bounce back",
      }));
      return Response.json({ choices: [{ message: { content: JSON.stringify({ assessments }) } }] });
    };
    const app = express();
    app.use(express.json());
    // Synthetic identities apply only to this test server, never the application server.
    app.use((req, _res, next) => {
      req.user = (req.headers["x-test-role"] === "learner" ? learner : educator) as Express.User;
      req.isAuthenticated = (() => true) as typeof req.isAuthenticated;
      next();
    });
    server = await registerRoutes(app);
    await new Promise<void>(resolve => server!.listen(0, "127.0.0.1", resolve));
    const origin = `http://127.0.0.1:${(server.address() as import("node:net").AddressInfo).port}`;
    async function api(path: string, method = "GET", body?: unknown, role = "educator") {
      const response = await fetch(origin + path, { method, headers: { "Content-Type": "application/json", "x-test-role": role }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, body: await response.json() };
    }

    const created = await api("/api/vocabulary-lists", "POST", {
      title: "Ocean words", passage: "The resilient explorer was curious and ready to explore the ocean.",
      words: ["resilient", "curious", "explore"],
    });
    assert.equal(created.status, 201);
    const listId = created.body.id;
    let questions: any[] = [];
    await t.test("every new word has a ready grid-in question without AI generation", async () => {
      const result = await api(`/api/vocabulary-lists/${listId}/questions`);
      assert.equal(result.status, 200);
      questions = result.body.questions;
      assert.equal(questions.length, 3);
      assert.ok(questions.every(question => question.type === "input" && question.question.includes("own words")));
      const statuses = await api(`/api/vocabulary-lists/${listId}/question-status`);
      assert.ok(statuses.body.every((status: any) => status.hasInputForm && status.inputFormCount === 1));
      assert.equal(calls, 0);
    });
    await t.test("older lists receive defaults once, including concurrent preparation", async () => {
      const old = await pool!.query("INSERT INTO vocabulary_lists (title,passage,educator_id) VALUES ('Legacy','resilient',$1) RETURNING id", [educator.id]);
      await pool!.query("INSERT INTO vocabulary_words (word,list_id) VALUES ('resilient',$1)", [old.rows[0].id]);
      await Promise.all([ensureDefaultGridInQuestions(old.rows[0].id), ensureDefaultGridInQuestions(old.rows[0].id)]);
      const result = await api(`/api/vocabulary-lists/${old.rows[0].id}/questions`);
      assert.equal(result.body.questions.length, 1);
    });
    await t.test("publish to multiple classes copies default questions", async () => {
      const classes = await pool!.query("INSERT INTO classes (name,class_code,educator_id) VALUES ('A','TEST-A',$1),('B','TEST-B',$1) RETURNING id", [educator.id]);
      await pool!.query("INSERT INTO student_class (student_id,class_id,status) VALUES ($1,$2,'approved')", [learner.id, classes.rows[0].id]);
      const published = await api(`/api/vocabulary-lists/${listId}/publish-multi`, "POST", { classIds: classes.rows.map(row => row.id) });
      assert.equal(published.status, 200);
      assert.equal(published.body.publishedLists.length, 2);
      const copied = await api(`/api/vocabulary-lists/${published.body.publishedLists[1].listId}/questions`);
      assert.equal(copied.body.questions.length, 3);
      const forLearner = await api(`/api/vocabulary-lists/${listId}/questions`, "GET", undefined, "learner");
      assert.ok(forLearner.body.questions.every((question: any) => !("correctAnswer" in question)));
    });
    let submissionId: number;
    await t.test("autosaves retain typed text without grading or leaking answers", async () => {
      const started = await api(`/api/vocabulary-lists/${listId}/start-test`, "POST", undefined, "learner");
      assert.equal(started.status, 200);
      submissionId = started.body.submissionId;
      for (const [index, answer] of ["able to bounce back", "wrong meaning"].entries()) {
        const saved = await api(`/api/submissions/${submissionId}/input-form-answer`, "POST", { questionId: questions[index].id, studentAnswer: answer }, "learner");
        assert.equal(saved.status, 201);
        assert.equal(saved.body.isCorrect, null);
      }
      assert.equal(calls, 0);
      const resumed = await api(`/api/vocabulary-lists/${listId}/questions?submissionId=${submissionId}`, "GET", undefined, "learner");
      assert.equal(resumed.body.savedAnswers[`input:${questions[0].id}`], "able to bounce back");
      const foreign = await pool!.query("SELECT id FROM input_form_questions WHERE word_id NOT IN (SELECT id FROM vocabulary_words WHERE list_id=$1) LIMIT 1", [listId]);
      const rejected = await api(`/api/submissions/${submissionId}/input-form-answer`, "POST", { questionId: foreign.rows[0].id, studentAnswer: "test" }, "learner");
      assert.equal(rejected.status, 400);
    });
    await t.test("AI outage or malformed grades preserve answers and keep the submission retryable", async () => {
      for (const mode of ["outage", "malformed"]) {
        fail = mode === "outage";
        malformed = mode === "malformed";
        const result = await api(`/api/submissions/${submissionId}/complete`, "POST", undefined, "learner");
        assert.equal(result.status, 503);
        assert.match(result.body.message, /answers are saved/);
        const saved = await pool!.query("SELECT completed,score,graded_at FROM submissions WHERE id=$1", [submissionId]);
        assert.deepEqual(saved.rows[0], { completed: false, score: null, graded_at: null });
        assert.equal((await pool!.query("SELECT count(*) FROM input_form_answers WHERE submission_id=$1", [submissionId])).rows[0].count, "2");
      }
      fail = false;
      malformed = false;
    });
    await t.test("AI accepts a paraphrase, rejects a wrong answer, and counts the skipped question", async () => {
      const result = await api(`/api/submissions/${submissionId}/complete`, "POST", undefined, "learner");
      assert.equal(result.status, 200);
      assert.equal(result.body.completed, true);
      assert.equal(result.body.score, 33);
      const answers = await pool!.query("SELECT student_answer,is_correct FROM input_form_answers WHERE submission_id=$1 ORDER BY question_id", [submissionId]);
      assert.deepEqual(answers.rows.map(row => row.is_correct), [true, false, false]);
      const overwrite = await api(`/api/submissions/${submissionId}/input-form-answer`, "POST", { questionId: questions[0].id, studentAnswer: "late autosave" }, "learner");
      assert.equal(overwrite.status, 400);
    });
    await t.test("draft words and lists remain removable after automatic question creation", async () => {
      const draft = await api("/api/vocabulary-lists", "POST", {
        title: "Disposable test draft", passage: "resilient curious", words: ["resilient", "curious"],
      });
      const edited = await api(`/api/vocabulary-lists/${draft.body.id}`, "PATCH", { title: draft.body.title, words: ["resilient"] });
      assert.equal(edited.status, 200);
      assert.equal(edited.body.words.length, 1);
      assert.equal((await api(`/api/vocabulary-lists/${draft.body.id}`, "DELETE")).status, 200);
    });
  } finally {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    if (pool) await pool.end();
    // This schema is created uniquely by this test and contains only its synthetic fixtures.
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
});
