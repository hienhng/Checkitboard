import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

// Load unbundled JavaScript with Node itself, as Vercel does at invocation time.
// A Vite/esbuild bundle or a tsx test can hide invalid ESM module specifiers.
const root = fileURLToPath(new URL("../", import.meta.url));
const local = path.join(root, ".local");
await fs.mkdir(local, { recursive: true });
const outDir = await fs.mkdtemp(path.join(local, "api-build-"));

try {
  const { config, error } = ts.readConfigFile(path.join(root, "tsconfig.json"), ts.sys.readFile);
  if (error) throw new Error(ts.flattenDiagnosticMessageText(error.messageText, "\n"));
  const parsed = ts.parseJsonConfigFileContent({ ...config, include: ["api/index.ts"] }, ts.sys, root, {
    noEmit: false,
    incremental: false,
    allowImportingTsExtensions: false,
    rootDir: root,
    outDir,
  });
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const result = program.emit();
  const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program), ...result.diagnostics];
  if (diagnostics.length) {
    throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: name => name,
      getCurrentDirectory: () => root,
      getNewLine: () => "\n",
    }));
  }

  // Only synthetic configuration: this check never queries a database or AI service.
  Object.assign(process.env, {
    VERCEL: "1", NODE_ENV: "production",
    DATABASE_URL: "postgresql://test:test@127.0.0.1:1/test",
    SESSION_SECRET: "api-build-check-secret-of-at-least-32-characters",
  });
  for (const key of ["GEMINI_API_KEY", "OPENAI_API_KEY", "HUGGINGFACE_API_KEY"]) delete process.env[key];
  const { default: handler } = await import(pathToFileURL(path.join(outDir, "api/index.js")).href);
  assert.equal(typeof handler, "function");
  const { createApp } = await import(pathToFileURL(path.join(outDir, "server/app.js")).href);
  const { pool } = await import(pathToFileURL(path.join(outDir, "db/index.js")).href);
  try {
    const { app } = await createApp();
    assert.equal(app.get("env"), "production");
    console.log("API build check passed: native Node loaded the emitted ESM function and initialized the app.");
  } finally {
    await pool.end();
  }
} finally {
  // Only remove the unique build directory created above, inside this workspace.
  assert.ok(path.resolve(outDir).startsWith(path.resolve(local) + path.sep));
  await fs.rm(outDir, { recursive: true, force: true });
}
