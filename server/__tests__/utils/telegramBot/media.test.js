// SPDX-License-Identifier: MIT
/* eslint-env jest */

const {
  getExtensionFromMime,
  downloadTelegramFile,
  photoToAttachment,
} = require("../../../utils/telegramBot/utils/media");

describe("getExtensionFromMime", () => {
  test('maps "audio/ogg" to ".ogg"', () => {
    expect(getExtensionFromMime("audio/ogg")).toBe(".ogg");
  });

  test('maps "audio/mpeg" to ".mp3"', () => {
    expect(getExtensionFromMime("audio/mpeg")).toBe(".mp3");
  });

  test('maps "audio/wav" to ".wav"', () => {
    expect(getExtensionFromMime("audio/wav")).toBe(".wav");
  });

  test('maps "audio/mp4" to ".m4a"', () => {
    expect(getExtensionFromMime("audio/mp4")).toBe(".m4a");
  });

  test('maps "audio/webm" to ".webm"', () => {
    expect(getExtensionFromMime("audio/webm")).toBe(".webm");
  });

  test('maps "audio/flac" to ".flac"', () => {
    expect(getExtensionFromMime("audio/flac")).toBe(".flac");
  });

  test("defaults to .ogg for unknown MIME type", () => {
    expect(getExtensionFromMime("audio/unknown")).toBe(".ogg");
  });

  test("defaults to .ogg for null", () => {
    expect(getExtensionFromMime(null)).toBe(".ogg");
  });

  test("defaults to .ogg for undefined", () => {
    expect(getExtensionFromMime(undefined)).toBe(".ogg");
  });
});

describe("downloadTelegramFile", () => {
  test("downloads and returns buffer on success", async () => {
    const fakeBuffer = Buffer.from("file-content");
    const bot = {
      getFileLink: jest.fn().mockResolvedValue("https://example.com/file.ogg"),
    };
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(fakeBuffer.buffer),
    });

    const result = await downloadTelegramFile(bot, "file123");

    expect(bot.getFileLink).toHaveBeenCalledWith("file123");
    expect(global.fetch).toHaveBeenCalledWith("https://example.com/file.ogg");
    expect(Buffer.isBuffer(result)).toBe(true);

    global.fetch = originalFetch;
  });

  test("throws on non-ok response", async () => {
    const bot = {
      getFileLink: jest.fn().mockResolvedValue("https://example.com/file.ogg"),
    };
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(downloadTelegramFile(bot, "file123")).rejects.toThrow(
      "Failed to download file from Telegram",
    );

    global.fetch = originalFetch;
  });
});

describe("photoToAttachment", () => {
  test("returns correct structure with base64 content", async () => {
    const fakeBuffer = Buffer.from("photo-bytes");
    const bot = {
      getFileLink: jest.fn().mockResolvedValue("https://example.com/photo.jpg"),
    };
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(fakeBuffer.buffer),
    });

    const photos = [{ file_id: "small" }, { file_id: "large" }];
    const result = await photoToAttachment(bot, photos);

    expect(result.name).toBe("telegram-photo.jpg");
    expect(result.mime).toBe("image/jpeg");
    expect(result.contentString).toMatch(/^data:image\/jpeg;base64,/);
    expect(bot.getFileLink).toHaveBeenCalledWith("large");

    global.fetch = originalFetch;
  });
});
