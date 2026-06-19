// SPDX-License-Identifier: MIT
const { CommunicationKey } = require("../utils/comKey");
const RuntimeSettings = require("../utils/runtimeSettings");
const runtimeSettings = new RuntimeSettings();

function verifyPayloadIntegrity(request, response, next) {
  const comKey = new CommunicationKey();
  const DEV_BYPASS_ENABLED =
    process.env.NODE_ENV === "development" &&
    process.env.SIN_ALLOW_INSECURE_DEV_BYPASS === "true";
  if (DEV_BYPASS_ENABLED) {
    comKey.log(
      "[verifyIntegrity] Auth bypass enabled — only for local dev. NEVER set SIN_ALLOW_INSECURE_DEV_BYPASS in production!"
    );
    runtimeSettings.parseOptionsFromRequest(request);
    next();
    return;
  }

  const signature = request.header("X-Integrity");
  if (!signature)
    return response
      .status(400)
      .json({ msg: "Failed integrity signature check." });

  const validSignedPayload = comKey.verify(signature, request.body);
  if (!validSignedPayload)
    return response
      .status(400)
      .json({ msg: "Failed integrity signature check." });

  runtimeSettings.parseOptionsFromRequest(request);
  next();
}

module.exports = {
  verifyPayloadIntegrity,
};
