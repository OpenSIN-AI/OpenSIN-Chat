// SPDX-License-Identifier: MIT
// Tests for webPush endpoints (Issue #382).
//
// Covers: GET /web-push/pubkey, POST /web-push/subscribe,
// POST /web-push/unsubscribe, GET /web-push/subscriptions,
// POST /web-push/send
//
// Uses the mockExpressApp harness to register routes and invoke handlers
// without booting a real HTTP server.

jest.mock("../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_req, _res, next) => next(),
}));
jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

const mockGetPublicKey = jest.fn();
const mockRegisterSubscription = jest.fn();
const mockUnregisterSubscription = jest.fn();
const mockListSubscriptions = jest.fn();
const mockSendNotification = jest.fn();
jest.mock("../../utils/PushNotifications/index.js", () => ({
  pushNotificationService: {
    getPublicKey: (...a) => mockGetPublicKey(...a),
    registerSubscription: (...a) => mockRegisterSubscription(...a),
    unregisterSubscription: (...a) => mockUnregisterSubscription(...a),
    listSubscriptions: (...a) => mockListSubscriptions(...a),
    sendNotification: (...a) => mockSendNotification(...a),
  },
}));

const { webPushEndpoints } = require("../../endpoints/webPush");
const { createMockApp } = require("../helpers/mockExpressApp");

function buildApp() {
  const harness = createMockApp();
  webPushEndpoints(harness.app);
  return harness;
}

describe("webPushEndpoints", () => {
  let app;
  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /web-push/pubkey
  // ─────────────────────────────────────────────────────────────────────────
  describe("GET /web-push/pubkey", () => {
    it("returns the VAPID public key", async () => {
      mockGetPublicKey.mockResolvedValue("BFAKE_PUBLIC_KEY_12345");

      const res = await app.call("get", "/web-push/pubkey");

      expect(res.statusCode).toBe(200);
      expect(res.body.publicKey).toBe("BFAKE_PUBLIC_KEY_12345");
      expect(mockGetPublicKey).toHaveBeenCalledTimes(1);
    });

    it("returns 500 when getPublicKey throws", async () => {
      mockGetPublicKey.mockRejectedValue(new Error("No VAPID keys configured"));

      const res = await app.call("get", "/web-push/pubkey");

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Failed to provide VAPID key");
      expect(res.body.id).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /web-push/subscribe
  // ─────────────────────────────────────────────────────────────────────────
  describe("POST /web-push/subscribe", () => {
    const validBody = {
      endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
      keys: {
        p256dh: "BP256DH_KEY",
        auth: "AUTH_KEY",
      },
    };

    it("registers a subscription successfully", async () => {
      mockRegisterSubscription.mockResolvedValue({ id: 42 });

      const res = await app.call("post", "/web-push/subscribe", {
        body: validBody,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.id).toBe(42);
      expect(mockRegisterSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: validBody.endpoint,
          p256dh: "BP256DH_KEY",
          auth: "AUTH_KEY",
        }),
      );
    });

    it("returns 400 when endpoint is missing", async () => {
      const res = await app.call("post", "/web-push/subscribe", {
        body: { keys: { p256dh: "key", auth: "key" } },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("endpoint");
    });

    it("returns 400 when keys.p256dh is missing", async () => {
      const res = await app.call("post", "/web-push/subscribe", {
        body: {
          endpoint: "https://example.com/push",
          keys: { auth: "AUTH_KEY" },
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("p256dh");
    });

    it("returns 400 when keys.auth is missing", async () => {
      const res = await app.call("post", "/web-push/subscribe", {
        body: {
          endpoint: "https://example.com/push",
          keys: { p256dh: "P256DH_KEY" },
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("auth");
    });

    it("returns 500 when registerSubscription throws", async () => {
      mockRegisterSubscription.mockRejectedValue(new Error("DB error"));

      const res = await app.call("post", "/web-push/subscribe", {
        body: validBody,
      });

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Subscription failed");
      expect(res.body.id).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /web-push/unsubscribe
  // ─────────────────────────────────────────────────────────────────────────
  describe("POST /web-push/unsubscribe", () => {
    it("unregisters a subscription successfully", async () => {
      mockUnregisterSubscription.mockResolvedValue(true);

      const res = await app.call("post", "/web-push/unsubscribe", {
        body: { endpoint: "https://example.com/push/abc" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.removed).toBe(true);
    });

    it("returns 400 when endpoint is missing", async () => {
      const res = await app.call("post", "/web-push/unsubscribe", {
        body: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("endpoint required");
    });

    it("returns 400 when endpoint is not a string", async () => {
      const res = await app.call("post", "/web-push/unsubscribe", {
        body: { endpoint: 12345 },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("endpoint required");
    });

    it("returns 500 when unregisterSubscription throws", async () => {
      mockUnregisterSubscription.mockRejectedValue(new Error("DB error"));

      const res = await app.call("post", "/web-push/unsubscribe", {
        body: { endpoint: "https://example.com/push/abc" },
      });

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Unsubscribe failed");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /web-push/subscriptions
  // ─────────────────────────────────────────────────────────────────────────
  describe("GET /web-push/subscriptions", () => {
    it("returns list of subscriptions", async () => {
      const fakeSubs = [
        { id: 1, endpoint: "https://example.com/push/1" },
        { id: 2, endpoint: "https://example.com/push/2" },
      ];
      mockListSubscriptions.mockResolvedValue(fakeSubs);

      const res = await app.call("get", "/web-push/subscriptions");

      expect(res.statusCode).toBe(200);
      expect(res.body.subscriptions).toEqual(fakeSubs);
    });

    it("returns 500 when listSubscriptions throws", async () => {
      mockListSubscriptions.mockRejectedValue(new Error("DB error"));

      const res = await app.call("get", "/web-push/subscriptions");

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Failed to list subscriptions");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /web-push/send
  // ─────────────────────────────────────────────────────────────────────────
  describe("POST /web-push/send", () => {
    it("sends a notification successfully", async () => {
      mockSendNotification.mockResolvedValue({ success: true, sent: 5 });

      const res = await app.call("post", "/web-push/send", {
        body: {
          title: "Test Notification",
          body: "Hello World",
          url: "https://example.com",
          to: "primary",
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "primary",
          payload: expect.objectContaining({
            title: "Test Notification",
            body: "Hello World",
          }),
        }),
      );
    });

    it("returns 400 when title is missing", async () => {
      const res = await app.call("post", "/web-push/send", {
        body: { body: "Hello World" },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("title required");
    });

    it("defaults to 'primary' recipient when 'to' is not specified", async () => {
      mockSendNotification.mockResolvedValue({ success: true });

      await app.call("post", "/web-push/send", {
        body: { title: "Notification" },
      });

      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({ to: "primary" }),
      );
    });

    it("returns 500 when sendNotification throws", async () => {
      mockSendNotification.mockRejectedValue(new Error("Push service down"));

      const res = await app.call("post", "/web-push/send", {
        body: { title: "Test" },
      });

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Send failed");
    });
  });
});
