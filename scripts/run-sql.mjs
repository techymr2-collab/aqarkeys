// Applies one or more .sql files to the database in SUPABASE_DB_URL.
// Usage: node --env-file=.env scripts/run-sql.mjs supabase/migrations/0001_schema.sql ...
import { readFile } from "node:fs/promises";
import pg from "pg";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("No .sql files given.");
  process.exit(1);
}

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("SUPABASE_DB_URL is not set in .env");
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  for (const file of files) {
    const sql = await readFile(file, "utf8");
    process.stdout.write(`Applying ${file} ... `);
    await client.query(sql);
    console.log("ok");
  }
  console.log("All migrations applied.");
} catch (err) {
  console.error("\nFailed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
