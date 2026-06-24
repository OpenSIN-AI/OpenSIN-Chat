// SPDX-License-Identifier: MIT
// Purpose: Audio transcription and SQL connection validation endpoints.
// Docs: server/endpoints/system.doc.md
const consoleLogger = require("../../utils/logger/console.js");

const { reqBody } = require("../../utils/http");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../../utils/middleware/multiUserProtected");
const { handleAudioUpload } = require("../../utils/files/multer");

function miscEndpoints(app) {
  if (!app) return;

  app.post(
    "/system/transcribe-audio",
    [validatedRequest, flexUserRoleValid([ROLES.all]), handleAudioUpload],
    async (request, response) => {
      try {
        if (!request.file?.buffer) {
          return response
            .status(400)
            .json({ success: false, error: "No audio file provided." });
        }

        const provider = process.env.STT_PROVIDER || "native";
        if (provider === "native") {
          return response.status(400).json({
            success: false,
            error:
              "Server-side transcription is disabled. Set STT_PROVIDER to a supported provider.",
          });
        }

        const { getSTTProvider } = require("../../utils/SpeechToText");
        const stt = getSTTProvider();
        const text = await stt.transcribe(
          request.file.buffer,
          request.file.originalname || "audio.webm",
        );
        return response.status(200).json({ success: true, text });
      } catch (error) {
        // eslint-disable-next-line no-console
        consoleLogger.error("STT transcription error:", error);
        return response.status(500).json({
          success: false,
          error: "Transcription failed.",
        });
      }
    },
  );

  app.post(
    "/system/validate-sql-connection",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      const { engine, connectionString } = reqBody(request);
      try {
        if (!engine || !connectionString) {
          return response.status(400).json({
            success: false,
            error: "Both engine and connection details are required.",
          });
        }

        const {
          validateConnection,
        } = require("../../utils/agents/aibitat/plugins/sql-agent/SQLConnectors");
        const result = await validateConnection(engine, { connectionString });

        if (!result.success) {
          return response.status(200).json({
            success: false,
            error: `Unable to connect to ${engine}. Please verify your connection details.`,
          });
        }

        response.status(200).json(result);
      } catch (error) {
        // eslint-disable-next-line no-console
        consoleLogger.error("SQL validation error:", error);
        response.status(500).json({
          success: false,
          error: `Unable to connect to ${engine}. Please verify your connection details.`,
        });
      }
    },
  );
}

module.exports = { miscEndpoints };
