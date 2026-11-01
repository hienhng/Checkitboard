import '../server/env.js';
import pkg from 'pg';
import { attachDatabasePool } from '@vercel/functions';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with connection retry logic and timeout settings
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: process.env.VERCEL ? 5 : 20,
  idleTimeoutMillis: process.env.VERCEL ? 5000 : 30000,
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection not established
});

if (process.env.VERCEL) {
  attachDatabasePool(pool);
}

// Add event listeners for connection issues
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

export const db = drizzle(pool, { schema });
