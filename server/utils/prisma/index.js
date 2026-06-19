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

if (process.env.DATABASE_URL?.startsWith("postgresql://")) {
  prismaClientConfig.datasources = {
    db: {
      url:
        process.env.DATABASE_URL +
        (process.env.DATABASE_URL.includes("?") ? "&" : "?") +
        "connection_limit=10&pool_timeout=10",
    },
  };
}

const prisma = new PrismaClient(prismaClientConfig);

module.exports = prisma;
