// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

const mockConvertAudioToWav = jest.fn(() => Promise.resolve(true));

jest.mock("../../utils/constants", () => ({
  WATCH_DIRECTORY: "/fake/hotdir",
}));

jest.mock("../../utils/files", () => ({
  isWithin: jest.fn(() => true),
  trashFile: jest.fn(),
  normalizePath: jest.fn((p) => p),
}));

jest.mock("../../utils/paths", () => ({
  getStoragePath: jest.fn(() => "/fake/storage"),
}));

jest.mock("../../utils/WhisperProviders/ffmpeg", () => ({
  FFMPEGWrapper: jest.fn(() => ({
    convertAudioToWav: mockConvertAudioToWav,
  })),
}));

jest.mock("dotenv", () => ({
  config: jest.fn(),
}), { virtual: true });

jest.mock("fs/promises", () => ({
  access: jest.fn(),
}));

const { convertAudioToWav } = require("../../convertAudioToWav");
const fs = require("fs/promises");
const { isWithin, trashFile } = require("../../utils/files");

describe("convertAudioToWav", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConvertAudioToWav.mockResolvedValue(true);
  });

  it("returns failure when no filename is provided", async () => {
    const result = await convertAudioToWav("");
    expect(result.success).toBe(false);
    expect(result.reason).toContain("No filename");
    expect(result.wavFilename).toBeNull();
  });

  it("returns failure when filename is null", async () => {
    const result = await convertAudioToWav(null);
    expect(result.success).toBe(false);
  });

  it("returns failure when file is outside the hotdir", async () => {
    isWithin.mockReturnValue(false);
    const result = await convertAudioToWav("escape.mp3");
    expect(result.success).toBe(false);
    expect(result.reason).toContain("outside the hotdir");
  });

  it("returns failure when file does not exist", async () => {
    isWithin.mockReturnValue(true);
    fs.access.mockRejectedValue(new Error("ENOENT"));
    const result = await convertAudioToWav("missing.mp3");
    expect(result.success).toBe(false);
    expect(result.reason).toContain("does not exist");
  });

  it("converts audio and returns the wav filename", async () => {
    isWithin.mockReturnValue(true);
    fs.access.mockResolvedValue(undefined);
    const result = await convertAudioToWav("audio.mp3");
    expect(result.success).toBe(true);
    expect(result.wavFilename).toBe("audio.wav");
  });

  it("trashes the original file even on conversion failure", async () => {
    isWithin.mockReturnValue(true);
    fs.access.mockResolvedValue(undefined);
    mockConvertAudioToWav.mockRejectedValue(new Error("ffmpeg failed"));

    const result = await convertAudioToWav("broken.mp3");
    expect(result.success).toBe(false);
    expect(result.reason).toBe("ffmpeg failed");
    expect(trashFile).toHaveBeenCalled();
  });

  it("trashes the original file on success", async () => {
    isWithin.mockReturnValue(true);
    fs.access.mockResolvedValue(undefined);
    const result = await convertAudioToWav("audio.mp3");
    expect(result.success).toBe(true);
    expect(trashFile).toHaveBeenCalled();
  });
});
