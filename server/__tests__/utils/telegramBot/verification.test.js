// SPDX-License-Identifier: MIT
/* eslint-env jest */

jest.mock("../../../models/externalCommunicationConnector", () => ({
  ExternalCommunicationConnector: {
    updateConfig: jest.fn().mockResolvedValue(),
  },
}));

const {
  MAX_PENDING_PAIRINGS,
  isVerified,
  approveUser,
  denyUser,
  revokeUser,
} = require("../../../utils/telegramBot/utils/verification");
const {
  ExternalCommunicationConnector,
} = require("../../../models/externalCommunicationConnector");

describe("MAX_PENDING_PAIRINGS", () => {
  test("is 10", () => {
    expect(MAX_PENDING_PAIRINGS).toBe(10);
  });
});

describe("isVerified", () => {
  test("returns true for string match", () => {
    expect(isVerified(["123", "456"], "123")).toBe(true);
  });

  test("returns true for object with matching chatId", () => {
    expect(
      isVerified([{ chatId: "123", username: "user1" }, { chatId: "456" }], 123),
    ).toBe(true);
  });

  test("returns false for non-matching chatId", () => {
    expect(isVerified(["123"], "789")).toBe(false);
  });

  test("returns false for object entries with non-matching chatId", () => {
    expect(isVerified([{ chatId: "123" }], "789")).toBe(false);
  });

  test("returns false for null approvedUsers", () => {
    expect(isVerified(null, "123")).toBe(false);
  });

  test("returns false for undefined approvedUsers", () => {
    expect(isVerified(undefined, "123")).toBe(false);
  });

  test("returns false for empty approvedUsers array", () => {
    expect(isVerified([], "123")).toBe(false);
  });

  test("matches numeric chatId against string entries", () => {
    expect(isVerified(["123"], 123)).toBe(true);
  });
});

describe("approveUser", () => {
  let bot;
  let pendingPairings;

  beforeEach(() => {
    bot = { sendMessage: jest.fn().mockResolvedValue() };
    pendingPairings = new Map();
    ExternalCommunicationConnector.updateConfig.mockClear();
  });

  test("adds user to approved list with chatId, username, firstName from pending", async () => {
    pendingPairings.set(123, {
      telegramUsername: "testuser",
      firstName: "Test",
      requestedAt: new Date().toISOString(),
    });
    const config = { approved_users: [] };

    await approveUser(bot, 123, config, pendingPairings);

    expect(config.approved_users).toEqual([
      { chatId: "123", username: "testuser", firstName: "Test" },
    ]);
  });

  test("calls ExternalCommunicationConnector.updateConfig", async () => {
    pendingPairings.set(123, { telegramUsername: "user1", firstName: "User" });
    const config = { approved_users: [] };

    await approveUser(bot, 123, config, pendingPairings);

    expect(ExternalCommunicationConnector.updateConfig).toHaveBeenCalledWith(
      "telegram",
      {
        approved_users: [{ chatId: "123", username: "user1", firstName: "User" }],
      },
    );
  });

  test("removes user from pendingPairings", async () => {
    pendingPairings.set(123, { telegramUsername: "user1", firstName: "User" });
    const config = { approved_users: [] };

    await approveUser(bot, 123, config, pendingPairings);

    expect(pendingPairings.has(123)).toBe(false);
  });

  test("sends approval message via bot", async () => {
    pendingPairings.set(123, { telegramUsername: "user1", firstName: "User" });
    const config = { approved_users: [] };

    await approveUser(bot, 123, config, pendingPairings);

    expect(bot.sendMessage).toHaveBeenCalledWith(
      123,
      "You've been approved! Send a message to start chatting.",
    );
  });

  test("skips adding to approved list if already approved", async () => {
    const config = {
      approved_users: [{ chatId: "123", username: "existing" }],
    };

    await approveUser(bot, 123, config, pendingPairings);

    expect(config.approved_users.length).toBe(1);
    expect(config.approved_users[0].username).toBe("existing");
    expect(ExternalCommunicationConnector.updateConfig).not.toHaveBeenCalled();
  });

  test("still removes from pendingPairings even if already approved", async () => {
    pendingPairings.set(123, { code: "000001" });
    const config = {
      approved_users: [{ chatId: "123", username: "existing" }],
    };

    await approveUser(bot, 123, config, pendingPairings);

    expect(pendingPairings.has(123)).toBe(false);
  });

  test("handles null bot without throwing", async () => {
    pendingPairings.set(123, { telegramUsername: "user1", firstName: "User" });
    const config = { approved_users: [] };

    await expect(approveUser(null, 123, config, pendingPairings)).resolves.not.toThrow();
  });

  test("handles missing pending entry gracefully", async () => {
    const config = { approved_users: [] };

    await approveUser(bot, 123, config, pendingPairings);

    expect(config.approved_users).toEqual([
      { chatId: "123", username: null, firstName: null },
    ]);
  });
});

describe("denyUser", () => {
  let bot;
  let pendingPairings;

  beforeEach(() => {
    bot = { sendMessage: jest.fn().mockResolvedValue() };
    pendingPairings = new Map();
  });

  test("removes user from pendingPairings", async () => {
    pendingPairings.set(123, { code: "000001" });

    await denyUser(bot, 123, pendingPairings);

    expect(pendingPairings.has(123)).toBe(false);
  });

  test("sends denial message via bot", async () => {
    pendingPairings.set(123, { code: "000001" });

    await denyUser(bot, 123, pendingPairings);

    expect(bot.sendMessage).toHaveBeenCalledWith(
      123,
      "Your access request was denied.",
    );
  });

  test("handles null bot without throwing", async () => {
    pendingPairings.set(123, { code: "000001" });

    await expect(denyUser(null, 123, pendingPairings)).resolves.not.toThrow();
    expect(pendingPairings.has(123)).toBe(false);
  });

  test("handles denying non-existent pending entry", async () => {
    await expect(denyUser(bot, 999, pendingPairings)).resolves.not.toThrow();
  });
});

describe("revokeUser", () => {
  beforeEach(() => {
    ExternalCommunicationConnector.updateConfig.mockClear();
  });

  test("removes matching chatId from approved_users (string format)", async () => {
    const config = { approved_users: ["123", "456"] };

    await revokeUser("123", config);

    expect(config.approved_users).toEqual(["456"]);
  });

  test("removes matching chatId from approved_users (object format)", async () => {
    const config = {
      approved_users: [
        { chatId: "123", username: "user1" },
        { chatId: "456", username: "user2" },
      ],
    };

    await revokeUser("123", config);

    expect(config.approved_users).toEqual([
      { chatId: "456", username: "user2" },
    ]);
  });

  test("calls ExternalCommunicationConnector.updateConfig with updated list", async () => {
    const config = { approved_users: [{ chatId: "123" }, { chatId: "456" }] };

    await revokeUser("123", config);

    expect(ExternalCommunicationConnector.updateConfig).toHaveBeenCalledWith(
      "telegram",
      { approved_users: [{ chatId: "456" }] },
    );
  });

  test("leaves approved_users unchanged when chatId not found", async () => {
    const config = { approved_users: [{ chatId: "123" }] };

    await revokeUser("999", config);

    expect(config.approved_users).toEqual([{ chatId: "123" }]);
  });

  test("handles empty approved_users", async () => {
    const config = { approved_users: [] };

    await revokeUser("123", config);

    expect(config.approved_users).toEqual([]);
    expect(ExternalCommunicationConnector.updateConfig).toHaveBeenCalledWith(
      "telegram",
      { approved_users: [] },
    );
  });

  test("handles config without approved_users key", async () => {
    const config = {};

    await revokeUser("123", config);

    expect(config.approved_users).toEqual([]);
  });
});
