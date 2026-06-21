// SPDX-License-Identifier: MIT
const { PrismaClient } = require("@prisma/client");

// npx prisma introspect
// npx prisma generate
// npx prisma migrate dev --name init -> ensures that db is in sync with schema
// npx prisma migrate reset -> resets the db

const logLevels = ["error", "info", "warn"]; // add "query" to debug query logs

const prismaClientConfig = {
  log: logLevels,
};

function buildPostgresUrl(base) {
  if (!base) return null;
  const connLimit = Number(process.env.PRISMA_CONNECTION_LIMIT ?? 10);
  const poolTimeout = Number(process.env.PRISMA_POOL_TIMEOUT ?? 10);
  const stmtTimeout = process.env.PRISMA_STATEMENT_TIMEOUT ?? "15000";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}connection_limit=${connLimit}&pool_timeout=${poolTimeout}&statement_timeout=${stmtTimeout}`;
}

// SQLite: enable WAL mode and set busy_timeout to prevent connection timeouts.
// Prisma's SQLite driver (modernc.org/sqlite) uses a connection pool (default 5).
// busy_timeout is per-connection, so we use the _pragma DSN parameter to set it
// on EVERY connection in the pool. The modernc.org/sqlite driver supports
// ?_pragma=busy_timeout(15000) in the connection URL.
// Format: file:path?_pragma=busy_timeout(15000)&_pragma=journal_mode(WAL)
if (process.env.DATABASE_URL?.startsWith("postgresql://")) {
  prismaClientConfig.datasources = {
    db: { url: buildPostgresUrl(process.env.DATABASE_URL) },
  };
} else {
  const sqliteUrl = process.env.DATABASE_URL || "file:../storage/openafd.db";
  const base = sqliteUrl.split("?")[0];
  process.env.DATABASE_URL = `${base}?_pragma=busy_timeout(15000)`;
  prismaClientConfig.datasources = { db: { url: process.env.DATABASE_URL } };
}

const prisma = new PrismaClient(prismaClientConfig);

// WAL mode is database-level (persistent), so setting it once is sufficient.
if (!process.env.DATABASE_URL?.startsWith("postgresql://")) {
  prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL").catch(() => {});
}

module.exports = prisma;
module.exports.buildPostgresUrl = buildPostgresUrl;
