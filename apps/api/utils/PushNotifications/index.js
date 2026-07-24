// SPDX-License-Identifier: MIT
// Purpose: Web push subscription service for server-side push delivery.
// Docs: server/utils/PushNotifications/index.js
const consoleLogger = require("../logger/console.js");

const fs = require("node:fs");
const path = require("node:path");
const webpush = require("web-push");
const { getStoragePath, ensureStorageDir } = require("../paths");

const VAPID_FILE = "push-notifications/vapid-keys.json";
const SUBSCRIPTIONS_FILE = "push-notifications/subscriptions.json";

function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJsonSafe(filePath, value) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
    fs.renameSync(tmp, filePath);
  } catch (e) {
    consoleLogger.error(
      `[pushNotificationService] Failed to write ${filePath}:`,
      e.message,
    );
  }
}

function loadOrCreateVapid() {
  const file = getStoragePath(VAPID_FILE);
  const existing = readJsonSafe(file, null);
  if (
    existing &&
    typeof existing.publicKey === "string" &&
    existing.publicKey.length > 0 &&
    typeof existing.privateKey === "string" &&
    existing.privateKey.length > 0
  )
    return existing;

  const generated = webpush.generateVAPIDKeys();
  const v = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
  };
  writeJsonSafe(file, v);
  return v;
}

let _configuredVapid = null;
function ensureVapidConfigured() {
  if (_configuredVapid) return _configuredVapid;
  const v = loadOrCreateVapid();
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@opensin.ai",
    v.publicKey,
    v.privateKey,
  );
  _configuredVapid = v;
  return v;
}

class PushNotificationService {
  constructor() {
    this.subscriptions = null;
  }

  _paths() {
    return {
      vapid: getStoragePath(VAPID_FILE),
      subs: getStoragePath(SUBSCRIPTIONS_FILE),
    };
  }

  _ensureLoaded() {
    if (this.subscriptions) return;
    const { subs } = this._paths();
    ensureStorageDir("push-notifications");
    const data = readJsonSafe(subs, { subscriptions: [] });
    this.subscriptions = Array.isArray(data?.subscriptions)
      ? data.subscriptions
      : [];
  }

  _persist() {
    const { subs } = this._paths();
    writeJsonSafe(subs, { subscriptions: this.subscriptions || [] });
  }

  async loadSubscriptions() {
    this._ensureLoaded();
    return this.subscriptions.length;
  }

  async registerSubscription({ userId = null, endpoint, p256dh, auth } = {}) {
    if (!endpoint || !p256dh || !auth)
      throw new Error("endpoint, p256dh, auth are required");
    this._ensureLoaded();
    const idx = this.subscriptions.findIndex((s) => s.endpoint === endpoint);
    const now = new Date().toISOString();
    const record = {
      id: idx >= 0 ? this.subscriptions[idx].id : this.subscriptions.length + 1,
      userId,
      endpoint,
      p256dh,
      auth,
      createdAt: idx >= 0 ? this.subscriptions[idx].createdAt : now,
      updatedAt: now,
    };
    if (idx >= 0) this.subscriptions[idx] = record;
    else this.subscriptions.push(record);
    this._persist();
    return { id: record.id, endpoint: record.endpoint };
  }

  async unregisterSubscription({ endpoint } = {}) {
    if (!endpoint) return false;
    this._ensureLoaded();
    const before = this.subscriptions.length;
    this.subscriptions = this.subscriptions.filter(
      (s) => s.endpoint !== endpoint,
    );
    this._persist();
    return this.subscriptions.length < before;
  }

  async listSubscriptions({ userId } = {}) {
    this._ensureLoaded();
    if (userId === undefined) return [...this.subscriptions];
    return this.subscriptions.filter((s) => s.userId === userId);
  }

  async getPublicKey() {
    return ensureVapidConfigured().publicKey;
  }

  async sendNotification({ to, payload } = {}) {
    ensureVapidConfigured();
    this._ensureLoaded();
    const subscribers =
      to === "primary"
        ? this.subscriptions
        : this.subscriptions.filter((s) =>
            Array.isArray(to) ? to.includes(s.userId) : true,
          );

    const notification = JSON.stringify({
      title: payload?.title || "OpenSIN-Chat",
      body: payload?.body || "",
      icon: payload?.icon,
      data: payload?.data || {},
    });

    const results = await Promise.all(
      subscribers.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            notification,
          );
          return { endpoint: sub.endpoint, success: true };
        } catch (e) {
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await this.unregisterSubscription({ endpoint: sub.endpoint });
          }
          return {
            endpoint: sub.endpoint,
            success: false,
            error: e?.message || String(e),
          };
        }
      }),
    );

    const delivered = results.filter((r) => r.success).length;
    return { success: delivered > 0, delivered, total: subscribers.length };
  }
}

const pushNotificationService = new PushNotificationService();

module.exports = { pushNotificationService, PushNotificationService };
