// SPDX-License-Identifier: MIT
// Purpose: Unit tests for SpeechToText, TextToSpeech, and PushNotifications (#389)
// Docs: tests/speechTtsPushNotifications.test.js

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks for SpeechToText provider dependencies
// ---------------------------------------------------------------------------

vi.mock("../server/utils/logger/console.js", () => ({
  default: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("../server/utils/paths", () => ({
  getStoragePath: vi.fn((p) => `/tmp/storage/${p}`),
  ensureStorageDir: vi.fn(),
}));

vi.mock("../server/utils/files", () => ({
  hotdirPath: "/tmp/hotdir",
  isWithin: vi.fn(() => true),
}));

vi.mock("../server/utils/collectorApi", () => ({
  CollectorApi: vi.fn().mockImplementation(() => ({
    convertAudioToWav: vi.fn(() =>
      Promise.resolve({ success: true, wavFilename: "converted.wav" }),
    ),
  })),
}));

vi.mock("uuid", () => ({ v4: vi.fn(() => "mock-uuid") }));

vi.mock("fs/promises", () => ({
  default: {
    writeFile: vi.fn(() => Promise.resolve()),
    readFile: vi.fn(() => Promise.resolve(Buffer.from("wav-data"))),
    rm: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("path", () => ({
  default: {
    resolve: vi.fn((...args) => args.join("/")),
  },
}));

vi.mock("node:fs", () => ({
  default: {
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(() => '{"subscriptions":[]}'),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    renameSync: vi.fn(),
  },
}));

vi.mock("node:path", () => ({
  default: {
    dirname: vi.fn(() => "/tmp/storage/push-notifications"),
  },
}));

vi.mock("web-push", () => ({
  default: {
    generateVAPIDKeys: vi.fn(() => ({
      publicKey: "mock-public-key-123",
      privateKey: "mock-private-key-456",
    })),
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(() => Promise.resolve()),
  },
}));

// ---------------------------------------------------------------------------
// SpeechToText
// ---------------------------------------------------------------------------

describe("SpeechToText", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  describe("getSTTProvider", () => {
    it("should throw on unsupported provider", async () => {
      process.env.STT_PROVIDER = "unsupported-provider";
      const { getSTTProvider } = await import("../server/utils/SpeechToText");
      expect(() => getSTTProvider()).toThrow("is not a server-side provider");
    });

    it("should throw on unknown default when STT_PROVIDER is not set", async () => {
      delete process.env.STT_PROVIDER;
      const { getSTTProvider } = await import("../server/utils/SpeechToText");
      expect(() => getSTTProvider()).toThrow("is not a server-side provider");
    });

    it("should return OpenAiSTT instance for openai provider", async () => {
      process.env.STT_PROVIDER = "openai";
      process.env.OPEN_AI_KEY = "sk-test-key";
      const { getSTTProvider } = await import("../server/utils/SpeechToText");
      const provider = getSTTProvider();
      expect(provider).toBeDefined();
      expect(typeof provider.transcribe).toBe("function");
    });

    it("should throw when OpenAI key is missing for openai provider", async () => {
      process.env.STT_PROVIDER = "openai";
      delete process.env.OPEN_AI_KEY;
      const { getSTTProvider } = await import("../server/utils/SpeechToText");
      expect(() => getSTTProvider()).toThrow("No OpenAI API key was set");
    });

    it("should return DeepgramSTT instance for deepgram provider", async () => {
      process.env.STT_PROVIDER = "deepgram";
      // Mock deepgram module before import
      vi.doMock("../server/utils/SpeechToText/deepgram", () => ({
        DeepgramSTT: vi.fn().mockImplementation(() => ({
          transcribe: vi.fn(() => Promise.resolve("text")),
        })),
      }));
      const { getSTTProvider } = await import("../server/utils/SpeechToText");
      const provider = getSTTProvider();
      expect(provider).toBeDefined();
    });

    it("should return GenericOpenAiSTT instance for generic-openai provider", async () => {
      process.env.STT_PROVIDER = "generic-openai";
      process.env.OPEN_AI_KEY = "sk-test-key";
      vi.doMock("../server/utils/SpeechToText/openAiGeneric", () => ({
        GenericOpenAiSTT: vi.fn().mockImplementation(() => ({
          transcribe: vi.fn(() => Promise.resolve("text")),
        })),
      }));
      const { getSTTProvider } = await import("../server/utils/SpeechToText");
      const provider = getSTTProvider();
      expect(provider).toBeDefined();
    });
  });

  describe("OpenAiSTT.transcribe", () => {
    it("should return transcribed text on success", async () => {
      process.env.STT_PROVIDER = "openai";
      process.env.OPEN_AI_KEY = "sk-test-key";

      // Mock the openai module
      vi.doMock("openai", () => ({
        OpenAI: vi.fn().mockImplementation(() => ({
          audio: {
            transcriptions: {
              create: vi.fn(() =>
                Promise.resolve({ text: "Hello world" }),
              ),
            },
          },
        })),
        toFile: vi.fn(() => Promise.resolve({})),
      }));

      const { getSTTProvider } = await import("../server/utils/SpeechToText");
      const provider = getSTTProvider();
      const result = await provider.transcribe(Buffer.from("audio"), "test.webm");
      expect(result).toBe("Hello world");
    });

    it("should throw wrapped error when transcription fails", async () => {
      process.env.STT_PROVIDER = "openai";
      process.env.OPEN_AI_KEY = "sk-test-key";

      vi.doMock("openai", () => ({
        OpenAI: vi.fn().mockImplementation(() => ({
          audio: {
            transcriptions: {
              create: vi.fn(() =>
                Promise.reject(new Error("API rate limit")),
              ),
            },
          },
        })),
        toFile: vi.fn(() => Promise.resolve({})),
      }));

      const { getSTTProvider } = await import("../server/utils/SpeechToText");
      const provider = getSTTProvider();
      await expect(
        provider.transcribe(Buffer.from("audio"), "test.webm"),
      ).rejects.toThrow("OpenAI transcription failed");
    });
  });

  describe("convertAudioBufferToWav", () => {
    it("should convert audio buffer and return WAV buffer", async () => {
      const { convertAudioBufferToWav } = await import("../server/utils/SpeechToText/helpers");
      const result = await convertAudioBufferToWav(Buffer.from("webm-data"), ".webm");
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it("should throw when collector conversion fails", async () => {
      vi.doMock("../server/utils/collectorApi", () => ({
        CollectorApi: vi.fn().mockImplementation(() => ({
          convertAudioToWav: vi.fn(() =>
            Promise.resolve({ success: false, reason: "ffmpeg not found", wavFilename: null }),
          ),
        })),
      }));
      vi.resetModules();
      const { convertAudioBufferToWav } = await import("../server/utils/SpeechToText/helpers");
      await expect(
        convertAudioBufferToWav(Buffer.from("data"), ".webm"),
      ).rejects.toThrow("Audio conversion failed");
    });
  });
});

// ---------------------------------------------------------------------------
// TextToSpeech
// ---------------------------------------------------------------------------

describe("TextToSpeech", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  describe("getTTSProvider", () => {
    it("should throw on unsupported provider", async () => {
      process.env.TTS_PROVIDER = "unsupported";
      const { getTTSProvider } = await import("../server/utils/TextToSpeech");
      expect(() => getTTSProvider()).toThrow("No TTS_PROVIDER value found");
    });

    it("should return OpenAiTTS instance for openai provider", async () => {
      process.env.TTS_PROVIDER = "openai";
      process.env.TTS_OPEN_AI_KEY = "sk-test-key";
      const { getTTSProvider } = await import("../server/utils/TextToSpeech");
      const provider = getTTSProvider();
      expect(provider).toBeDefined();
      expect(typeof provider.ttsBuffer).toBe("function");
    });

    it("should throw when OpenAI TTS key is missing", async () => {
      process.env.TTS_PROVIDER = "openai";
      delete process.env.TTS_OPEN_AI_KEY;
      const { getTTSProvider } = await import("../server/utils/TextToSpeech");
      expect(() => getTTSProvider()).toThrow("No OpenAI API key was set");
    });

    it("should return KokoroTTS instance for kokoro provider", async () => {
      process.env.TTS_PROVIDER = "kokoro";
      process.env.TTS_KOKORO_ENDPOINT = "http://localhost:8880/v1";
      vi.doMock("openai", () => ({
        OpenAI: vi.fn().mockImplementation(() => ({
          audio: { speech: { create: vi.fn(() => Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) })) } },
        })),
      }));
      const { getTTSProvider } = await import("../server/utils/TextToSpeech");
      const provider = getTTSProvider();
      expect(provider).toBeDefined();
      expect(provider.model).toBe("kokoro");
    });

    it("should throw when Kokoro endpoint is missing", async () => {
      process.env.TTS_PROVIDER = "kokoro";
      delete process.env.TTS_KOKORO_ENDPOINT;
      const { getTTSProvider } = await import("../server/utils/TextToSpeech");
      expect(() => getTTSProvider()).toThrow("No Kokoro endpoint was set");
    });

    it("should return GenericOpenAiTTS for generic-openai provider", async () => {
      process.env.TTS_PROVIDER = "generic-openai";
      vi.doMock("../server/utils/TextToSpeech/openAiGeneric", () => ({
        GenericOpenAiTTS: vi.fn().mockImplementation(() => ({
          ttsBuffer: vi.fn(() => Promise.resolve(Buffer.from("audio"))),
        })),
      }));
      const { getTTSProvider } = await import("../server/utils/TextToSpeech");
      const provider = getTTSProvider();
      expect(provider).toBeDefined();
    });

    it("should return NvidiaNimTTS for nvidia-nim provider", async () => {
      process.env.TTS_PROVIDER = "nvidia-nim";
      vi.doMock("../server/utils/TextToSpeech/nvidiaNim", () => ({
        NvidiaNimTTS: vi.fn().mockImplementation(() => ({
          ttsBuffer: vi.fn(() => Promise.resolve(Buffer.from("audio"))),
        })),
      }));
      const { getTTSProvider } = await import("../server/utils/TextToSpeech");
      const provider = getTTSProvider();
      expect(provider).toBeDefined();
    });
  });

  describe("OpenAiTTS.ttsBuffer", () => {
    it("should return a Buffer on success", async () => {
      process.env.TTS_PROVIDER = "openai";
      process.env.TTS_OPEN_AI_KEY = "sk-test-key";

      vi.doMock("openai", () => ({
        OpenAI: vi.fn().mockImplementation(() => ({
          audio: {
            speech: {
              create: vi.fn(() =>
                Promise.resolve({
                  arrayBuffer: () => Promise.resolve(new ArrayBuffer(16)),
                }),
              ),
            },
          },
        })),
      }));

      const { getTTSProvider } = await import("../server/utils/TextToSpeech");
      const provider = getTTSProvider();
      const result = await provider.ttsBuffer("Hello world");
      expect(result).toBeInstanceOf(Buffer);
    });

    it("should return null when TTS API fails", async () => {
      process.env.TTS_PROVIDER = "openai";
      process.env.TTS_OPEN_AI_KEY = "sk-test-key";

      vi.doMock("openai", () => ({
        OpenAI: vi.fn().mockImplementation(() => ({
          audio: {
            speech: {
              create: vi.fn(() => Promise.reject(new Error("API error"))),
            },
          },
        })),
      }));

      const { getTTSProvider } = await import("../server/utils/TextToSpeech");
      const provider = getTTSProvider();
      const result = await provider.ttsBuffer("Hello world");
      expect(result).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// PushNotifications
// ---------------------------------------------------------------------------

describe("PushNotifications", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("PushNotificationService", () => {
    it("should be importable and have expected methods", async () => {
      const { PushNotificationService } = await import("../server/utils/PushNotifications");
      const svc = new PushNotificationService();
      expect(typeof svc.registerSubscription).toBe("function");
      expect(typeof svc.unregisterSubscription).toBe("function");
      expect(typeof svc.listSubscriptions).toBe("function");
      expect(typeof svc.getPublicKey).toBe("function");
      expect(typeof svc.sendNotification).toBe("function");
      expect(typeof svc.loadSubscriptions).toBe("function");
    });

    describe("registerSubscription", () => {
      it("should throw when required fields are missing", async () => {
        const { PushNotificationService } = await import("../server/utils/PushNotifications");
        const svc = new PushNotificationService();
        await expect(svc.registerSubscription({})).rejects.toThrow(
          "endpoint, p256dh, auth are required",
        );
      });

      it("should throw when endpoint is missing", async () => {
        const { PushNotificationService } = await import("../server/utils/PushNotifications");
        const svc = new PushNotificationService();
        await expect(
          svc.registerSubscription({ p256dh: "key", auth: "auth" }),
        ).rejects.toThrow("endpoint, p256dh, auth are required");
      });

      it("should register a new subscription and return id + endpoint", async () => {
        const { PushNotificationService } = await import("../server/utils/PushNotifications");
        const svc = new PushNotificationService();
        svc._ensureLoaded = vi.fn();
        svc._persist = vi.fn();
        svc.subscriptions = [];

        const result = await svc.registerSubscription({
          endpoint: "https://push.example.com/abc",
          p256dh: "p256dh-key",
          auth: "auth-key",
        });

        expect(result.id).toBeDefined();
        expect(result.endpoint).toBe("https://push.example.com/abc");
        expect(svc.subscriptions).toHaveLength(1);
      });

      it("should update existing subscription when endpoint matches", async () => {
        const { PushNotificationService } = await import("../server/utils/PushNotifications");
        const svc = new PushNotificationService();
        svc._ensureLoaded = vi.fn();
        svc._persist = vi.fn();
        svc.subscriptions = [
          {
            id: 1,
            endpoint: "https://push.example.com/abc",
            p256dh: "old-key",
            auth: "old-auth",
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-01-01T00:00:00.000Z",
          },
        ];

        const result = await svc.registerSubscription({
          endpoint: "https://push.example.com/abc",
          p256dh: "new-key",
          auth: "new-auth",
        });

        expect(result.id).toBe(1);
        expect(svc.subscriptions).toHaveLength(1);
        expect(svc.subscriptions[0].p256dh).toBe("new-key");
      });
    });

    describe("unregisterSubscription", () => {
      it("should return false when endpoint is not provided", async () => {
        const { PushNotificationService } = await import("../server/utils/PushNotifications");
        const svc = new PushNotificationService();
        const result = await svc.unregisterSubscription({});
        expect(result).toBe(false);
      });

      it("should return true and remove subscription when endpoint matches", async () => {
        const { PushNotificationService } = await import("../server/utils/PushNotifications");
        const svc = new PushNotificationService();
        svc._ensureLoaded = vi.fn();
        svc._persist = vi.fn();
        svc.subscriptions = [
          { endpoint: "https://push.example.com/abc", p256dh: "k", auth: "a" },
          { endpoint: "https://push.example.com/def", p256dh: "k", auth: "a" },
        ];

        const result = await svc.unregisterSubscription({ endpoint: "https://push.example.com/abc" });
        expect(result).toBe(true);
        expect(svc.subscriptions).toHaveLength(1);
        expect(svc.subscriptions[0].endpoint).toBe("https://push.example.com/def");
      });

      it("should return false when endpoint does not match any subscription", async () => {
        const { PushNotificationService } = await import("../server/utils/PushNotifications");
        const svc = new PushNotificationService();
        svc._ensureLoaded = vi.fn();
        svc._persist = vi.fn();
        svc.subscriptions = [
          { endpoint: "https://push.example.com/abc", p256dh: "k", auth: "a" },
        ];

        const result = await svc.unregisterSubscription({ endpoint: "https://push.example.com/xyz" });
        expect(result).toBe(false);
      });
    });

    describe("listSubscriptions", () => {
      it("should return all subscriptions when no userId filter is provided", async () => {
        const { PushNotificationService } = await import("../server/utils/PushNotifications");
        const svc = new PushNotificationService();
        svc._ensureLoaded = vi.fn();
        svc.subscriptions = [
          { endpoint: "e1", userId: 1 },
          { endpoint: "e2", userId: 2 },
        ];

        const result = await svc.listSubscriptions();
        expect(result).toHaveLength(2);
      });

      it("should filter subscriptions by userId when provided", async () => {
        const { PushNotificationService } = await import("../server/utils/PushNotifications");
        const svc = new PushNotificationService();
        svc._ensureLoaded = vi.fn();
        svc.subscriptions = [
          { endpoint: "e1", userId: 1 },
          { endpoint: "e2", userId: 2 },
          { endpoint: "e3", userId: 1 },
        ];

        const result = await svc.listSubscriptions({ userId: 1 });
        expect(result).toHaveLength(2);
        expect(result.every((s) => s.userId === 1)).toBe(true);
      });
    });

    describe("getPublicKey", () => {
      it("should return a non-empty public key string", async () => {
        const { PushNotificationService } = await import("../server/utils/PushNotifications");
        const svc = new PushNotificationService();
        const key = await svc.getPublicKey();
        expect(typeof key).toBe("string");
        expect(key.length).toBeGreaterThan(0);
      });
    });

    describe("sendNotification", () => {
      it("should deliver notification to all subscribers and return success", async () => {
        const { PushNotificationService } = await import("../server/utils/PushNotifications");
        const svc = new PushNotificationService();
        svc._ensureLoaded = vi.fn();
        svc.subscriptions = [
          { endpoint: "https://push.example.com/1", p256dh: "k1", auth: "a1" },
          { endpoint: "https://push.example.com/2", p256dh: "k2", auth: "a2" },
        ];

        const result = await svc.sendNotification({
          to: "primary",
          payload: { title: "Test", body: "Hello" },
        });

        expect(result.success).toBe(true);
        expect(result.delivered).toBe(2);
        expect(result.total).toBe(2);
      });

      it("should return failure when no subscribers are available", async () => {
        const { PushNotificationService } = await import("../server/utils/PushNotifications");
        const svc = new PushNotificationService();
        svc._ensureLoaded = vi.fn();
        svc.subscriptions = [];

        const result = await svc.sendNotification({
          to: "primary",
          payload: { title: "Test" },
        });

        expect(result.success).toBe(false);
        expect(result.delivered).toBe(0);
        expect(result.total).toBe(0);
      });

      it("should handle send failures and return partial results", async () => {
        const webpush = (await import("web-push")).default;
        webpush.sendNotification
          .mockResolvedValueOnce()
          .mockRejectedValueOnce(Object.assign(new Error("410 Gone"), { statusCode: 410 }));

        const { PushNotificationService } = await import("../server/utils/PushNotifications");
        const svc = new PushNotificationService();
        svc._ensureLoaded = vi.fn();
        svc._persist = vi.fn();
        svc.unregisterSubscription = vi.fn(() => Promise.resolve(true));
        svc.subscriptions = [
          { endpoint: "https://push.example.com/1", p256dh: "k1", auth: "a1" },
          { endpoint: "https://push.example.com/2", p256dh: "k2", auth: "a2" },
        ];

        const result = await svc.sendNotification({
          to: "primary",
          payload: { title: "Test" },
        });

        expect(result.delivered).toBe(1);
        expect(result.total).toBe(2);
      });
    });
  });

  describe("pushNotificationService singleton", () => {
    it("should export a singleton instance", async () => {
      const { pushNotificationService } = await import("../server/utils/PushNotifications");
      expect(pushNotificationService).toBeDefined();
      expect(typeof pushNotificationService.registerSubscription).toBe("function");
    });
  });
});
