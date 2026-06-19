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

module.exports = prisma;
module.exports.buildPostgresUrl = buildPostgresUrl;
