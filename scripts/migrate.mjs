#!/usr/bin/env node
/**
 * Applies pending Drizzle migrations to the database named by DATABASE_URL.
 *
 * This exists because nothing applied them. `pnpm db:push` runs
 * `drizzle-kit generate` before `drizzle-kit migrate`, so it can author new
 * migration files as a side effect and is not safe to aim at production, and
 * the Vercel build never touched the database at all. The consequence was that
 * migration 0004 (rate_limit_buckets, webhook_receipts) was committed but never
 * reached the live database, so every rate-limited route — signup and login
 * among them — failed with ER_NO_SUCH_TABLE.
 *
 * Apply-only: it never generates migration files and never drops anything.
 * Drizzle records what it has applied in __drizzle_migrations, so running this
 * repeatedly is a no-op.
 */
// Same convention as server/app.ts: load .env, without overriding anything
// already set in the real environment. Without this, `pnpm db:migrate` would
// not see a DATABASE_URL that lives only in .env.
import "dotenv/config";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

const migrationsFolder = path.resolve(fileURLToPath(new URL("../drizzle", import.meta.url)));

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    // Fatal for a production build, because shipping production against an
    // unmigrated schema is exactly the outage this script exists to prevent.
    // A failed build leaves the previous deployment serving traffic.
    if (process.env.VERCEL_ENV === "production") {
      throw new Error("DATABASE_URL is not available to the production build. Migrations cannot be applied, so this build would ship against an unmigrated schema. Set DATABASE_URL for the Production environment in the Vercel project settings.");
    }
    // Non-fatal elsewhere: local checkouts, CI, and preview builds without a
    // database still need to build. The line is loud so a misconfigured
    // deployment is visible in the build log.
    console.warn("[migrate] DATABASE_URL is not set — SKIPPING migrations. The deployed app will fail on any query against an unmigrated table.");
    return;
  }

  // Mirrors server/db.ts: mysql2 ignores "ssl-mode=REQUIRED" in the URI, so
  // hosts like Aiven that require TLS need an explicit ssl option.
  const parsed = new URL(databaseUrl);
  const connection = await mysql.createConnection({
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    ssl: { rejectUnauthorized: false },
    multipleStatements: true,
  });

  try {
    console.log(`[migrate] Applying pending migrations to ${parsed.hostname}/${parsed.pathname.replace(/^\//, "")}`);
    await migrate(drizzle(connection), { migrationsFolder });
    console.log("[migrate] Database is up to date.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("[migrate] Migration failed:", error);
  process.exitCode = 1;
});
