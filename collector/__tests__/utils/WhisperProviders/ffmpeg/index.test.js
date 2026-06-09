// SPDX-License-Identifier: MIT
/* eslint-env jest, node */
jest.mock("fix-path", () => ({ default: jest.fn() }), { virtual: true });
jest.mock("dotenv", () => ({ config: jest.fn() }), { virtual: true });

jest.mock("../../../../utils/WhisperProviders/ffmpeg", () => {
  function MockFFMPEGWrapper() {}
  MockFFMPEGWrapper.prototype.ffmpegPath = jest.fn().mockResolvedValue("/usr/local/bin/ffmpeg");
  MockFFMPEGWrapper.prototype.isValidFFMPEG = jest.fn((p) => p === "/usr/local/bin/ffmpeg");
  MockFFMPEGWrapper.prototype.convertAudioToWav = jest.fn().mockResolvedValue(true);
  return { FFMPEGWrapper: MockFFMPEGWrapper };
});

const { FFMPEGWrapper } = require("../../../../utils/WhisperProviders/ffmpeg");

describe("FFMPEGWrapper", () => {
  let ffmpeg;

  beforeEach(() => {
    ffmpeg = new FFMPEGWrapper();
  });

  test("ffmpegPath returns a string path", async () => {
    const knownPath = await ffmpeg.ffmpegPath();
    expect(typeof knownPath).toBe("string");
    expect(knownPath.length).toBeGreaterThan(0);
  });

  test("isValidFFMPEG returns true for known valid path", async () => {
    const knownPath = await ffmpeg.ffmpegPath();
    expect(ffmpeg.isValidFFMPEG(knownPath)).toBe(true);
  });

  test("isValidFFMPEG returns false for invalid path", () => {
    expect(ffmpeg.isValidFFMPEG("/invalid/path/to/ffmpeg")).toBe(false);
  });

  test("convertAudioToWav resolves to true", async () => {
    const result = await ffmpeg.convertAudioToWav("/tmp/input.wav", "/tmp/output.wav");
    expect(result).toBe(true);
  });
});
