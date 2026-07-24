// SPDX-License-Identifier: MIT
/* eslint-env jest */
// Tests for server/utils/SpeechToText — provider factory + transcribe methods.
// Issue #389
const path = require("path");

const STT_MODULE = "../../../utils/SpeechToText/index";
const OPENAI_STT_MODULE = "../../../utils/SpeechToText/openAi";
const DEEPGRAM_STT_MODULE = "../../../utils/SpeechToText/deepgram";
const GENERIC_STT_MODULE = "../../../utils/SpeechToText/openAiGeneric";

describe("SpeechToText – getSTTProvider factory", () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
  });

  function loadStt(provider) {
    jest.resetModules();
    if (provider === undefined) delete process.env.STT_PROVIDER;
    else process.env.STT_PROVIDER = provider;
    return require(STT_MODULE);
  }

  test("returns OpenAiSTT instance when STT_PROVIDER=openai", () => {
    process.env.OPEN_AI_KEY = "test-key";
    // Mock the openai module before requiring the provider
    jest.mock("openai", () => {
      return {
        OpenAI: jest.fn().mockImplementation(() => ({
          audio: {
            transcriptions: { create: jest.fn() },
          },
        })),
        toFile: jest.fn(),
      };
    });
    const { getSTTProvider } = loadStt("openai");
    const provider = getSTTProvider();
    expect(provider).toBeDefined();
    expect(typeof provider.transcribe).toBe("function");
  });

  test("returns DeepgramSTT instance when STT_PROVIDER=deepgram", () => {
    process.env.STT_DEEPGRAM_API_KEY = "test-key";
    const { getSTTProvider } = loadStt("deepgram");
    const provider = getSTTProvider();
    expect(provider).toBeDefined();
    expect(typeof provider.transcribe).toBe("function");
  });

  test("returns GenericOpenAiSTT instance when STT_PROVIDER=generic-openai", () => {
    process.env.STT_OPEN_AI_COMPATIBLE_ENDPOINT = "http://localhost:8080/v1";
    process.env.STT_OPEN_AI_COMPATIBLE_KEY = "test-key";
    process.env.STT_OPEN_AI_COMPATIBLE_MODEL = "whisper-1";
    jest.mock("openai", () => {
      return {
        OpenAI: jest.fn().mockImplementation(() => ({
          audio: {
            transcriptions: { create: jest.fn() },
          },
        })),
        toFile: jest.fn(),
      };
    });
    // Mock helpers to avoid collector/uuid ESM dependency
    jest.mock("../../../utils/SpeechToText/helpers", () => ({
      convertAudioBufferToWav: jest.fn(async (buf) => buf),
    }));
    const { getSTTProvider } = loadStt("generic-openai");
    const provider = getSTTProvider();
    expect(provider).toBeDefined();
    expect(typeof provider.transcribe).toBe("function");
  });

  test("throws on unknown provider", () => {
    const { getSTTProvider } = loadStt("unknown-provider");
    expect(() => getSTTProvider()).toThrow(
      /is not a server-side provider/,
    );
  });

  test("throws on default (native) provider", () => {
    // "native" is the default fallback but is not a server-side provider
    const { getSTTProvider } = loadStt("native");
    expect(() => getSTTProvider()).toThrow(
      /is not a server-side provider/,
    );
  });

  test("throws when STT_PROVIDER is unset (defaults to 'native')", () => {
    delete process.env.STT_PROVIDER;
    const { getSTTProvider } = loadStt(undefined);
    expect(() => getSTTProvider()).toThrow(
      /is not a server-side provider/,
    );
  });
});

describe("SpeechToText – OpenAiSTT.transcribe", () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
    jest.resetModules();
  });

  function getOpenAiSTT(mockCreate) {
    process.env.OPEN_AI_KEY = "test-key";
    jest.resetModules();
    jest.mock("openai", () => {
      const mockInstance = {
        audio: {
          transcriptions: { create: mockCreate },
        },
      };
      return {
        OpenAI: jest.fn(() => mockInstance),
        toFile: jest.fn(async (buf, name) => ({ buffer: buf, name })),
      };
    });
    const { OpenAiSTT } = require(OPENAI_STT_MODULE);
    return new OpenAiSTT();
  }

  test("returns transcribed text on success", async () => {
    const mockCreate = jest.fn().mockResolvedValue({ text: "Hello world" });
    const stt = getOpenAiSTT(mockCreate);
    const result = await stt.transcribe(Buffer.from("audio"), "test.webm");
    expect(result).toBe("Hello world");
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  test("returns empty string when result.text is undefined", async () => {
    const mockCreate = jest.fn().mockResolvedValue({});
    const stt = getOpenAiSTT(mockCreate);
    const result = await stt.transcribe(Buffer.from("audio"), "test.webm");
    expect(result).toBe("");
  });

  test("throws wrapped error on network/API failure", async () => {
    const mockCreate = jest
      .fn()
      .mockRejectedValue(new Error("Network timeout"));
    const stt = getOpenAiSTT(mockCreate);
    await expect(stt.transcribe(Buffer.from("audio"))).rejects.toThrow(
      /OpenAI transcription failed/,
    );
  });

  test("throws wrapped error on generic exception", async () => {
    const mockCreate = jest.fn().mockRejectedValue("some string error");
    const stt = getOpenAiSTT(mockCreate);
    await expect(stt.transcribe(Buffer.from("audio"))).rejects.toThrow(
      /OpenAI transcription failed/,
    );
  });

  test("uses default filename 'audio.webm' when none provided", async () => {
    const mockCreate = jest.fn().mockResolvedValue({ text: "ok" });
    const stt = getOpenAiSTT(mockCreate);
    await stt.transcribe(Buffer.from("audio"));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "whisper-1" }),
    );
  });

  test("respects STT_OPEN_AI_MODEL env var", async () => {
    process.env.OPEN_AI_KEY = "test-key";
    process.env.STT_OPEN_AI_MODEL = "whisper-large-v3";
    jest.resetModules();
    jest.mock("openai", () => ({
      OpenAI: jest.fn(() => ({
        audio: { transcriptions: { create: jest.fn().mockResolvedValue({ text: "ok" }) } },
      })),
      toFile: jest.fn(async (buf, name) => ({ buffer: buf, name })),
    }));
    const { OpenAiSTT } = require(OPENAI_STT_MODULE);
    const stt = new OpenAiSTT();
    expect(stt.model).toBe("whisper-large-v3");
  });

  test("throws on construction when OPEN_AI_KEY is missing", () => {
    delete process.env.OPEN_AI_KEY;
    jest.resetModules();
    jest.mock("openai", () => ({ OpenAI: jest.fn(), toFile: jest.fn() }));
    const { OpenAiSTT } = require(OPENAI_STT_MODULE);
    expect(() => new OpenAiSTT()).toThrow(/No OpenAI API key was set/);
  });
});

describe("SpeechToText – DeepgramSTT.transcribe", () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
    jest.resetModules();
  });

  function getDeepgramSTT(fetchMock) {
    process.env.STT_DEEPGRAM_API_KEY = "test-key";
    jest.resetModules();
    global.fetch = fetchMock;
    const { DeepgramSTT } = require(DEEPGRAM_STT_MODULE);
    return new DeepgramSTT();
  }

  test("returns transcript on success", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        results: {
          channels: [
            {
              alternatives: [{ transcript: "Hello from Deepgram" }],
            },
          ],
        },
      }),
      text: async () => "",
    };
    const fetchMock = jest.fn().mockResolvedValue(mockResponse);
    const stt = getDeepgramSTT(fetchMock);
    const result = await stt.transcribe(Buffer.from("audio"), "test.webm");
    expect(result).toBe("Hello from Deepgram");
  });

  test("returns empty string when transcript is missing", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ results: { channels: [] } }),
      text: async () => "",
    };
    const fetchMock = jest.fn().mockResolvedValue(mockResponse);
    const stt = getDeepgramSTT(fetchMock);
    const result = await stt.transcribe(Buffer.from("audio"));
    expect(result).toBe("");
  });

  test("throws on non-ok HTTP response", async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      json: async () => ({}),
      text: async () => "Unauthorized",
    };
    const fetchMock = jest.fn().mockResolvedValue(mockResponse);
    const stt = getDeepgramSTT(fetchMock);
    await expect(stt.transcribe(Buffer.from("audio"))).rejects.toThrow(
      /Deepgram transcription failed/,
    );
  });

  test("throws on network error (fetch rejection)", async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error("Network error"));
    const stt = getDeepgramSTT(fetchMock);
    await expect(stt.transcribe(Buffer.from("audio"))).rejects.toThrow(
      /Deepgram transcription failed/,
    );
  });

  test("throws on construction when API key is missing", () => {
    delete process.env.STT_DEEPGRAM_API_KEY;
    jest.resetModules();
    const { DeepgramSTT } = require(DEEPGRAM_STT_MODULE);
    expect(() => new DeepgramSTT()).toThrow(/No Deepgram API key was set/);
  });

  test("respects STT_DEEPGRAM_MODEL env var", () => {
    process.env.STT_DEEPGRAM_API_KEY = "test-key";
    process.env.STT_DEEPGRAM_MODEL = "nova-2";
    jest.resetModules();
    global.fetch = jest.fn();
    const { DeepgramSTT } = require(DEEPGRAM_STT_MODULE);
    const stt = new DeepgramSTT();
    expect(stt.model).toBe("nova-2");
  });

  test("sends correct Content-Type for different file extensions", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        results: { channels: [{ alternatives: [{ transcript: "ok" }] }] },
      }),
      text: async () => "",
    };
    const fetchMock = jest.fn().mockResolvedValue(mockResponse);
    const stt = getDeepgramSTT(fetchMock);

    await stt.transcribe(Buffer.from("audio"), "test.mp3");
    expect(fetchMock.mock.calls[0][1].headers["Content-Type"]).toBe(
      "audio/mpeg",
    );

    await stt.transcribe(Buffer.from("audio"), "test.wav");
    expect(fetchMock.mock.calls[1][1].headers["Content-Type"]).toBe(
      "audio/wav",
    );

    await stt.transcribe(Buffer.from("audio"), "test.ogg");
    expect(fetchMock.mock.calls[2][1].headers["Content-Type"]).toBe(
      "audio/ogg",
    );
  });
});

describe("SpeechToText – GenericOpenAiSTT.transcribe", () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
    jest.resetModules();
  });

  function getGenericSTT(mockCreate) {
    process.env.STT_OPEN_AI_COMPATIBLE_ENDPOINT = "http://localhost:8080/v1";
    process.env.STT_OPEN_AI_COMPATIBLE_KEY = "test-key";
    process.env.STT_OPEN_AI_COMPATIBLE_MODEL = "whisper-1";
    jest.resetModules();
    jest.mock("openai", () => ({
      OpenAI: jest.fn(() => ({
        audio: { transcriptions: { create: mockCreate } },
      })),
      toFile: jest.fn(async (buf, name) => ({ buffer: buf, name })),
    }));
    // Mock helpers to avoid collector/uuid ESM dependency.
    // Must use jest.doMock (not hoisted) so it applies after resetModules.
    jest.doMock("../../../utils/SpeechToText/helpers", () => ({
      convertAudioBufferToWav: jest.fn(async (buf) =>
        Buffer.concat([buf, Buffer.from("wav")]),
      ),
    }));
    const { GenericOpenAiSTT } = require(GENERIC_STT_MODULE);
    return new GenericOpenAiSTT();
  }

  test("returns transcribed text on success (wav input)", async () => {
    const mockCreate = jest.fn().mockResolvedValue({ text: "Hello generic" });
    const stt = getGenericSTT(mockCreate);
    const result = await stt.transcribe(Buffer.from("audio"), "test.wav");
    expect(result).toBe("Hello generic");
  });

  test("converts non-wav audio to wav before sending", async () => {
    const mockCreate = jest.fn().mockResolvedValue({ text: "converted" });
    const stt = getGenericSTT(mockCreate);
    await stt.transcribe(Buffer.from("audio"), "test.webm");
    // The toFile mock should have been called with "audio.wav" filename
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  test("throws wrapped error on API failure", async () => {
    const mockCreate = jest
      .fn()
      .mockRejectedValue(new Error("API connection refused"));
    const stt = getGenericSTT(mockCreate);
    await expect(stt.transcribe(Buffer.from("audio"), "test.wav")).rejects.toThrow(
      /STT transcription failed/,
    );
  });

  test("throws on construction when endpoint is missing", () => {
    delete process.env.STT_OPEN_AI_COMPATIBLE_ENDPOINT;
    process.env.STT_OPEN_AI_COMPATIBLE_KEY = "test-key";
    jest.resetModules();
    jest.mock("openai", () => ({ OpenAI: jest.fn(), toFile: jest.fn() }));
    const { GenericOpenAiSTT } = require(GENERIC_STT_MODULE);
    expect(() => new GenericOpenAiSTT()).toThrow(
      /No OpenAI compatible endpoint was set/,
    );
  });
});
