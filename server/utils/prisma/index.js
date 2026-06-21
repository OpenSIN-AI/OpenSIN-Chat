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
// WAL mode is database-level (persistent), so setting it once is sufficient.
// busy_timeout is per-connection. The _pragma DSN parameter doesn't work for
// busy_timeout in modernc.org/sqlite, so we limit the pool to 1 connection
// and set busy_timeout on it. SQLite is single-writer anyway (WAL allows
// concurrent readers but Prisma serializes queries), so connection_limit=1
// has minimal performance impact while eliminating pool-related timeouts.
const isPostgres = process.env.DATABASE_URL?.startsWith("postgresql://");

if (isPostgres) {
  prismaClientConfig.datasources = {
    db: { url: buildPostgresUrl(process.env.DATABASE_URL) },
  };
} else {
  const sqliteUrl = process.env.DATABASE_URL || "file:../storage/openafd.db";
  const base = sqliteUrl.split("?")[0];
  // connection_limit=1 ensures our PRAGMA busy_timeout applies to the only connection.
  process.env.DATABASE_URL = `${base}?connection_limit=1`;
  prismaClientConfig.datasources = { db: { url: process.env.DATABASE_URL } };
}

const prisma = new PrismaClient(prismaClientConfig);

if (!isPostgres) {
  prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL").catch(() => {});
  prisma.$queryRawUnsafe("PRAGMA busy_timeout=15000").catch(() => {});
}

module.exports = prisma;
module.exports.buildPostgresUrl = buildPostgresUrl;
