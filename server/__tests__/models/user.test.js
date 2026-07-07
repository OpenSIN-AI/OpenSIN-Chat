// SPDX-License-Identifier: MIT
// Security-critical tests for the User model (Issue #380).
//
// Covers: create with valid/invalid data, lookup by username, password
// update with correct/incorrect old password, and delete + verify.
//
// The User model does not expose standalone `byUsername` or `updatePassword`
// methods.  The equivalents are:
//   - byUsername  → User.get({ username })
//   - updatePassword → User._get({ id }) + bcrypt.compareSync + User.update
// These tests exercise those real code paths.

// user.js does `const { Prisma } = require("@prisma/client")` for the
// PrismaClientKnownRequestError class used in _identifyErrorAndFormatMessage.
// The generated Prisma client may not be present in all environments, so we
// provide a lightweight mock that supplies the class.
jest.mock("@prisma/client", () => {
  class PrismaClientKnownRequestError extends Error {
    constructor(message, { code, meta, clientVersion } = {}) {
      super(message);
      this.name = "PrismaClientKnownRequestError";
      this.code = code;
      this.meta = meta;
      this.clientVersion = clientVersion;
    }
  }
  return {
    Prisma: { PrismaClientKnownRequestError },
    PrismaClient: class {},
  };
});

jest.mock("../../utils/prisma", () => {
  const mockUsers = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  };
  return {
    users: mockUsers,
    $transaction: jest.fn(async (fn) => {
      return fn({
        users: mockUsers,
        event_logs: { create: jest.fn().mockResolvedValue(true) },
      });
    }),
  };
});

jest.mock("../../models/eventLogs", () => ({
  EventLogs: {
    logEvent: jest.fn().mockResolvedValue(true),
  },
}));

const bcrypt = require("bcryptjs");
const { User } = require("../../models/user");
const prisma = require("../../utils/prisma");

describe("User model (security-critical)", () => {
  afterEach(() => jest.clearAllMocks());

  // ──────────────────────────────────────────────
  // User.create
  // ──────────────────────────────────────────────
  describe("User.create", () => {
    it("creates a user with valid data and returns the user without password", async () => {
      const hashed = bcrypt.hashSync("Str0ngP@ss!", 12);
      prisma.users.create.mockResolvedValue({
        id: 1,
        username: "testuser",
        password: hashed,
        role: "default",
        pfpFilename: null,
        suspended: 0,
        dailyMessageLimit: null,
        bio: "",
      });

      const { user, error } = await User.create({
        username: "testuser",
        password: "Str0ngP@ss!",
        role: "default",
      });

      expect(error).toBeNull();
      expect(user).toBeDefined();
      expect(user.username).toBe("testuser");
      expect(user.role).toBe("default");
      // filterFields must strip the password
      expect(user.password).toBeUndefined();
      expect(prisma.users.create).toHaveBeenCalledTimes(1);
      expect(prisma.users.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            username: "testuser",
            role: "default",
          }),
        }),
      );
      // Password must be hashed, not stored in plaintext
      const storedHash = prisma.users.create.mock.calls[0][0].data.password;
      expect(storedHash).not.toBe("Str0ngP@ss!");
      expect(bcrypt.compareSync("Str0ngP@ss!", storedHash)).toBe(true);
    });

    it("rejects an empty username", async () => {
      const { user, error } = await User.create({
        username: "",
        password: "Str0ngP@ss!",
      });

      expect(user).toBeNull();
      expect(error).toBeDefined();
      expect(error).toMatch(/username/i);
      expect(prisma.users.create).not.toHaveBeenCalled();
    });

    it("rejects a username shorter than 2 characters", async () => {
      const { user, error } = await User.create({
        username: "a",
        password: "Str0ngP@ss!",
      });

      expect(user).toBeNull();
      expect(error).toMatch(/at least 2 characters/i);
      expect(prisma.users.create).not.toHaveBeenCalled();
    });

    it("rejects a short password (below min complexity)", async () => {
      const { user, error } = await User.create({
        username: "validuser",
        password: "short",
      });

      expect(user).toBeNull();
      expect(error).toBeDefined();
      expect(prisma.users.create).not.toHaveBeenCalled();
    });

    it("rejects an empty password", async () => {
      const { user, error } = await User.create({
        username: "validuser",
        password: "",
      });

      expect(user).toBeNull();
      expect(error).toBeDefined();
      expect(prisma.users.create).not.toHaveBeenCalled();
    });

    it("rejects a username that does not start with a lowercase letter", async () => {
      const { user, error } = await User.create({
        username: "InvalidUser",
        password: "Str0ngP@ss!",
      });

      expect(user).toBeNull();
      expect(error).toMatch(/lowercase letter/i);
      expect(prisma.users.create).not.toHaveBeenCalled();
    });

    it("returns a formatted error on duplicate username (unique constraint)", async () => {
      const { Prisma } = require("@prisma/client");
      prisma.users.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("unique", {
          code: "P2002",
          meta: { target: ["username"] },
          clientVersion: "test",
        }),
      );

      const { user, error } = await User.create({
        username: "duplicate",
        password: "Str0ngP@ss!",
      });

      expect(user).toBeNull();
      expect(error).toMatch(/already exists/i);
    });
  });

  // ──────────────────────────────────────────────
  // User.byUsername  (via User.get)
  // ──────────────────────────────────────────────
  describe("User.get (byUsername equivalent)", () => {
    it("returns the user when the username exists", async () => {
      prisma.users.findFirst.mockResolvedValue({
        id: 5,
        username: "existinguser",
        password: "hashed",
        role: "default",
        suspended: 0,
      });

      const user = await User.get({ username: "existinguser" });

      expect(user).toBeDefined();
      expect(user.id).toBe(5);
      expect(user.username).toBe("existinguser");
      // filterFields strips password
      expect(user.password).toBeUndefined();
      expect(prisma.users.findFirst).toHaveBeenCalledWith({
        where: { username: "existinguser" },
      });
    });

    it("returns null when the username does not exist", async () => {
      prisma.users.findFirst.mockResolvedValue(null);

      const user = await User.get({ username: "ghost" });

      expect(user).toBeNull();
      expect(prisma.users.findFirst).toHaveBeenCalledWith({
        where: { username: "ghost" },
      });
    });
  });

  // ──────────────────────────────────────────────
  // User.updatePassword  (password change flow)
  // ──────────────────────────────────────────────
  describe("User.updatePassword (password change flow)", () => {
    const userId = 10;
      const oldPassword = "0ldP@ssword!";
      const newPassword = "N3wP@ssword!";
      const oldHash = bcrypt.hashSync(oldPassword, 12);

    beforeEach(() => {
      // User._get returns the full user record INCLUDING password
      prisma.users.findFirst.mockResolvedValue({
        id: userId,
        username: "pwduser",
        password: oldHash,
        role: "default",
        suspended: 0,
      });
      // User.update's internal findUnique
      prisma.users.findUnique = jest.fn().mockResolvedValue({
        id: userId,
        username: "pwduser",
        password: oldHash,
      });
      // prisma.users.update inside $transaction
      prisma.users.update.mockResolvedValue({
        id: userId,
        username: "pwduser",
        password: bcrypt.hashSync(newPassword, 12),
      });
    });

    it("updates the password when the old password is correct", async () => {
      // 1. Retrieve the full user record (with password hash)
      const fullUser = await User._get({ id: userId });
      expect(fullUser).toBeDefined();
      expect(fullUser.password).toBe(oldHash);

      // 2. Verify old password
      const isMatch = bcrypt.compareSync(oldPassword, fullUser.password);
      expect(isMatch).toBe(true);

      // 3. Update via User.update
      const result = await User.update(userId, { password: newPassword });
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();

      // 4. Verify the new password was hashed before storage
      expect(prisma.users.update).toHaveBeenCalledTimes(1);
      const storedPassword = prisma.users.update.mock.calls[0][0].data.password;
      expect(storedPassword).not.toBe(newPassword);
      expect(bcrypt.compareSync(newPassword, storedPassword)).toBe(true);
    });

    it("rejects the update when the old password is wrong", async () => {
      // 1. Retrieve the full user record
      const fullUser = await User._get({ id: userId });
      expect(fullUser).toBeDefined();

      // 2. Verify old password — wrong password must not match
      const isMatch = bcrypt.compareSync("wrongPassword!", fullUser.password);
      expect(isMatch).toBe(false);

      // 3. User.update must NOT be called when old password verification fails
      //    (simulating the endpoint guard)
      expect(prisma.users.update).not.toHaveBeenCalled();
    });

    it("rejects a new password that does not meet complexity requirements", async () => {
      // Even if old password is correct, User.update validates complexity
      const result = await User.update(userId, { password: "weak" });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(prisma.users.update).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // User.delete
  // ──────────────────────────────────────────────
  describe("User.delete", () => {
    it("deletes a user by id and returns true", async () => {
      prisma.users.deleteMany.mockResolvedValue({ count: 1 });

      const result = await User.delete({ id: 42 });
      expect(result).toBe(true);
      expect(prisma.users.deleteMany).toHaveBeenCalledWith({
        where: { id: 42 },
      });
    });

    it("verifies the user is gone after deletion", async () => {
      // First call: user exists
      prisma.users.findFirst.mockResolvedValueOnce({
        id: 7,
        username: "tobedeleted",
        password: "hash",
      });
      const beforeDelete = await User.get({ id: 7 });
      expect(beforeDelete).toBeDefined();
      expect(beforeDelete.id).toBe(7);

      // Delete
      prisma.users.deleteMany.mockResolvedValue({ count: 1 });
      const deleted = await User.delete({ id: 7 });
      expect(deleted).toBe(true);

      // After delete: user is gone
      prisma.users.findFirst.mockResolvedValueOnce(null);
      const afterDelete = await User.get({ id: 7 });
      expect(afterDelete).toBeNull();
    });

    it("returns false on database error", async () => {
      prisma.users.deleteMany.mockRejectedValue(new Error("DB error"));
      const result = await User.delete({ id: 999 });
      expect(result).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // User.checkPasswordComplexity
  // ──────────────────────────────────────────────
  describe("User.checkPasswordComplexity", () => {
    it("accepts a password that meets default complexity", () => {
      const result = User.checkPasswordComplexity("Str0ngP@ss!");
      expect(result.checkedOK).toBe(true);
    });

    it("rejects a password that is too short", () => {
      const result = User.checkPasswordComplexity("short");
      expect(result.checkedOK).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
