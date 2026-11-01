import "../server/env";
import { readFile } from "node:fs/promises";
import pg from "pg";

// Bootstrap an empty database without inserting development accounts.
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set.");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const sql = await readFile(new URL("./setup.sql", import.meta.url), "utf8");
    await pool.query(sql);
    console.log("Initial database schema is ready. Existing tables were not upgraded.");
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error("Database setup failed:", error);
  process.exitCode = 1;
});
