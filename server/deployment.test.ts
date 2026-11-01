import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import pg from "pg";

// The deployment smoke test must not load local secrets or contact a provider.
process.env.VERCEL = "1";
process.env.NODE_ENV = "production";
process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/test";
const schema = `deployment_test_${process.pid}_${Date.now()}`;
if (process.env.TEST_DATABASE_URL) {
  const connection = new URL(process.env.TEST_DATABASE_URL);
  connection.searchParams.set("options", `-c search_path=${schema}`);
  process.env.DATABASE_URL = connection.toString();
}
process.env.SESSION_SECRET = "deployment-test-secret-which-is-at-least-32-characters";
delete process.env.GEMINI_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.HUGGINGFACE_API_KEY;

test("Vercel API initializes once, keeps API paths, and rejects unsafe production secrets", async t => {
  const admin = process.env.TEST_DATABASE_URL
    ? new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL }) : undefined;
  if (admin) {
    await admin.query(`CREATE SCHEMA ${schema}`);
    const sql = (await readFile(new URL("../db/setup.sql", import.meta.url), "utf8"))
      .replace("SET LOCAL search_path TO public;", `SET LOCAL search_path TO ${schema};`);
    await admin.query(sql);
  }
  const { createApp } = await import("./app");
  const { pool } = await import("../db");
  const { default: handler } = await import("../api/index");
  const server = createServer(handler);
  try {
    await t.test("production refuses missing, short, and example session secrets", async () => {
      const secret = process.env.SESSION_SECRET!;
      for (const value of ["", "short", "replace-with-a-long-random-secret", "default_secret_for_development_only"]) {
        process.env.SESSION_SECRET = value;
        await assert.rejects(createApp(), /SESSION_SECRET/);
      }
      process.env.SESSION_SECRET = secret;
    });

    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const origin = `http://127.0.0.1:${address.port}`;

    await t.test("concurrent health checks work without a database or Vite", async () => {
      const responses = await Promise.all(Array.from({ length: 5 }, () => fetch(`${origin}/api/health`)));
      for (const response of responses) {
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { status: "ok" });
        assert.equal(response.headers.get("cache-control"), "private, no-store");
        assert.equal(response.headers.get("x-powered-by"), null);
      }
    });

    await t.test("auth and missing API endpoints return JSON instead of SPA HTML", async () => {
      const user = await fetch(`${origin}/api/user`);
      assert.equal(user.status, 401);
      assert.deepEqual(await user.json(), { message: "Not authenticated" });
      const missing = await fetch(`${origin}/api/not-a-route?nested=true`);
      assert.equal(missing.status, 404);
      assert.deepEqual(await missing.json(), { message: "API route not found" });
    });

    await t.test("production login sets a secure cookie and persists a safe user session", { skip: !admin }, async () => {
      const { storage } = await import("./storage");
      const { hashPassword } = await import("./auth");
      const user = await storage.createUser({
        email: "deployment@test.invalid", name: "Deployment Test", role: "educator",
        password: await hashPassword("test-password"), emailVerified: true,
        emailVerificationToken: "private-verification-token", passwordResetToken: "private-reset-token",
      });
      const login = await fetch(`${origin}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Forwarded-Proto": "https" },
        body: JSON.stringify({ email: user.email, password: "test-password" }),
      });
      assert.equal(login.status, 200);
      const body = await login.json();
      assert.equal(body.id, user.id);
      for (const field of ["password", "emailVerificationToken", "passwordResetToken"]) {
        assert.equal(field in body, false);
      }
      const cookie = login.headers.get("set-cookie")!;
      assert.match(cookie, /; Secure/i);
      assert.match(cookie, /; HttpOnly/i);
      assert.match(cookie, /; SameSite=Lax/i);
      const authenticated = await fetch(`${origin}/api/user`, {
        headers: { Cookie: cookie.split(";")[0], "X-Forwarded-Proto": "https" },
      });
      assert.equal(authenticated.status, 200);
      assert.equal((await authenticated.json()).id, user.id);
      const sessions = await pool.query('SELECT count(*) AS count FROM "session"');
      assert.equal(Number(sessions.rows[0].count), 1);
    });

    await t.test("oversized request bodies return a clear JSON error", async () => {
      const response = await fetch(`${origin}/api/user/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePicture: "x".repeat(4 * 1024 * 1024) }),
      });
      assert.equal(response.status, 413);
      assert.match((await response.json()).message, /2 MB/);
    });
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await pool.end();
    if (admin) {
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  }
});
