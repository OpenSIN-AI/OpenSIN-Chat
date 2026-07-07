import { defineConfig } from "prisma/config";

// Prisma 7: the datasource URL is configured here instead of in schema.prisma.
// SQLite is the active provider. The DATABASE_URL env var defaults to
// file:../storage/opensin.db relative to this config file (server/).
const databaseUrl = process.env.DATABASE_URL || "file:../storage/opensin.db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
