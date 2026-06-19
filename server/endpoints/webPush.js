// SPDX-License-Identifier: MIT
const crypto = require("node:crypto");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  pushNotificationService,
} = require("../utils/PushNotifications/index.js");

function webPushEndpoints(app) {
  if (!app) return;

  app.get("/web-push/pubkey", async (_request, response) => {
    try {
      const publicKey = await pushNotificationService.getPublicKey();
      response.status(200).json({ publicKey });
    } catch (e) {
      const id = crypto.randomUUID();
      console.error(`[webPush pubkey FATAL id=${id}]`, e);
      response.status(500).json({ error: "Failed to provide VAPID key", id });
    }
  });

  app.post(
    "/web-push/subscribe",
    [validatedRequest],
    async (request, response) => {
      try {
        const body =
          request.body && typeof request.body === "object" ? request.body : {};
        const { endpoint, keys } = body;
        if (
          !endpoint ||
          !keys ||
          typeof keys.p256dh !== "string" ||
          typeof keys.auth !== "string"
        ) {
          return response
            .status(400)
            .json({ error: "endpoint + keys.p256dh + keys.auth required" });
        }
        const userId = response.locals?.user?.id ?? null;
        const result = await pushNotificationService.registerSubscription({
          userId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        });
        return response.status(201).json({ success: true, id: result.id });
      } catch (e) {
        const id = crypto.randomUUID();
        console.error(`[webPush subscribe FATAL id=${id}]`, e);
        return response
          .status(500)
          .json({ error: "Subscription failed", id });
      }
    },
  );

  app.post(
    "/web-push/unsubscribe",
    [validatedRequest],
    async (request, response) => {
      try {
        const body =
          request.body && typeof request.body === "object" ? request.body : {};
        const { endpoint } = body;
        if (!endpoint || typeof endpoint !== "string") {
          return response
            .status(400)
            .json({ error: "endpoint required" });
        }
        const removed = await pushNotificationService.unregisterSubscription({
          endpoint,
        });
        return response.status(200).json({ success: true, removed });
      } catch (e) {
        const id = crypto.randomUUID();
        console.error(`[webPush unsubscribe FATAL id=${id}]`, e);
        return response
          .status(500)
          .json({ error: "Unsubscribe failed", id });
      }
    },
  );

  app.get(
    "/web-push/subscriptions",
    [validatedRequest],
    async (_request, response) => {
      try {
        const subscriptions = await pushNotificationService.listSubscriptions();
        return response.status(200).json({ subscriptions });
      } catch (e) {
        const id = crypto.randomUUID();
        console.error(`[webPush list FATAL id=${id}]`, e);
        return response
          .status(500)
          .json({ error: "Failed to list subscriptions", id });
      }
    },
  );

  app.post(
    "/web-push/send",
    [validatedRequest],
    async (request, response) => {
      try {
        const body =
          request.body && typeof request.body === "object" ? request.body : {};
        const { title, body: bodyText, url, to } = body;
        if (!title || typeof title !== "string") {
          return response
            .status(400)
            .json({ error: "title required" });
        }
        const result = await pushNotificationService.sendNotification({
          to: to || "primary",
          payload: {
            title,
            body: bodyText || "",
            data: { url: url || "/" },
          },
        });
        return response.status(200).json(result);
      } catch (e) {
        const id = crypto.randomUUID();
        console.error(`[webPush send FATAL id=${id}]`, e);
        return response
          .status(500)
          .json({ error: "Send failed", id });
      }
    },
  );
}

module.exports = { webPushEndpoints };
