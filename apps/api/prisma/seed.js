// SPDX-License-Identifier: MIT
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
// PrismaBetterSqlite3 treats `?` params as part of the filename — strip them.
const sqliteUrl = process.env.DATABASE_URL || "file:../storage/opensin.db";
const adapter = new PrismaBetterSqlite3({
  url: sqliteUrl.split("?")[0],
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const settings = [
    { label: "multi_user_mode", value: "false" },
    { label: "logo_filename", value: "opensin-logo.png" },
  ];

  for (let setting of settings) {
    const existing = await prisma.system_settings.findUnique({
      where: { label: setting.label },
    });

    // Only create the setting if it doesn't already exist
    if (!existing) {
      await prisma.system_settings.create({
        data: setting,
      });
    }
  }
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
