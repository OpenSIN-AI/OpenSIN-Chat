// SPDX-License-Identifier: MIT
const consoleLogger = require("../../../utils/logger/console.js");

const { Document } = require("../../../models/documents");
const { Telemetry } = require("../../../models/telemetry");
const { Workspace } = require("../../../models/workspace");
const { getEmbeddingEngineSelection } = require("../../../utils/helpers");
const { reqBody } = require("../../../utils/http");
const { validApiKey } = require("../../../utils/middleware/validApiKey");
const { EventLogs } = require("../../../models/eventLogs");
const {
  OpenAICompatibleChat,
} = require("../../../utils/chats/openaiCompatible");
const { getModelTag } = require("../../utils");
const {
  extractTextContent,
  extractAttachments,
  openAIError,
} = require("./helpers");
const {
  simpleRateLimit,
} = require("../../../utils/middleware/simpleRateLimit");
const { startSSEHeartbeat } = require("../../../utils/helpers/sse");

function apiKeyQuota(request, _response, next) {
  const auth = request.header("Authorization");
  const bearer = auth ? auth.split(" ")[1] : "anon";
  return simpleRateLimit({
    bucket: `api-key:${bearer}`,
    max: 100,
    windowMs: 60 * 1000,
  })(request, _response, next);
}

function apiOpenAICompatibleEndpoints(app) {
  if (!app) return;

  app.get(
    "/v1/openai/models",
    [validApiKey, apiKeyQuota],
    async (_, response) => {
      /*
    #swagger.tags = ['OpenAI Compatible Endpoints']
    #swagger.description = 'Get all available "models" which are workspaces you can use for chatting.'
    #swagger.responses[200] = {
      content: {
        "application/json": {
          "schema": {
            "type": "object",
            "example": {
              "object": "list",
              "data": [
                {
                  "id": "model-id-0",
                  "object": "model",
                  "created": 1686935002,
                  "owned_by": "organization-owner"
                },
                {
                  "id": "model-id-1",
                  "object": "model",
                  "created": 1686935002,
                  "owned_by": "organization-owner"
                }
              ]
            }
          }
        }
      }
    }
    #swagger.responses[403] = {
      schema: {
        "$ref": "#/definitions/InvalidAPIKey"
      }
    }
    */
      try {
        const data = [];
        const workspaces = await Workspace.where();
        for (const workspace of workspaces) {
          data.push({
            id: workspace.slug,
            object: "model",
            created: Math.floor(Number(new Date(workspace.createdAt)) / 1000),
            owned_by: workspace?.chatProvider || process.env.LLM_PROVIDER,
          });
        }
        return response.status(200).json({
          object: "list",
          data,
        });
      } catch (e) {
        consoleLogger.error(e.message, e);
        openAIError(response, 500, "Internal server error", "server_error");
      }
    },
  );

  app.post(
    "/v1/openai/chat/completions",
    [validApiKey, apiKeyQuota],
    async (request, response) => {
      /*
      #swagger.tags = ['OpenAI Compatible Endpoints']
      #swagger.description = 'Execute a chat with a workspace with OpenAI compatibility. Supports streaming as well. Model must be a workspace slug from /models.'
      #swagger.requestBody = {
          description: 'Send a prompt to the workspace with full use of documents as if sending a chat in OpenSIN Chat. Only supports some values of OpenAI API. See example below.',
          required: true,
          content: {
            "application/json": {
              example: {
                messages: [
                {"role":"system", content: "You are a helpful assistant"},
                {"role":"user", content: "What is OpenSIN Chat?"},
                {"role":"assistant", content: "OpenSIN Chat is...."},
                {"role":"user", content: "Follow up question..."}
                ],
                model: "sample-workspace",
                stream: true,
                temperature: 0.7
              }
            }
          }
        }
      #swagger.responses[403] = {
        schema: {
          "$ref": "#/definitions/InvalidAPIKey"
        }
      }
      */
      let stopHeartbeat = null;
      try {
        const {
          model,
          messages = [],
          temperature,
          stream = false,
        } = reqBody(request);
        const workspace = await Workspace.get({ slug: String(model) });
        if (!workspace)
          return openAIError(
            response,
            404,
            `The model \`${model}\` does not exist.`,
            "invalid_request_error",
            "model_not_found",
            "model",
          );

        const userMessage = messages.pop();
        if (!userMessage || userMessage.role !== "user") {
          return openAIError(
            response,
            400,
            "No user prompt found. Must be last element in message array with 'user' role.",
            "invalid_request_error",
            "missing_user_message",
            "messages",
          );
        }

        const systemPrompt =
          messages.find((chat) => chat.role === "system")?.content ?? null;
        const history = messages.filter((chat) => chat.role !== "system");

        if (!stream) {
          const chatResult = await OpenAICompatibleChat.chatSync({
            workspace,
            systemPrompt,
            history,
            prompt: extractTextContent(userMessage.content),
            attachments: extractAttachments(userMessage.content),
            temperature: Number(temperature),
          });

          await Telemetry.sendTelemetry("sent_chat", {
            LLMSelection:
              workspace.chatProvider ?? process.env.LLM_PROVIDER ?? "openai",
            Embedder: process.env.EMBEDDING_ENGINE || "inherit",
            VectorDbSelection: process.env.VECTOR_DB || "lancedb",
            TTSSelection: process.env.TTS_PROVIDER || "native",
            LLMModel: getModelTag(),
          });
          await EventLogs.logEvent("api_sent_chat", {
            workspaceName: workspace?.name,
            chatModel: workspace?.chatModel || "System Default",
          });
          return response.status(200).json(chatResult);
        }

        response.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate",
        );
        response.setHeader("Content-Type", "text/event-stream");
        response.setHeader("Connection", "keep-alive");
        response.flushHeaders();

        stopHeartbeat = startSSEHeartbeat(response);

        await OpenAICompatibleChat.streamChat({
          workspace,
          systemPrompt,
          history,
          prompt: extractTextContent(userMessage.content),
          attachments: extractAttachments(userMessage.content),
          temperature: Number(temperature),
          response,
        });
        stopHeartbeat();
        stopHeartbeat = null;
        await Telemetry.sendTelemetry("sent_chat", {
          LLMSelection:
            workspace.chatProvider ?? process.env.LLM_PROVIDER ?? "openai",
          Embedder: process.env.EMBEDDING_ENGINE || "inherit",
          VectorDbSelection: process.env.VECTOR_DB || "lancedb",
          TTSSelection: process.env.TTS_PROVIDER || "native",
          LLMModel: getModelTag(),
        });
        await EventLogs.logEvent("api_sent_chat", {
          workspaceName: workspace?.name,
          chatModel: workspace?.chatModel || "System Default",
        });
        response.end();
      } catch (e) {
        if (stopHeartbeat) stopHeartbeat();

        consoleLogger.error(e.message, e);
        openAIError(response, 500, "Internal server error", "server_error");
      }
    },
  );

  app.post(
    "/v1/openai/embeddings",
    [validApiKey, apiKeyQuota],
    async (request, response) => {
      /*
      #swagger.tags = ['OpenAI Compatible Endpoints']
      #swagger.description = 'Get the embeddings of any arbitrary text string. This will use the embedder provider set in the system. Please ensure the token length of each string fits within the context of your embedder model.'
      #swagger.requestBody = {
          description: 'The input string(s) to be embedded. If the text is too long for the embedder model context, it will fail to embed. The vector and associated chunk metadata will be returned in the array order provided',
          required: true,
          content: {
            "application/json": {
              example: {
                input: [
                "This is my first string to embed",
                "This is my second string to embed",
                ],
                model: null,
              }
            }
          }
        }
      #swagger.responses[403] = {
        schema: {
          "$ref": "#/definitions/InvalidAPIKey"
        }
      }
      */
      try {
        const body = reqBody(request);
        // Support input or "inputs" (for backwards compatibility) as an array of strings or a single string
        let input = body?.input || body?.inputs || [];
        // if input is not an array, make it an array and force to string content
        if (!Array.isArray(input)) input = [String(input)];

        if (Array.isArray(input)) {
          if (input.length === 0)
            return openAIError(
              response,
              400,
              "Input array cannot be empty.",
              "invalid_request_error",
              "empty_input",
              "input",
            );
          const validArray = input.every((text) => typeof text === "string");
          if (!validArray)
            return openAIError(
              response,
              400,
              "All inputs to be embedded must be strings.",
              "invalid_request_error",
              "invalid_input_type",
              "input",
            );
        }

        const Embedder = getEmbeddingEngineSelection();
        const embeddings = await Embedder.embedChunks(input);
        const data = [];
        embeddings.forEach((embedding, index) => {
          data.push({
            object: "embedding",
            embedding,
            index,
          });
        });

        return response.status(200).json({
          object: "list",
          data,
          model: Embedder.model,
        });
      } catch (e) {
        consoleLogger.error(e.message, e);
        openAIError(
          response,
          500,
          e.message || "Internal server error",
          "server_error",
        );
      }
    },
  );

  app.get(
    "/v1/openai/vector_stores",
    [validApiKey, apiKeyQuota],
    async (request, response) => {
      /*
      #swagger.tags = ['OpenAI Compatible Endpoints']
      #swagger.description = 'List all the vector database collections connected to OpenSIN Chat. These are essentially workspaces but return their unique vector db identifier - this is the same as the workspace slug.'
      #swagger.responses[200] = {
        content: {
          "application/json": {
            "schema": {
              "type": "object",
              "example": {
                "data": [
                  {
                    "id": "slug-here",
                    "object": "vector_store",
                    "name": "My workspace",
                    "file_counts": {
                      "total": 3
                    },
                    "provider": "LanceDB"
                  }
                ]
              }
            }
          }
        }
      }
      #swagger.responses[403] = {
        schema: {
          "$ref": "#/definitions/InvalidAPIKey"
        }
      }
      */
      try {
        // We dump all in the first response and despite saying there is
        // not more data the library still checks with a query param so if
        // we detect one - respond with nothing.
        if (Object.keys(request?.query ?? {}).length !== 0) {
          return response.status(200).json({
            data: [],
            has_more: false,
          });
        }

        const data = [];
        const VectorDBProvider = process.env.VECTOR_DB || "lancedb";
        const workspaces = await Workspace.where();

        for (const workspace of workspaces) {
          data.push({
            id: workspace.slug,
            object: "vector_store",
            name: workspace.name,
            file_counts: {
              total: await Document.count({
                workspaceId: Number(workspace.id),
              }),
            },
            provider: VectorDBProvider,
          });
        }
        return response.status(200).json({
          first_id: data[0]?.id,
          last_id: data[data.length - 1]?.id,
          data,
          has_more: false,
        });
      } catch (e) {
        consoleLogger.error(e.message, e);
        openAIError(response, 500, "Internal server error", "server_error");
      }
    },
  );
}

module.exports = { apiOpenAICompatibleEndpoints };
