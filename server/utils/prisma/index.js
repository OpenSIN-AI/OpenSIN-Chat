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

if (process.env.DATABASE_URL?.startsWith("postgresql://")) {
  prismaClientConfig.datasources = {
    db: { url: buildPostgresUrl(process.env.DATABASE_URL) },
  };
}

const prisma = new PrismaClient(prismaClientConfig);

// SQLite: enable WAL mode and set busy_timeout to prevent connection timeouts.
// Prisma's SQLite driver uses a connection pool (default 5) but without WAL mode,
// concurrent reads can block writes and cause "Timed out during query execution".
// Note: PRAGMA journal_mode returns a row, so we use $queryRawUnsafe not $executeRawUnsafe.
if (!process.env.DATABASE_URL?.startsWith("postgresql://")) {
  prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL").catch(() => {});
  prisma.$queryRawUnsafe("PRAGMA busy_timeout=15000").catch(() => {});
}

module.exports = prisma;
module.exports.buildPostgresUrl = buildPostgresUrl;
