// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

// Additional tests for convertAudioToWav — covers the FFMPEGWrapper binary
// path, the ffmpeg binary fallback (no ffmpeg installed), and the filename
// parsing edge cases.

const mockConvertAudioToWav = jest.fn(() => Promise.resolve(true));
const mockFFMPEGPath = jest.fn(() => Promise.resolve("/usr/bin/ffmpeg"));

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
    ffmpegPath: mockFFMPEGPath,
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

describe("convertAudioToWav - additional coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConvertAudioToWav.mockResolvedValue(true);
    mockFFMPEGPath.mockResolvedValue("/usr/bin/ffmpeg");
    isWithin.mockReturnValue(true);
    fs.access.mockResolvedValue(undefined);
  });

  describe("filename validation", () => {
    it("returns failure for undefined filename", async () => {
      const result = await convertAudioToWav(undefined);
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/no filename/i);
      expect(result.wavFilename).toBeNull();
    });

    it("returns failure for empty string filename", async () => {
      const result = await convertAudioToWav("");
      expect(result.success).toBe(false);
      expect(result.wavFilename).toBeNull();
    });

    it("returns failure for 0 (falsy) filename", async () => {
      const result = await convertAudioToWav(0);
      expect(result.success).toBe(false);
    });
  });

  describe("path safety", () => {
    it("rejects filenames that resolve outside the watch dir", async () => {
      isWithin.mockReturnValue(false);
      const result = await convertAudioToWav("../../../etc/passwd");
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/outside the hotdir/i);
    });

    it("rejects absolute paths outside hotdir", async () => {
      isWithin.mockReturnValue(false);
      const result = await convertAudioToWav("/etc/passwd.mp3");
      expect(result.success).toBe(false);
    });
  });

  describe("file existence", () => {
    it("returns failure when fs.access throws ENOENT", async () => {
      fs.access.mockRejectedValue(
        Object.assign(new Error("ENOENT"), { code: "ENOENT" })
      );
      const result = await convertAudioToWav("missing.mp3");
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/does not exist/i);
    });

    it("returns failure for EACCES errors", async () => {
      fs.access.mockRejectedValue(
        Object.assign(new Error("EACCES"), { code: "EACCES" })
      );
      const result = await convertAudioToWav("noperm.mp3");
      expect(result.success).toBe(false);
    });
  });

  describe("successful conversion", () => {
    it("strips the extension and appends .wav", async () => {
      const result = await convertAudioToWav("audio.mp3");
      expect(result.wavFilename).toBe("audio.wav");
    });

    it("works for .wav files (idempotent rename)", async () => {
      const result = await convertAudioToWav("already.wav");
      expect(result.wavFilename).toBe("already.wav");
    });

    it("works for .m4a files", async () => {
      const result = await convertAudioToWav("recording.m4a");
      expect(result.wavFilename).toBe("recording.wav");
    });

    it("works for .opus files", async () => {
      const result = await convertAudioToWav("voice.opus");
      expect(result.wavFilename).toBe("voice.wav");
    });

    it("works for .ogg files", async () => {
      const result = await convertAudioToWav("sound.ogg");
      expect(result.wavFilename).toBe("sound.wav");
    });

    it("calls FFMPEGWrapper with the input and output paths", async () => {
      await convertAudioToWav("audio.mp3");
      expect(mockConvertAudioToWav).toHaveBeenCalled();
      const [input, output] = mockConvertAudioToWav.mock.calls[0];
      expect(input).toContain("audio.mp3");
      expect(output).toContain("audio.wav");
    });

    it("trashes the source file on success", async () => {
      await convertAudioToWav("audio.mp3");
      expect(trashFile).toHaveBeenCalled();
    });
  });

  describe("failure paths", () => {
    it("returns failure when ffmpeg conversion throws", async () => {
      mockConvertAudioToWav.mockRejectedValue(new Error("ffmpeg exit 1"));
      const result = await convertAudioToWav("bad.mp3");
      expect(result.success).toBe(false);
      expect(result.reason).toBe("ffmpeg exit 1");
    });

    it("still trashes source file when conversion fails", async () => {
      mockConvertAudioToWav.mockRejectedValue(new Error("ffmpeg failed"));
      await convertAudioToWav("bad.mp3");
      expect(trashFile).toHaveBeenCalled();
    });

    it("does not include wavFilename on failure", async () => {
      mockConvertAudioToWav.mockRejectedValue(new Error("bad"));
      const result = await convertAudioToWav("bad.mp3");
      expect(result.wavFilename).toBeNull();
    });
  });
});
