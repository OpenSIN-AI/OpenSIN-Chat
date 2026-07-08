// Jest stub for @prisma/client.
// The real Prisma client requires a generated artefact (.prisma/client)
// that is only produced by `prisma generate`. In unit tests the
// utils/prisma singleton is mocked per-test file; this stub prevents
// the package itself from failing to resolve when loaded transitively.
const { PrismaClient } = jest.createMockFromModule("@prisma/client") ?? {};
module.exports = { PrismaClient: PrismaClient ?? class {} };
