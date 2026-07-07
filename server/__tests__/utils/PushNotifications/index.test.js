// SPDX-License-Identifier: MIT
/* eslint-env jest */
// Tests for server/utils/PushNotifications — subscription management + sendNotification.
// Issue #389

const path = require("path");
const fs = require("fs");

const PUSH_MODULE = "../../../utils/PushNotifications/index";

describe("PushNotifications – PushNotificationService", () => {
  const ORIGINAL_ENV = { ...process.env };
  let tmpDir;
  let mockWebpush;

  beforeEach(() => {
    // Use a temp dir for storage
    tmpDir = fs.mkdtempSync(path.join("/tmp", "push-test-"));
    process.env.STORAGE_DIR = tmpDir;
    jest.resetModules();

    // Mock web-push
    mockWebpush = {
      generateVAPIDKeys: jest.fn(() => ({
        publicKey: "test-public-key-1234567890",
        privateKey: "test-private-key-1234567890",
      })),
      setVapidDetails: jest.fn(),
      sendNotification: jest.fn(),
    };
    jest.doMock("web-push", () => mockWebpush);
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
    jest.resetModules();
    // Cleanup temp dir
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  function loadService() {
    const { pushNotificationService } = require(PUSH_MODULE);
    return pushNotificationService;
  }

  describe("loadSubscriptions", () => {
    test("returns 0 when no subscriptions file exists", async () => {
      const svc = loadService();
      const count = await svc.loadSubscriptions();
      expect(count).toBe(0);
    });

    test("returns count of existing subscriptions", async () => {
      const subsFile = path.join(tmpDir, "push-notifications", "subscriptions.json");
      fs.mkdirSync(path.dirname(subsFile), { recursive: true });
      fs.writeFileSync(
        subsFile,
        JSON.stringify({
          subscriptions: [
            { id: 1, endpoint: "https://example.com/sub/1", p256dh: "key1", auth: "auth1" },
            { id: 2, endpoint: "https://example.com/sub/2", p256dh: "key2", auth: "auth2" },
          ],
        }),
      );
      const svc = loadService();
      const count = await svc.loadSubscriptions();
      expect(count).toBe(2);
    });
  });

  describe("registerSubscription", () => {
    test("registers a new subscription and returns id + endpoint", async () => {
      const svc = loadService();
      const result = await svc.registerSubscription({
        userId: "user-1",
        endpoint: "https://example.com/sub/1",
        p256dh: "p256dh-value",
        auth: "auth-value",
      });
      expect(result).toEqual({
        id: 1,
        endpoint: "https://example.com/sub/1",
      });
    });

    test("updates existing subscription when same endpoint is re-registered", async () => {
      const svc = loadService();
      await svc.registerSubscription({
        userId: "user-1",
        endpoint: "https://example.com/sub/1",
        p256dh: "p256dh-value",
        auth: "auth-value",
      });
      const result = await svc.registerSubscription({
        userId: "user-2",
        endpoint: "https://example.com/sub/1",
        p256dh: "new-p256dh",
        auth: "new-auth",
      });
      expect(result.id).toBe(1);
      const subs = await svc.listSubscriptions();
      expect(subs).toHaveLength(1);
      expect(subs[0].userId).toBe("user-2");
      expect(subs[0].p256dh).toBe("new-p256dh");
    });

    test("throws when endpoint is missing", async () => {
      const svc = loadService();
      await expect(
        svc.registerSubscription({ p256dh: "key", auth: "auth" }),
      ).rejects.toThrow(/endpoint, p256dh, auth are required/);
    });

    test("throws when p256dh is missing", async () => {
      const svc = loadService();
      await expect(
        svc.registerSubscription({ endpoint: "https://example.com/sub/1", auth: "auth" }),
      ).rejects.toThrow(/endpoint, p256dh, auth are required/);
    });

    test("throws when auth is missing", async () => {
      const svc = loadService();
      await expect(
        svc.registerSubscription({ endpoint: "https://example.com/sub/1", p256dh: "key" }),
      ).rejects.toThrow(/endpoint, p256dh, auth are required/);
    });

    test("assigns incremental ids to new subscriptions", async () => {
      const svc = loadService();
      const r1 = await svc.registerSubscription({
        endpoint: "https://example.com/sub/1",
        p256dh: "k1",
        auth: "a1",
      });
      const r2 = await svc.registerSubscription({
        endpoint: "https://example.com/sub/2",
        p256dh: "k2",
        auth: "a2",
      });
      expect(r1.id).toBe(1);
      expect(r2.id).toBe(2);
    });
  });

  describe("unregisterSubscription", () => {
    test("removes a subscription by endpoint and returns true", async () => {
      const svc = loadService();
      await svc.registerSubscription({
        endpoint: "https://example.com/sub/1",
        p256dh: "k1",
        auth: "a1",
      });
      const removed = await svc.unregisterSubscription({
        endpoint: "https://example.com/sub/1",
      });
      expect(removed).toBe(true);
      const subs = await svc.listSubscriptions();
      expect(subs).toHaveLength(0);
    });

    test("returns false when endpoint does not exist", async () => {
      const svc = loadService();
      const removed = await svc.unregisterSubscription({
        endpoint: "https://example.com/nonexistent",
      });
      expect(removed).toBe(false);
    });

    test("returns false when endpoint is not provided", async () => {
      const svc = loadService();
      const removed = await svc.unregisterSubscription({});
      expect(removed).toBe(false);
    });
  });

  describe("listSubscriptions", () => {
    test("returns all subscriptions when no userId filter", async () => {
      const svc = loadService();
      await svc.registerSubscription({
        userId: "user-1",
        endpoint: "https://example.com/sub/1",
        p256dh: "k1",
        auth: "a1",
      });
      await svc.registerSubscription({
        userId: "user-2",
        endpoint: "https://example.com/sub/2",
        p256dh: "k2",
        auth: "a2",
      });
      const subs = await svc.listSubscriptions();
      expect(subs).toHaveLength(2);
    });

    test("filters subscriptions by userId", async () => {
      const svc = loadService();
      await svc.registerSubscription({
        userId: "user-1",
        endpoint: "https://example.com/sub/1",
        p256dh: "k1",
        auth: "a1",
      });
      await svc.registerSubscription({
        userId: "user-2",
        endpoint: "https://example.com/sub/2",
        p256dh: "k2",
        auth: "a2",
      });
      const subs = await svc.listSubscriptions({ userId: "user-1" });
      expect(subs).toHaveLength(1);
      expect(subs[0].userId).toBe("user-1");
    });

    test("returns empty array when no subscriptions exist", async () => {
      const svc = loadService();
      const subs = await svc.listSubscriptions();
      expect(subs).toEqual([]);
    });
  });

  describe("getPublicKey", () => {
    test("returns the VAPID public key", async () => {
      const svc = loadService();
      const key = await svc.getPublicKey();
      expect(key).toBe("test-public-key-1234567890");
      expect(mockWebpush.setVapidDetails).toHaveBeenCalled();
    });

    test("calls setVapidDetails only once (cached)", async () => {
      const svc = loadService();
      await svc.getPublicKey();
      await svc.getPublicKey();
      expect(mockWebpush.setVapidDetails).toHaveBeenCalledTimes(1);
    });
  });

  describe("sendNotification", () => {
    test("sends notification to all subscribers when to='primary'", async () => {
      const svc = loadService();
      await svc.registerSubscription({
        userId: "user-1",
        endpoint: "https://example.com/sub/1",
        p256dh: "k1",
        auth: "a1",
      });
      await svc.registerSubscription({
        userId: "user-2",
        endpoint: "https://example.com/sub/2",
        p256dh: "k2",
        auth: "a2",
      });
      mockWebpush.sendNotification.mockResolvedValue();
      const result = await svc.sendNotification({
        to: "primary",
        payload: { title: "Test", body: "Hello" },
      });
      expect(result.success).toBe(true);
      expect(result.delivered).toBe(2);
      expect(result.total).toBe(2);
      expect(mockWebpush.sendNotification).toHaveBeenCalledTimes(2);
    });

    test("filters subscribers by userId array", async () => {
      const svc = loadService();
      await svc.registerSubscription({
        userId: "user-1",
        endpoint: "https://example.com/sub/1",
        p256dh: "k1",
        auth: "a1",
      });
      await svc.registerSubscription({
        userId: "user-2",
        endpoint: "https://example.com/sub/2",
        p256dh: "k2",
        auth: "a2",
      });
      mockWebpush.sendNotification.mockResolvedValue();
      const result = await svc.sendNotification({
        to: ["user-1"],
        payload: { title: "Test" },
      });
      expect(result.delivered).toBe(1);
      expect(result.total).toBe(1);
      expect(mockWebpush.sendNotification).toHaveBeenCalledTimes(1);
    });

    test("returns success=false when no subscribers", async () => {
      const svc = loadService();
      const result = await svc.sendNotification({
        to: "primary",
        payload: { title: "Test" },
      });
      expect(result.success).toBe(false);
      expect(result.delivered).toBe(0);
      expect(result.total).toBe(0);
    });

    test("handles sendNotification errors gracefully", async () => {
      const svc = loadService();
      await svc.registerSubscription({
        userId: "user-1",
        endpoint: "https://example.com/sub/1",
        p256dh: "k1",
        auth: "a1",
      });
      mockWebpush.sendNotification.mockRejectedValue(new Error("Push failed"));
      const result = await svc.sendNotification({
        to: "primary",
        payload: { title: "Test" },
      });
      expect(result.success).toBe(false);
      expect(result.delivered).toBe(0);
      expect(result.total).toBe(1);
    });

    test("unregisters subscription on 404 status code", async () => {
      const svc = loadService();
      await svc.registerSubscription({
        userId: "user-1",
        endpoint: "https://example.com/sub/1",
        p256dh: "k1",
        auth: "a1",
      });
      const err = new Error("Not Found");
      err.statusCode = 404;
      mockWebpush.sendNotification.mockRejectedValue(err);
      await svc.sendNotification({
        to: "primary",
        payload: { title: "Test" },
      });
      // The subscription should have been removed
      const subs = await svc.listSubscriptions();
      expect(subs).toHaveLength(0);
    });

    test("unregisters subscription on 410 status code", async () => {
      const svc = loadService();
      await svc.registerSubscription({
        userId: "user-1",
        endpoint: "https://example.com/sub/1",
        p256dh: "k1",
        auth: "a1",
      });
      const err = new Error("Gone");
      err.statusCode = 410;
      mockWebpush.sendNotification.mockRejectedValue(err);
      await svc.sendNotification({
        to: "primary",
        payload: { title: "Test" },
      });
      const subs = await svc.listSubscriptions();
      expect(subs).toHaveLength(0);
    });

    test("uses default title when payload title is not provided", async () => {
      const svc = loadService();
      await svc.registerSubscription({
        endpoint: "https://example.com/sub/1",
        p256dh: "k1",
        auth: "a1",
      });
      mockWebpush.sendNotification.mockResolvedValue();
      await svc.sendNotification({
        to: "primary",
        payload: {},
      });
      const notificationArg = mockWebpush.sendNotification.mock.calls[0][1];
      const parsed = JSON.parse(notificationArg);
      expect(parsed.title).toBe("OpenSIN-Chat");
    });

    test("partial delivery: some succeed, some fail", async () => {
      const svc = loadService();
      await svc.registerSubscription({
        endpoint: "https://example.com/sub/1",
        p256dh: "k1",
        auth: "a1",
      });
      await svc.registerSubscription({
        endpoint: "https://example.com/sub/2",
        p256dh: "k2",
        auth: "a2",
      });
      mockWebpush.sendNotification
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error("Failed"));
      const result = await svc.sendNotification({
        to: "primary",
        payload: { title: "Test" },
      });
      expect(result.delivered).toBe(1);
      expect(result.total).toBe(2);
      expect(result.success).toBe(true);
    });
  });

  describe("PushNotificationService class export", () => {
    test("exports a class that can be instantiated", () => {
      const { PushNotificationService } = require(PUSH_MODULE);
      const instance = new PushNotificationService();
      expect(instance).toBeDefined();
      expect(typeof instance.registerSubscription).toBe("function");
      expect(typeof instance.sendNotification).toBe("function");
      expect(typeof instance.listSubscriptions).toBe("function");
      expect(typeof instance.unregisterSubscription).toBe("function");
      expect(typeof instance.getPublicKey).toBe("function");
    });
  });
});
