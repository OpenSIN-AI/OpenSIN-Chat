// SPDX-License-Identifier: MIT
// Helpers that convert workspace chats to some supported format
// for external use by the user.

const { WorkspaceChats } = require("../../../models/workspaceChats");
const { EmbedChats } = require("../../../models/embedChats");
const { safeJsonParse } = require("../../http");
const { SystemSettings } = require("../../../models/systemSettings");

async function convertToCSV(preparedData) {
  const headers = new Set(["id", "workspace", "prompt", "response", "sent_at"]);
  preparedData.forEach((item) =>
    Object.keys(item).forEach((key) => headers.add(key)),
  );

  const rows = [Array.from(headers).join(",")];

  for (const item of preparedData) {
    const record = Array.from(headers)
      .map((header) => {
        const value = item[header] ?? "";
        return escapeCsv(String(value));
      })
      .join(",");
    rows.push(record);
  }
  return rows.join("\n");
}

async function convertToJSON(preparedData) {
  return JSON.stringify(preparedData, null, 4);
}

// ref: https://raw.githubusercontent.com/gururise/AlpacaDataCleaned/main/alpaca_data.json
async function convertToJSONAlpaca(preparedData) {
  return JSON.stringify(preparedData, null, 4);
}

// You can validate JSONL outputs on https://jsonlines.org/validator/
async function convertToJSONL(workspaceChatsMap) {
  return Object.values(workspaceChatsMap)
    .map((workspaceChats) => JSON.stringify(workspaceChats))
    .join("\n");
}

async function prepareChatsForExport(
  format = "jsonl",
  chatType = "workspace",
  preloadedChats = null,
) {
  if (!exportMap.hasOwnProperty(format))
    throw new Error(`Invalid export type: ${format}`);

  const EXPORT_MAX_CHATS = parseInt(
    process.env.EXPORT_MAX_CHATS || "50000",
    10,
  );

  let chats;
  if (preloadedChats !== null) {
    chats = preloadedChats;
  } else if (chatType === "workspace") {
    chats = await WorkspaceChats.whereWithData({}, EXPORT_MAX_CHATS, null, {
      id: "asc",
    });
  } else if (chatType === "embed") {
    chats = await EmbedChats.whereWithEmbedAndWorkspace(
      {},
      EXPORT_MAX_CHATS,
      {
        id: "asc",
      },
      null,
    );
  } else {
    throw new Error(`Invalid chat type: ${chatType}`);
  }

  if (format === "csv" || format === "json") {
    const preparedData = chats.map((chat) => {
      const responseJson = safeJsonParse(chat.response, {});
      const baseData = {
        id: chat.id,
        prompt: chat.prompt,
        response: responseJson.text,
        sent_at: chat.createdAt,
        // Only add attachments to the json format since we cannot arrange attachments in csv format
        ...(format === "json"
          ? {
              attachments:
                responseJson.attachments?.length > 0
                  ? responseJson.attachments
                      .map((attachment) => ({
                        type: "image",
                        image: attachmentToDataUrl(attachment),
                      }))
                      .filter((a) => a.image !== null)
                  : [],
            }
          : {}),
      };

      if (chatType === "embed") {
        return {
          ...baseData,
          workspace: chat.embed_config
            ? chat.embed_config.workspace.name
            : "unknown workspace",
        };
      }

      return {
        ...baseData,
        workspace: chat.workspace ? chat.workspace.name : "unknown workspace",
        username: chat.user
          ? chat.user.username
          : chat.api_session_id !== null
            ? "API"
            : "unknown user",
        rating:
          chat.feedbackScore === null
            ? "--"
            : chat.feedbackScore
              ? "GOOD"
              : "BAD",
      };
    });

    return preparedData;
  }

  // jsonAlpaca format does not support array outputs
  if (format === "jsonAlpaca") {
    const preparedData = chats.map((chat) => {
      const responseJson = safeJsonParse(chat.response, {});
      return {
        instruction: buildSystemPrompt(
          chat,
          chat.workspace?.openAiPrompt ??
            chat.embed_config?.workspace?.openAiPrompt ??
            null,
        ),
        input: chat.prompt,
        output: responseJson.text,
      };
    });

    return preparedData;
  }

  // Export to JSONL format (recommended for fine-tuning)
  const workspaceChatsMap = chats.reduce((acc, chat) => {
    const { prompt, response, workspaceId } = chat;
    const responseJson = safeJsonParse(response, { attachments: [] });
    const attachments = responseJson.attachments;
    const groupKey = workspaceId ?? chat.embed_id;
    const systemPrompt =
      chat.workspace?.openAiPrompt ??
      chat.embed_config?.workspace?.openAiPrompt ??
      SystemSettings.saneDefaultSystemPrompt;

    if (!acc[groupKey]) {
      acc[groupKey] = {
        messages: [
          {
            role: "system",
            content: [
              {
                type: "text",
                text: systemPrompt,
              },
            ],
          },
        ],
      };
    }

    acc[groupKey].messages.push(
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          ...(attachments?.length > 0
            ? attachments
                .map((attachment) => ({
                  type: "image",
                  image: attachmentToDataUrl(attachment),
                }))
                .filter((a) => a.image !== null)
            : []),
        ],
      },
      {
        role: "assistant",
        content: [
          {
            type: "text",
            text: responseJson.text,
          },
        ],
      },
    );

    return acc;
  }, {});

  return workspaceChatsMap;
}

const exportMap = {
  json: {
    contentType: "application/json",
    func: convertToJSON,
  },
  csv: {
    contentType: "text/csv",
    func: convertToCSV,
  },
  jsonl: {
    contentType: "application/jsonl",
    func: convertToJSONL,
  },
  jsonAlpaca: {
    contentType: "application/json",
    func: convertToJSONAlpaca,
  },
};

function escapeCsv(str) {
  if (str === null || str === undefined) return '""';
  return `"${str.replace(/"/g, '""').replace(/[\r\n]+/g, " ")}"`;
}

async function exportChatsAsType(
  format = "jsonl",
  chatType = "workspace",
  preloadedChats = null,
) {
  const { contentType, func } = exportMap.hasOwnProperty(format)
    ? exportMap[format]
    : exportMap.jsonl;
  const chats = await prepareChatsForExport(format, chatType, preloadedChats);
  return {
    contentType,
    data: await func(chats),
  };
}

function buildSystemPrompt(chat, prompt = null) {
  const sources = safeJsonParse(chat.response)?.sources || [];
  const contextTexts = sources.map((source) => source.text);
  const context =
    sources.length > 0
      ? "\nContext:\n" +
        contextTexts
          .map((text, i) => {
            return `[CONTEXT ${i}]:\n${text}\n[END CONTEXT ${i}]\n\n`;
          })
          .join("")
      : "";
  return `${prompt ?? SystemSettings.saneDefaultSystemPrompt}${context}`;
}

/**
 * Converts an attachment's content string to a proper data URL format if needed
 * @param {Object} attachment - The attachment object containing contentString and mime type
 * @returns {string} The properly formatted data URL
 */
function attachmentToDataUrl(attachment) {
  if (!attachment || !attachment.contentString) return null;
  return attachment.contentString.startsWith("data:")
    ? attachment.contentString
    : `data:${attachment.mime || "application/octet-stream"};base64,${attachment.contentString}`;
}

module.exports = {
  prepareChatsForExport,
  exportChatsAsType,
};
