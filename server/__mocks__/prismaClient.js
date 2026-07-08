// Jest stub for @prisma/client.
//
// The real Prisma client requires a generated artefact (.prisma/client) that
// is only produced by `prisma generate`. In unit tests the utils/prisma
// singleton is mocked per-test file, but utils/prisma still executes
// `new PrismaClient(...)` and calls `$queryRawUnsafe(...)` at module load
// (to set SQLite PRAGMAs). If those client-level methods are missing the
// whole suite fails to run with "prisma.$queryRawUnsafe is not a function".
//
// This stub therefore provides no-op implementations of every client-level
// (`$`-prefixed) method the codebase uses. Model delegates are created lazily
// via a Proxy so `prisma.<anyModel>.<anyOp>()` resolves to a jest.fn() too.
/* global jest */

function makeModelDelegate() {
  return new Proxy(
    {},
    {
      get: () => jest.fn().mockResolvedValue(null),
    },
  );
}

class PrismaClient {
  constructor() {
    // Client-level raw/query helpers used across models, endpoints and utils.
    this.$queryRawUnsafe = jest.fn().mockResolvedValue([]);
    this.$executeRawUnsafe = jest.fn().mockResolvedValue(0);
    this.$queryRaw = jest.fn().mockResolvedValue([]);
    this.$executeRaw = jest.fn().mockResolvedValue(0);
    this.$transaction = jest
      .fn()
      .mockImplementation(async (arg) =>
        typeof arg === "function" ? arg(this) : Promise.all(arg ?? []),
      );
    this.$connect = jest.fn().mockResolvedValue(undefined);
    this.$disconnect = jest.fn().mockResolvedValue(undefined);
    this.$on = jest.fn();
    this.$use = jest.fn();
    this.$extends = jest.fn().mockReturnValue(this);

    // Any model access (prisma.workspaces, prisma.users, ...) returns a
    // delegate whose CRUD operations are jest.fn()s resolving to null.
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop in target) return Reflect.get(target, prop, receiver);
        if (typeof prop === "string" && !prop.startsWith("$")) {
          const delegate = makeModelDelegate();
          target[prop] = delegate;
          return delegate;
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }
}

module.exports = { PrismaClient, Prisma: { sql: (s) => s } };
