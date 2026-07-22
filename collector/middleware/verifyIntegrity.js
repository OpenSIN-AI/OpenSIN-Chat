// SPDX-License-Identifier: MIT
const { CommunicationKey } = require("../utils/comKey");
const RuntimeSettings = require("../utils/runtimeSettings");
const runtimeSettings = new RuntimeSettings();

function verifyPayloadIntegrity(request, response, next) {
  const comKey = new CommunicationKey();
  const DEV_BYPASS_ENABLED =
    process.env.NODE_ENV === "development" &&
    (process.env.OPENSIN_ALLOW_INSECURE_DEV_BYPASS === "true" ||
      process.env.SIN_ALLOW_INSECURE_DEV_BYPASS === "true");
  if (DEV_BYPASS_ENABLED) {
    comKey.log(
      "[verifyIntegrity] Auth bypass enabled — only for local dev. Never enable it in production!",
    );
    runtimeSettings.parseOptionsFromRequest(request);
    next();
    return;
  }

  response.setHeader("Cache-Control", "no-store");
  const signature = request.header("X-Integrity");
  if (typeof signature !== "string" || !signature.trim())
    return response
      .status(401)
      .json({ msg: "Failed integrity signature check." });

  const validSignedPayload = comKey.verify(signature, request.body);
  if (!validSignedPayload)
    return response
      .status(401)
      .json({ msg: "Failed integrity signature check." });

  runtimeSettings.parseOptionsFromRequest(request);
  next();
}

module.exports = {
  verifyPayloadIntegrity,
};
