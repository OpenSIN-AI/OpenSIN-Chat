// SPDX-License-Identifier: MIT
// Purpose: Shared in-memory SQLite test helper (Issue #374).
// Docs: server/__tests__/helpers/inMemoryDb.doc.md
//
// Provides a single, reusable factory that creates an in-memory better-sqlite3
// database and returns a Prisma-compatible mock object with
// $executeRawUnsafe / $queryRawUnsafe delegates.  All tests that need a real
// SQLite engine (raw SQL execution, datetime arithmetic, FTS5, etc.) should
// import this helper instead of rolling their own jest.mock(".../prisma")
// boilerplate.
//
// Usage:
//   const { createInMemoryDb, closeInMemoryDb } = require("./helpers/inMemoryDb");
//   const db = createInMemoryDb();          // returns { prisma, __db }
//   afterAll(() => closeInMemoryDb(db));     // close to prevent open handles
//
// The helper also installs the mock on the prisma module path so a plain
// `require("../../../utils/prisma")` inside the code-under-test resolves to
// the in-memory DB.

const Database = require("better-sqlite3");

/**
 * Create an in-memory SQLite database and a matching Prisma mock.
 *
 * @param {string} [prismaModulePath="../../../utils/prisma"] — module path
 *   that the code-under-test uses to require prisma.  Override when the test
 *   file lives at a different depth.
 * @returns {{ prisma: object, __db: import("better-sqlite3").Database }}
 *   `prisma` is the mock object with $executeRawUnsafe / $queryRawUnsafe;
 *   `__db` is the raw better-sqlite3 instance for direct SQL access.
 */
function createInMemoryDb(prismaModulePath = "../../../utils/prisma") {
  const db = new Database(":memory:");

  const prisma = {
    __db: db,
    $executeRawUnsafe: async (sql, ...params) =>
      db.prepare(sql).run(...params).changes,
    $queryRawUnsafe: async (sql, ...params) =>
      db.prepare(sql).all(...params),
  };

  // Install the mock on the prisma module so code-under-test that does
  // `require("../../../utils/prisma")` picks up the in-memory instance.
  // jest.mock is hoisted, so we use jest.doMock for runtime installation.
  jest.doMock(prismaModulePath, () => prisma, { virtual: false });

  return { prisma, __db: db };
}

/**
 * Close the in-memory database to release the native handle.
 * Call in afterAll() to prevent Jest "worker failed to exit gracefully"
 * warnings (Issue #373).
 *
 * @param {{ prisma: object, __db: import("better-sqlite3").Database }} db
 */
function closeInMemoryDb(db) {
  if (db?.__db) {
    try {
      db.__db.close();
    } catch {
      // already closed — ignore
    }
  }
}

/**
 * Wipe all rows from the given table names between tests.
 * Safe to call even if a table does not exist yet (lazily created).
 *
 * @param {import("better-sqlite3").Database} db
 * @param {string[]} tables
 */
function clearTables(db, tables) {
  for (const table of tables) {
    try {
      db.prepare(`DELETE FROM ${table}`).run();
    } catch {
      // table not created yet — nothing to clean
    }
  }
}

module.exports = {
  createInMemoryDb,
  closeInMemoryDb,
  clearTables,
};
