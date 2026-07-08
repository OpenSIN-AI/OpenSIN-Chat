/* global jest */
// Jest stub for @prisma/client.
// The real Prisma client requires a generated artefact (.prisma/client)
// that is only produced by `prisma generate`. In unit tests the
// utils/prisma singleton is mocked per-test file; this stub prevents
// the package itself from failing to resolve when loaded transitively.
//
// The mock PrismaClient constructor returns a Proxy that:
//   - provides $queryRawUnsafe, $executeRawUnsafe, $connect, $disconnect,
//     $transaction (so utils/prisma/index.js doesn't crash at load time)
//   - returns a fresh mock object (with jest.fn CRUD methods) for ANY
//     other property access, so tests that spyOn prisma model methods
//     (e.g. prisma.workspace_threads.findFirst) work without each test
//     file having to declare every model name.
function makeModelMock() {
  return new Proxy(
    {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        // Return a jest.fn for any unknown property (e.g. model relations)
        target[prop] = jest.fn();
        return target[prop];
      },
    },
  );
}

class MockPrismaClient {
  constructor() {
    const instance = this;
    const core = {
      $queryRawUnsafe: jest.fn(() => Promise.resolve([])),
      $executeRawUnsafe: jest.fn(() => Promise.resolve(0)),
      $connect: jest.fn(() => Promise.resolve()),
      $disconnect: jest.fn(() => Promise.resolve()),
      $transaction: jest.fn((fn) =>
        typeof fn === "function" ? fn(instance) : Promise.resolve([]),
      ),
      $on: jest.fn(),
      $use: jest.fn(),
      $extends: jest.fn(() => instance),
    };

    return new Proxy(core, {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop !== "string") return undefined;
        // Return a mock model object for any string property access
        // (e.g. prisma.workspace_threads, prisma.document_sync_queue)
        if (!(prop in target)) {
          target[prop] = makeModelMock();
        }
        return target[prop];
      },
    });
  }
}

module.exports = { PrismaClient: MockPrismaClient };
