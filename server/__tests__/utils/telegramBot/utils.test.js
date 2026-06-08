// SPDX-License-Identifier: MIT
/* eslint-env jest */

jest.mock("../../../utils/EncryptionManager", () => ({
  EncryptionManager: jest.fn().mockImplementation(() => ({
    encrypt: jest.fn(() => "encrypted_value"),
    decrypt: jest.fn(() => "decrypted_token"),
  })),
}));

jest.mock("../../../utils/telegramBot/utils/format", () => ({
  markdownToTelegram: jest.fn((text) => `<formatted>${text}</formatted>`),
}));

jest.mock("../../../utils/helpers", () => ({
  getBaseLLMProviderModel: jest.fn(() => "default-model"),
}));

const {
  editMessage,
  sendFormattedMessage,
  sendBatchedMessages,
  encryptToken,
  decryptToken,
  resolveWorkspaceProvider,
  upsertMessage,
} = require("../../../utils/telegramBot/utils/index");

const mockMarkdownToTelegram = require("../../../utils/telegramBot/utils/format").markdownToTelegram;

function createMockBot() {
  return {
    editMessageText: jest.fn(() => Promise.resolve(true)),
    sendMessage: jest.fn(() => Promise.resolve({ message_id: 1 })),
  };
}

describe("editMessage", () => {
  let bot;
  beforeEach(() => { bot = createMockBot(); mockMarkdownToTelegram.mockClear(); });

  test("returns early if no text", async () => {
    await editMessage(bot, 123, 456, "", jest.fn());
    expect(bot.editMessageText).not.toHaveBeenCalled();
  });

  test("returns early if no bot", async () => {
    await editMessage(null, 123, 456, "hello", jest.fn());
  });

  test("truncates text over 4096 chars", async () => {
    await editMessage(bot, 123, 456, "a".repeat(4100), jest.fn());
    const text = bot.editMessageText.mock.calls[0][0];
    expect(text.length).toBeLessThanOrEqual(4096);
    expect(text.endsWith("\n...")).toBe(true);
  });

  test("does not truncate short text", async () => {
    await editMessage(bot, 123, 456, "hello", jest.fn());
    expect(bot.editMessageText.mock.calls[0][0]).toBe("hello");
  });

  test("formats markdown when format=true", async () => {
    await editMessage(bot, 123, 456, "hello", jest.fn(), { format: true });
    expect(mockMarkdownToTelegram).toHaveBeenCalledWith("hello");
    expect(bot.editMessageText.mock.calls[0][1].parse_mode).toBe("HTML");
  });

  test("sets HTML parse mode when html=true", async () => {
    await editMessage(bot, 123, 456, "<b>hi</b>", jest.fn(), { html: true });
    expect(bot.editMessageText.mock.calls[0][1].parse_mode).toBe("HTML");
  });

  test("retries without formatting on parse error", async () => {
    bot.editMessageText
      .mockRejectedValueOnce(new Error("can't parse"))
      .mockResolvedValueOnce(true);
    await editMessage(bot, 123, 456, "x", jest.fn(), { format: true });
    expect(bot.editMessageText).toHaveBeenCalledTimes(2);
  });
});

describe("sendFormattedMessage", () => {
  let bot;
  beforeEach(() => { bot = createMockBot(); mockMarkdownToTelegram.mockClear(); });

  test("sends plain text when format=false", async () => {
    await sendFormattedMessage(bot, 123, "hello", { format: false });
    expect(bot.sendMessage).toHaveBeenCalledWith(123, "hello");
  });

  test("formats markdown by default", async () => {
    await sendFormattedMessage(bot, 123, "hello");
    expect(mockMarkdownToTelegram).toHaveBeenCalled();
  });

  test("falls back to plain on parse error", async () => {
    bot.sendMessage
      .mockRejectedValueOnce(new Error("can't parse"))
      .mockResolvedValueOnce({ message_id: 1 });
    await sendFormattedMessage(bot, 123, "hello", { format: true });
    expect(bot.sendMessage).toHaveBeenCalledTimes(2);
  });

  test("re-throws non-parse errors", async () => {
    bot.sendMessage.mockRejectedValueOnce(new Error("rate limit"));
    await expect(sendFormattedMessage(bot, 123, "hello", { format: true })).rejects.toThrow("rate limit");
  });
});

describe("sendBatchedMessages", () => {
  let bot;
  beforeEach(() => { bot = createMockBot(); });

  test("sends single short message", async () => {
    await sendBatchedMessages(bot, 123, ["hello"]);
    expect(bot.sendMessage).toHaveBeenCalledTimes(1);
  });

  test("joins blocks with separator", async () => {
    await sendBatchedMessages(bot, 123, ["a", "b"]);
    expect(bot.sendMessage.mock.calls[0][1]).toBe("a\n\nb");
  });

  test("splits long messages", async () => {
    await sendBatchedMessages(bot, 123, ["a".repeat(3000), "b".repeat(2000)]);
    expect(bot.sendMessage).toHaveBeenCalledTimes(2);
  });

  test("handles empty blocks", async () => {
    await sendBatchedMessages(bot, 123, []);
    expect(bot.sendMessage).not.toHaveBeenCalled();
  });

  test("prepends header", async () => {
    await sendBatchedMessages(bot, 123, ["hello"], { header: "H:" });
    expect(bot.sendMessage.mock.calls[0][1]).toContain("H:");
  });

  test("passes sendOptions", async () => {
    await sendBatchedMessages(bot, 123, ["hello"], { sendOptions: { parse_mode: "HTML" } });
    expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.any(String), { parse_mode: "HTML" });
  });
});

describe("encryptToken", () => {
  test("returns null for null/empty", () => {
    expect(encryptToken(null)).toBeNull();
    expect(encryptToken("")).toBeNull();
  });

  test("returns enc:-prefixed result", () => {
    expect(encryptToken("my-token")).toBe("enc:encrypted_value");
  });
});

describe("decryptToken", () => {
  test("returns null for null/empty", () => {
    expect(decryptToken(null)).toBeNull();
    expect(decryptToken("")).toBeNull();
  });

  test("returns plaintext without enc: prefix", () => {
    expect(decryptToken("plain")).toBe("plain");
  });

  test("decrypts enc: prefixed tokens", () => {
    expect(decryptToken("enc:something")).toBe("decrypted_token");
  });
});

describe("resolveWorkspaceProvider", () => {
  test("prefers agentProvider", () => {
    expect(resolveWorkspaceProvider({ agentProvider: "a", agentModel: "m" })).toEqual({ provider: "a", model: "m" });
  });

  test("falls back to chatProvider", () => {
    expect(resolveWorkspaceProvider({ chatProvider: "b", chatModel: "n" })).toEqual({ provider: "b", model: "n" });
  });

  test("falls back to env", () => {
    const orig = process.env.LLM_PROVIDER;
    process.env.LLM_PROVIDER = "test";
    expect(resolveWorkspaceProvider({}).provider).toBe("test");
    process.env.LLM_PROVIDER = orig;
  });
});

describe("upsertMessage", () => {
  let bot;
  beforeEach(() => { bot = createMockBot(); });

  test("sends new when msgId is null", async () => {
    const id = await upsertMessage(bot, 123, null, "hello", jest.fn());
    expect(bot.sendMessage).toHaveBeenCalled();
    expect(id).toBe(1);
  });

  test("edits when msgId provided", async () => {
    const id = await upsertMessage(bot, 123, 42, "updated", jest.fn());
    expect(bot.editMessageText).toHaveBeenCalled();
    expect(id).toBe(42);
  });
});
