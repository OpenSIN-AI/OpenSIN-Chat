// SPDX-License-Identifier: MIT
const {
  editMessage,
  upsertMessage,
  sendBatchedMessages,
  sendFormattedMessage,
  encryptToken,
  decryptToken,
  resolveWorkspaceProvider,
} = require("../../../../utils/telegramBot/utils");

const createMockBot = () => ({
  editMessageText: jest.fn().mockResolvedValue({ message_id: 1 }),
  sendMessage: jest.fn().mockResolvedValue({ message_id: 1 }),
});

describe("telegramBot utils", () => {
  describe("editMessage", () => {
    test("does nothing when text is empty", async () => {
      const bot = createMockBot();
      await editMessage(bot, 123, 456, "", () => {});
      expect(bot.editMessageText).not.toHaveBeenCalled();
    });

    test("does nothing when bot is null", async () => {
      await editMessage(null, 123, 456, "text", () => {});
      // no throw
    });

    test("calls editMessageText with correct params", async () => {
      const bot = createMockBot();
      await editMessage(bot, 123, 456, "Hello", () => {});
      expect(bot.editMessageText).toHaveBeenCalledWith("Hello", {
        chat_id: 123,
        message_id: 456,
        parse_mode: undefined,
        disable_web_page_preview: undefined,
      });
    });

    test("truncates text over 4096 chars", async () => {
      const bot = createMockBot();
      const longText = "a".repeat(5000);
      await editMessage(bot, 123, 456, longText, () => {});
      const callArgs = bot.editMessageText.mock.calls[0][0];
      expect(callArgs.length).toBeLessThanOrEqual(4096);
      expect(callArgs).toContain("...");
    });

    test("uses HTML parse mode when html option is true", async () => {
      const bot = createMockBot();
      await editMessage(bot, 123, 456, "<b>Bold</b>", () => {}, { html: true });
      expect(bot.editMessageText).toHaveBeenCalledWith(
        "<b>Bold</b>",
        expect.objectContaining({ parse_mode: "HTML" })
      );
    });

    test("ignores 'message is not modified' errors", async () => {
      const bot = createMockBot();
      bot.editMessageText.mockRejectedValueOnce(new Error("message is not modified"));
      const log = jest.fn();
      await editMessage(bot, 123, 456, "Hello", log);
      expect(log).not.toHaveBeenCalled();
    });
  });

  describe("sendFormattedMessage", () => {
    test("sends plain text when format is false", async () => {
      const bot = createMockBot();
      await sendFormattedMessage(bot, 123, "Hello", { format: false });
      expect(bot.sendMessage).toHaveBeenCalledWith(123, "Hello");
    });

    test("sends formatted HTML when format is true", async () => {
      const bot = createMockBot();
      await sendFormattedMessage(bot, 123, "**Hello**", { format: true });
      expect(bot.sendMessage).toHaveBeenCalledWith(
        123,
        expect.any(String),
        { parse_mode: "HTML" }
      );
    });

    test("falls back to plain text on HTML parse error", async () => {
      const bot = createMockBot();
      bot.sendMessage.mockRejectedValueOnce(new Error("can't parse"));
      await sendFormattedMessage(bot, 123, "Hello", { format: true });
      // second call should be plain text
      expect(bot.sendMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe("sendBatchedMessages", () => {
    test("sends single message when blocks fit in limit", async () => {
      const bot = createMockBot();
      await sendBatchedMessages(bot, 123, ["a", "b", "c"]);
      expect(bot.sendMessage).toHaveBeenCalledTimes(1);
    });

    test("sends multiple messages when blocks exceed limit", async () => {
      const bot = createMockBot();
      const blocks = Array(10).fill("a".repeat(1000));
      await sendBatchedMessages(bot, 123, blocks);
      expect(bot.sendMessage.mock.calls.length).toBeGreaterThan(1);
    });

    test("does nothing when blocks array is empty", async () => {
      const bot = createMockBot();
      await sendBatchedMessages(bot, 123, []);
      expect(bot.sendMessage).not.toHaveBeenCalled();
    });

    test("includes header in first message", async () => {
      const bot = createMockBot();
      await sendBatchedMessages(bot, 123, ["content"], { header: "Header: " });
      expect(bot.sendMessage).toHaveBeenCalledWith(123, "Header: content", {});
    });

    test("uses custom separator", async () => {
      const bot = createMockBot();
      await sendBatchedMessages(bot, 123, ["a", "b"], { separator: " | " });
      expect(bot.sendMessage).toHaveBeenCalledWith(123, "a | b", {});
    });

    test("passes sendOptions to sendMessage", async () => {
      const bot = createMockBot();
      await sendBatchedMessages(bot, 123, ["a"], { sendOptions: { parse_mode: "HTML" } });
      expect(bot.sendMessage).toHaveBeenCalledWith(
        123,
        "a",
        { parse_mode: "HTML" }
      );
    });
  });

  describe("encryptToken/decryptToken", () => {
    test("encryptToken returns null for empty token", () => {
      expect(encryptToken("")).toBeNull();
      expect(encryptToken(null)).toBeNull();
    });

    test("encryptToken returns string with enc: prefix", () => {
      const encrypted = encryptToken("my-bot-token");
      expect(encrypted).toMatch(/^enc:/);
    });

    test("decryptToken returns null for empty input", () => {
      expect(decryptToken("")).toBeNull();
      expect(decryptToken(null)).toBeNull();
    });

    test("decryptToken returns plaintext for non-prefixed input", () => {
      expect(decryptToken("plain-token")).toBe("plain-token");
    });

    test("encryptToken + decryptToken round-trip", () => {
      const original = "my-bot-token-12345";
      const encrypted = encryptToken(original);
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(original);
    });
  });

  describe("resolveWorkspaceProvider", () => {
    test("uses workspace.agentProvider when set", () => {
      const result = resolveWorkspaceProvider({
        agentProvider: "openai",
        agentModel: "gpt-4",
      });
      expect(result.provider).toBe("openai");
    });

    test("falls back to workspace.chatProvider", () => {
      const result = resolveWorkspaceProvider({
        chatProvider: "anthropic",
        chatModel: "claude-3",
      });
      expect(result.provider).toBe("anthropic");
    });

    test("falls back to env LLM_PROVIDER when workspace has none", () => {
      const oldEnv = process.env.LLM_PROVIDER;
      process.env.LLM_PROVIDER = "groq";
      const result = resolveWorkspaceProvider({});
      expect(result.provider).toBe("groq");
      if (oldEnv) process.env.LLM_PROVIDER = oldEnv;
      else delete process.env.LLM_PROVIDER;
    });
  });

  describe("upsertMessage", () => {
    test("sends new message when msgId is null", async () => {
      const bot = createMockBot();
      const msgId = await upsertMessage(bot, 123, null, "Hello", () => {});
      expect(bot.sendMessage).toHaveBeenCalled();
      expect(msgId).toBe(1);
    });

    test("edits existing message when msgId is provided", async () => {
      const bot = createMockBot();
      const msgId = await upsertMessage(bot, 123, 456, "Hello", () => {});
      expect(bot.editMessageText).toHaveBeenCalled();
      expect(msgId).toBe(456);
    });

    test("uses HTML parse mode when html option is true", async () => {
      const bot = createMockBot();
      await upsertMessage(bot, 123, null, "<b>Hello</b>", () => {}, { html: true });
      expect(bot.sendMessage).toHaveBeenCalledWith(
        123,
        "<b>Hello</b>",
        expect.objectContaining({ parse_mode: "HTML" })
      );
    });
  });
});
