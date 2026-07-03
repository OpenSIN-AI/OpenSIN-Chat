// SPDX-License-Identifier: MIT
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

// npx prisma introspect
// npx prisma generate
// npx prisma migrate dev --name init -> ensures that db is in sync with schema
// npx prisma migrate reset -> resets the db

const logLevels = ["error", "info", "warn"]; // add "query" to debug query logs

// Prisma 7: the datasource URL is no longer in schema.prisma. We resolve it
// the same way prisma.config.ts does (env or default SQLite path) and pass
// it to the driver adapter which the PrismaClient constructor requires.
const isPostgres = process.env.DATABASE_URL?.startsWith("postgresql://");

function buildPostgresUrl(base) {
  if (!base) return null;
  const connLimit = Number(process.env.PRISMA_CONNECTION_LIMIT ?? 10);
  const poolTimeout = Number(process.env.PRISMA_POOL_TIMEOUT ?? 10);
  const stmtTimeout = process.env.PRISMA_STATEMENT_TIMEOUT ?? "15000";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}connection_limit=${connLimit}&pool_timeout=${poolTimeout}&statement_timeout=${stmtTimeout}`;
}

// SQLite: enable WAL mode and set busy_timeout to prevent connection timeouts.
// connection_limit=1 ensures our PRAGMA busy_timeout applies to the only connection.
const sqliteUrl = process.env.DATABASE_URL || "file:../storage/openafd.db";
const sqliteBase = sqliteUrl.split("?")[0];
process.env.DATABASE_URL = `${sqliteBase}?connection_limit=1`;

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL,
});

const prismaClientConfig = {
  log: logLevels,
  adapter,
};

const prisma = new PrismaClient(prismaClientConfig);

if (!isPostgres) {
  prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL").catch(() => {});
  prisma.$queryRawUnsafe("PRAGMA busy_timeout=15000").catch(() => {});
}

module.exports = prisma;
module.exports.buildPostgresUrl = buildPostgresUrl;
