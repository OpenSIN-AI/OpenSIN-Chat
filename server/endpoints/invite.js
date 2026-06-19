// SPDX-License-Identifier: MIT
const { EventLogs } = require("../models/eventLogs");
const { Invite } = require("../models/invite");
const { User } = require("../models/user");
const { reqBody } = require("../utils/http");
const {
  simpleSSOLoginDisabledMiddleware,
} = require("../utils/middleware/simpleSSOEnabled");
const { simpleRateLimit } = require("../utils/middleware/simpleRateLimit");

function inviteEndpoints(app) {
  if (!app) return;

  app.get(
    "/invite/:code",
    [
      simpleRateLimit({
        bucket: "invite-lookup",
        max: 30,
        windowMs: 60 * 1000,
      }),
    ],
    async (request, response) => {
      try {
        const { code } = request.params;
        const invite = await Invite.get({ code });
        if (!invite) {
          response
            .status(200)
            .json({ invite: null, error: "Invite not found." });
          return;
        }

        if (invite.status !== "pending") {
          response
            .status(200)
            .json({ invite: null, error: "Invite is no longer valid." });
          return;
        }

        if (Invite.isExpired(invite)) {
          response
            .status(200)
            .json({ invite: null, error: "Invite has expired." });
          return;
        }

        response
          .status(200)
          .json({ invite: { code, status: invite.status }, error: null });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        response.sendStatus(500);
      }
    },
  );

  app.post(
    "/invite/:code",
    [
      simpleSSOLoginDisabledMiddleware,
      simpleRateLimit({
        bucket: "invite-accept",
        max: 5,
        windowMs: 15 * 60 * 1000,
      }),
    ],
    async (request, response) => {
      try {
        const { code } = request.params;
        const { username, password } = reqBody(request);
        if (!username || typeof username !== "string" || !username.trim()) {
          response
            .status(200)
            .json({ success: false, error: "Username is required." });
          return;
        }
        if (!password || typeof password !== "string" || !password.trim()) {
          response
            .status(200)
            .json({ success: false, error: "Password is required." });
          return;
        }
        const invite = await Invite.get({ code });
        if (!invite || invite.status !== "pending") {
          response
            .status(200)
            .json({ success: false, error: "Invite not found or is invalid." });
          return;
        }

        if (Invite.isExpired(invite)) {
          response
            .status(200)
            .json({ success: false, error: "Invite has expired." });
          return;
        }

        const { user, error } = await User.create({
          username,
          password,
          role: "default",
        });
        if (!user) {
          // eslint-disable-next-line no-console
          console.error("Accepting invite:", error);
          response.status(200).json({ success: false, error });
          return;
        }

        await Invite.markClaimed(invite.id, user);
        await EventLogs.logEvent(
          "invite_accepted",
          {
            username: user.username,
          },
          user.id,
        );

        response.status(200).json({ success: true, error: null });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        response.sendStatus(500);
      }
    },
  );
}

module.exports = { inviteEndpoints };
