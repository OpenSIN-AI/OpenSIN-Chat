// SPDX-License-Identifier: MIT
/* eslint-env jest */
// Tests for server/utils/TextToSpeech — provider factory + ttsBuffer methods.
// Issue #389

const TTS_MODULE = "../../../utils/TextToSpeech/index";
const OPENAI_TTS_MODULE = "../../../utils/TextToSpeech/openAi";
const GENERIC_TTS_MODULE = "../../../utils/TextToSpeech/openAiGeneric";
const KOKORO_TTS_MODULE = "../../../utils/TextToSpeech/kokoro";
const NVIDIA_TTS_MODULE = "../../../utils/TextToSpeech/nvidiaNim";

describe("TextToSpeech – getTTSProvider factory", () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
  });

  function loadTts(provider) {
    jest.resetModules();
    if (provider === undefined) delete process.env.TTS_PROVIDER;
    else process.env.TTS_PROVIDER = provider;
    // Mock openai for all providers that use it
    jest.mock("openai", () => ({
      OpenAI: jest.fn().mockImplementation(() => ({
        audio: { speech: { create: jest.fn() } },
      })),
    }));
    return require(TTS_MODULE);
  }

  test("returns OpenAiTTS instance when TTS_PROVIDER=openai", () => {
    process.env.TTS_OPEN_AI_KEY = "test-key";
    const { getTTSProvider } = loadTts("openai");
    const provider = getTTSProvider();
    expect(provider).toBeDefined();
    expect(typeof provider.ttsBuffer).toBe("function");
  });

  test("returns GenericOpenAiTTS instance when TTS_PROVIDER=generic-openai", () => {
    process.env.TTS_OPEN_AI_COMPATIBLE_ENDPOINT = "http://localhost:8080/v1";
    process.env.TTS_OPEN_AI_COMPATIBLE_KEY = "test-key";
    const { getTTSProvider } = loadTts("generic-openai");
    const provider = getTTSProvider();
    expect(provider).toBeDefined();
    expect(typeof provider.ttsBuffer).toBe("function");
  });

  test("returns KokoroTTS instance when TTS_PROVIDER=kokoro", () => {
    process.env.TTS_KOKORO_ENDPOINT = "http://localhost:8880/v1";
    const { getTTSProvider } = loadTts("kokoro");
    const provider = getTTSProvider();
    expect(provider).toBeDefined();
    expect(typeof provider.ttsBuffer).toBe("function");
  });

  test("returns NvidiaNimTTS instance when TTS_PROVIDER=nvidia-nim", () => {
    process.env.TTS_NVIDIA_NIM_API_KEY = "test-key";
    const { getTTSProvider } = loadTts("nvidia-nim");
    const provider = getTTSProvider();
    expect(provider).toBeDefined();
    expect(typeof provider.ttsBuffer).toBe("function");
  });

  test("throws on unknown provider", () => {
    const { getTTSProvider } = loadTts("unknown-provider");
    expect(() => getTTSProvider()).toThrow(
      /No TTS_PROVIDER value found/,
    );
  });

  test("defaults to 'openai' when TTS_PROVIDER is unset", () => {
    process.env.TTS_OPEN_AI_KEY = "test-key";
    const { getTTSProvider } = loadTts(undefined);
    const provider = getTTSProvider();
    expect(provider).toBeDefined();
    expect(typeof provider.ttsBuffer).toBe("function");
  });
});

describe("TextToSpeech – OpenAiTTS.ttsBuffer", () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
    jest.resetModules();
  });

  function getOpenAiTTS(mockCreate) {
    process.env.TTS_OPEN_AI_KEY = "test-key";
    jest.resetModules();
    jest.mock("openai", () => ({
      OpenAI: jest.fn(() => ({
        audio: { speech: { create: mockCreate } },
      })),
    }));
    const { OpenAiTTS } = require(OPENAI_TTS_MODULE);
    return new OpenAiTTS();
  }

  test("returns a Buffer on success", async () => {
    const mockArrayBuffer = new ArrayBuffer(4);
    const view = new Uint8Array(mockArrayBuffer);
    view[0] = 1; view[1] = 2; view[2] = 3; view[3] = 4;
    const mockCreate = jest.fn().mockResolvedValue({
      arrayBuffer: async () => mockArrayBuffer,
    });
    const tts = getOpenAiTTS(mockCreate);
    const result = await tts.ttsBuffer("Hello world");
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBe(4);
  });

  test("returns null on API error (swallowed by catch)", async () => {
    const mockCreate = jest
      .fn()
      .mockRejectedValue(new Error("API timeout"));
    const tts = getOpenAiTTS(mockCreate);
    const result = await tts.ttsBuffer("Hello world");
    expect(result).toBeNull();
  });

  test("throws on construction when TTS_OPEN_AI_KEY is missing", () => {
    delete process.env.TTS_OPEN_AI_KEY;
    jest.resetModules();
    jest.mock("openai", () => ({ OpenAI: jest.fn() }));
    const { OpenAiTTS } = require(OPENAI_TTS_MODULE);
    expect(() => new OpenAiTTS()).toThrow(/No OpenAI API key was set/);
  });

  test("respects TTS_OPEN_AI_VOICE_MODEL env var", () => {
    process.env.TTS_OPEN_AI_KEY = "test-key";
    process.env.TTS_OPEN_AI_VOICE_MODEL = "echo";
    jest.resetModules();
    jest.mock("openai", () => ({
      OpenAI: jest.fn(() => ({
        audio: { speech: { create: jest.fn() } },
      })),
    }));
    const { OpenAiTTS } = require(OPENAI_TTS_MODULE);
    const tts = new OpenAiTTS();
    expect(tts.voice).toBe("echo");
  });

  test("defaults voice to 'alloy' when no env var set", () => {
    process.env.TTS_OPEN_AI_KEY = "test-key";
    delete process.env.TTS_OPEN_AI_VOICE_MODEL;
    jest.resetModules();
    jest.mock("openai", () => ({
      OpenAI: jest.fn(() => ({
        audio: { speech: { create: jest.fn() } },
      })),
    }));
    const { OpenAiTTS } = require(OPENAI_TTS_MODULE);
    const tts = new OpenAiTTS();
    expect(tts.voice).toBe("alloy");
  });
});

describe("TextToSpeech – GenericOpenAiTTS.ttsBuffer", () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
    jest.resetModules();
  });

  function getGenericTTS(mockCreate) {
    process.env.TTS_OPEN_AI_COMPATIBLE_ENDPOINT = "http://localhost:8080/v1";
    process.env.TTS_OPEN_AI_COMPATIBLE_KEY = "test-key";
    process.env.TTS_OPEN_AI_COMPATIBLE_MODEL = "tts-1";
    process.env.TTS_OPEN_AI_COMPATIBLE_VOICE_MODEL = "alloy";
    jest.resetModules();
    jest.mock("openai", () => ({
      OpenAI: jest.fn(() => ({
        audio: { speech: { create: mockCreate } },
      })),
    }));
    const { GenericOpenAiTTS } = require(GENERIC_TTS_MODULE);
    return new GenericOpenAiTTS();
  }

  test("returns a Buffer on success", async () => {
    const mockArrayBuffer = new ArrayBuffer(2);
    const view = new Uint8Array(mockArrayBuffer);
    view[0] = 0xff; view[1] = 0xfe;
    const mockCreate = jest.fn().mockResolvedValue({
      arrayBuffer: async () => mockArrayBuffer,
    });
    const tts = getGenericTTS(mockCreate);
    const result = await tts.ttsBuffer("Test text");
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBe(2);
  });

  test("returns null on API error", async () => {
    const mockCreate = jest
      .fn()
      .mockRejectedValue(new Error("Connection refused"));
    const tts = getGenericTTS(mockCreate);
    const result = await tts.ttsBuffer("Test text");
    expect(result).toBeNull();
  });

  test("throws on construction when endpoint is missing", () => {
    delete process.env.TTS_OPEN_AI_COMPATIBLE_ENDPOINT;
    process.env.TTS_OPEN_AI_COMPATIBLE_KEY = "test-key";
    jest.resetModules();
    jest.mock("openai", () => ({ OpenAI: jest.fn() }));
    const { GenericOpenAiTTS } = require(GENERIC_TTS_MODULE);
    expect(() => new GenericOpenAiTTS()).toThrow(
      /No OpenAI compatible endpoint was set/,
    );
  });
});

describe("TextToSpeech – KokoroTTS.ttsBuffer", () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
    jest.resetModules();
  });

  function getKokoroTTS(mockCreate) {
    process.env.TTS_KOKORO_ENDPOINT = "http://localhost:8880/v1";
    process.env.TTS_KOKORO_KEY = "test-key";
    jest.resetModules();
    jest.mock("openai", () => ({
      OpenAI: jest.fn(() => ({
        audio: { speech: { create: mockCreate } },
      })),
    }));
    const { KokoroTTS } = require(KOKORO_TTS_MODULE);
    return new KokoroTTS();
  }

  test("returns a Buffer on success", async () => {
    const mockArrayBuffer = new ArrayBuffer(8);
    const mockCreate = jest.fn().mockResolvedValue({
      arrayBuffer: async () => mockArrayBuffer,
    });
    const tts = getKokoroTTS(mockCreate);
    const result = await tts.ttsBuffer("Hello");
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBe(8);
  });

  test("returns null on API error", async () => {
    const mockCreate = jest
      .fn()
      .mockRejectedValue(new Error("Kokoro server down"));
    const tts = getKokoroTTS(mockCreate);
    const result = await tts.ttsBuffer("Hello");
    expect(result).toBeNull();
  });

  test("throws on construction when endpoint is missing", () => {
    delete process.env.TTS_KOKORO_ENDPOINT;
    jest.resetModules();
    jest.mock("openai", () => ({ OpenAI: jest.fn() }));
    const { KokoroTTS } = require(KOKORO_TTS_MODULE);
    expect(() => new KokoroTTS()).toThrow(/No Kokoro endpoint was set/);
  });

  test("defaults voice to 'af_bella'", () => {
    process.env.TTS_KOKORO_ENDPOINT = "http://localhost:8880/v1";
    delete process.env.TTS_KOKORO_VOICE_MODEL;
    jest.resetModules();
    jest.mock("openai", () => ({
      OpenAI: jest.fn(() => ({
        audio: { speech: { create: jest.fn() } },
      })),
    }));
    const { KokoroTTS } = require(KOKORO_TTS_MODULE);
    const tts = new KokoroTTS();
    expect(tts.voice).toBe("af_bella");
  });

  test("appends /v1 to endpoint if missing", () => {
    process.env.TTS_KOKORO_ENDPOINT = "http://localhost:8880";
    jest.resetModules();
    jest.mock("openai", () => ({
      OpenAI: jest.fn(() => ({
        audio: { speech: { create: jest.fn() } },
      })),
    }));
    const { KokoroTTS } = require(KOKORO_TTS_MODULE);
    const tts = new KokoroTTS();
    // The OpenAI client should have been created with a baseURL ending in /v1
    const openai = require("openai");
    expect(openai.OpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "http://localhost:8880/v1",
      }),
    );
  });
});

describe("TextToSpeech – NvidiaNimTTS.ttsBuffer", () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
    jest.resetModules();
  });

  function getNvidiaTTS(mockCreate) {
    process.env.TTS_NVIDIA_NIM_API_KEY = "test-key";
    jest.resetModules();
    jest.mock("openai", () => ({
      OpenAI: jest.fn(() => ({
        audio: { speech: { create: mockCreate } },
      })),
    }));
    const { NvidiaNimTTS } = require(NVIDIA_TTS_MODULE);
    return new NvidiaNimTTS();
  }

  test("returns a Buffer on success", async () => {
    const mockArrayBuffer = new ArrayBuffer(6);
    const mockCreate = jest.fn().mockResolvedValue({
      arrayBuffer: async () => mockArrayBuffer,
    });
    const tts = getNvidiaTTS(mockCreate);
    const result = await tts.ttsBuffer("Hello");
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBe(6);
  });

  test("returns null on API error", async () => {
    const mockCreate = jest
      .fn()
      .mockRejectedValue(new Error("NVIDIA NIM error"));
    const tts = getNvidiaTTS(mockCreate);
    const result = await tts.ttsBuffer("Hello");
    expect(result).toBeNull();
  });

  test("throws on construction when API key is missing", () => {
    delete process.env.TTS_NVIDIA_NIM_API_KEY;
    jest.resetModules();
    jest.mock("openai", () => ({ OpenAI: jest.fn() }));
    const { NvidiaNimTTS } = require(NVIDIA_TTS_MODULE);
    expect(() => new NvidiaNimTTS()).toThrow(/No NVIDIA NIM API key was set/);
  });

  test("uses default model and voice when env vars are unset", () => {
    process.env.TTS_NVIDIA_NIM_API_KEY = "test-key";
    delete process.env.TTS_NVIDIA_NIM_MODEL;
    delete process.env.TTS_NVIDIA_NIM_VOICE_MODEL;
    jest.resetModules();
    jest.mock("openai", () => ({
      OpenAI: jest.fn(() => ({
        audio: { speech: { create: jest.fn() } },
      })),
    }));
    const { NvidiaNimTTS } = require(NVIDIA_TTS_MODULE);
    const tts = new NvidiaNimTTS();
    expect(tts.model).toBe("ai-magnify/arctic-tts");
    expect(tts.voice).toBe("English-US.Female-1");
  });
});
