// SPDX-License-Identifier: MIT
const consoleLogger = require("../../logger/console.js");

const { v4: uuidv4 } = require("uuid");
function clientAbortedHandler(resolve, fullText) {
  consoleLogger.log(
    "\x1b[43m\x1b[34m[STREAM ABORTED]\x1b[0m Client requested to abort stream. Exiting LLM stream handler early.",
  );
  resolve(fullText);
  return;
}

/**
 * Handles the default stream response for a chat.
 * @param {import("express").Response} response
 * @param {import('./LLMPerformanceMonitor').MonitoredStream} stream
 * @param {Object} responseProps
 * @returns {Promise<string>}
 */
function handleDefaultStreamResponseV2(response, stream, responseProps) {
  const { uuid = uuidv4(), sources = [] } = responseProps;

  let hasUsageMetrics = false;
  let usage = {
    completion_tokens: 0,
  };

  return new Promise((resolve) => {
    let fullText = "";
    let reasoningText = "";

    const handleAbort = () => {
      stream?.endMeasurement(usage);
      clientAbortedHandler(resolve, fullText);
    };
    response.on("close", handleAbort);

    (async () => {
      try {
        let reasoningMode = true;
        let reasoningBlockOpen = false;
        for await (const chunk of stream) {
          const message = chunk?.choices?.[0];
          const token = message?.delta?.content;

          const reasoningToken =
            message?.delta?.reasoning_content || message?.delta?.reasoning;

          if (
            chunk.hasOwnProperty("usage") &&
            !!chunk.usage &&
            Object.values(chunk.usage).length > 0
          ) {
            if (chunk.usage.hasOwnProperty("prompt_tokens")) {
              usage.prompt_tokens = Number(chunk.usage.prompt_tokens);
            }

            if (chunk.usage.hasOwnProperty("completion_tokens")) {
              hasUsageMetrics = true;
              usage.completion_tokens = Number(chunk.usage.completion_tokens);
            }

            if (chunk.usage.hasOwnProperty("time_info")) {
              usage.duration = chunk.usage.time_info.completion_time;
            }
          }

          if (reasoningToken) {
            reasoningText += reasoningToken;
            if (!hasUsageMetrics) usage.completion_tokens++;
            continue;
          }

          if (!!reasoningText && !reasoningToken && token) {
            reasoningText = "";
          }

          if (token) {
            let filteredToken = token;
            if (reasoningMode) {
              if (reasoningBlockOpen) {
                const endIdx = filteredToken.indexOf(" antwortet");
                if (endIdx !== -1) {
                  reasoningBlockOpen = false;
                  filteredToken = filteredToken.slice(endIdx + 8);
                } else {
                  continue;
                }
              }
              const startIdx = filteredToken.indexOf("imdaking");
              if (startIdx !== -1) {
                const afterStart = filteredToken.slice(startIdx + 7);
                const endIdx = afterStart.indexOf(" antwortet");
                if (endIdx !== -1) {
                  filteredToken = afterStart.slice(endIdx + 8);
                } else {
                  reasoningBlockOpen = true;
                  continue;
                }
              }
              if (!filteredToken) continue;
              reasoningMode = false;
            }

            fullText += filteredToken;
            if (!hasUsageMetrics) usage.completion_tokens++;
            if (response.writableEnded || response.destroyed) continue;
            writeResponseChunk(response, {
              uuid,
              sources: [],
              type: "textResponseChunk",
              textResponse: filteredToken,
              close: false,
              error: false,
            });
          }

          if (
            message?.hasOwnProperty("finish_reason") &&
            message.finish_reason !== "" &&
            message.finish_reason !== null
          ) {
            writeResponseChunk(response, {
              uuid,
              sources,
              type: "textResponseChunk",
              textResponse: "",
              close: true,
              error: false,
            });
            response.removeListener("close", handleAbort);
            stream?.endMeasurement(usage);
            resolve(fullText);
            break;
          }
        }
        response.removeListener("close", handleAbort);
        stream?.endMeasurement(usage);
        resolve(fullText);
      } catch (e) {
        consoleLogger.log(
          `\x1b[43m\x1b[34m[STREAMING ERROR]\x1b[0m ${e.message}`,
        );
        writeResponseChunk(response, {
          uuid,
          type: "abort",
          textResponse: null,
          sources: [],
          close: true,
          error: e.message,
        });
        response.removeListener("close", handleAbort);
        stream?.endMeasurement(usage);
        resolve(fullText);
      }
    })();
  });
}

function convertToChatHistory(history = []) {
  const formattedHistory = [];
  for (const record of history) {
    const { prompt, response, createdAt, feedbackScore = null, id } = record;
    let data;
    try {
      data = JSON.parse(response);
    } catch {
      consoleLogger.log(
        `[convertToChatHistory] ChatHistory #${record.id} response is not valid JSON - skipping record.`,
      );
      continue;
    }

    // In the event that a bad response was stored - we should skip its entire record
    // because it was likely an error and cannot be used in chats and will fail to render on UI.
    if (typeof prompt !== "string") {
      consoleLogger.log(
        `[convertToChatHistory] ChatHistory #${record.id} prompt property is not a string - skipping record.`,
      );
      continue;
    } else if (typeof data.text !== "string") {
      consoleLogger.log(
        `[convertToChatHistory] ChatHistory #${record.id} response.text property is not a string - skipping record.`,
      );
      continue;
    }

    formattedHistory.push([
      {
        role: "user",
        content: prompt,
        sentAt: Math.floor(new Date(createdAt).getTime() / 1000),
        attachments: data?.attachments ?? [],
        chatId: id,
      },
      {
        type: data?.type || "chat",
        role: "assistant",
        content: data.text,
        sources: data.sources || [],
        chatId: id,
        sentAt: Math.floor(new Date(createdAt).getTime() / 1000),
        feedbackScore,
        metrics: data?.metrics || {},
        ...(data?.outputs?.length > 0 ? { outputs: data.outputs } : {}),
        ...(data?.clarifyingQuestions?.length > 0
          ? { clarifyingQuestions: data.clarifyingQuestions }
          : {}),
      },
    ]);
  }

  return formattedHistory.flat();
}

/**
 * Render a single saved survey as a tagged Q/A transcript for LLM history.
 * Mirrors the answer-casing rules in formatAnswersForAgent (request-user-input.js)
 * so the model sees the same wording it saw mid-turn when the tool resolved.
 */
function formatClarifyingSurveyForPrompt(survey) {
  const questions = Array.isArray(survey?.questions) ? survey.questions : [];
  const result = survey?.result || {};
  if (!questions.length) return "";

  let body;
  if (result.timedOut) {
    body = "[no response within the time limit]";
  } else if (result.skipped) {
    body = "[user let the agent decide]";
  } else {
    const answers = Array.isArray(result.answers) ? result.answers : [];
    body = questions
      .map((q, i) => {
        const a = answers[i] || { skipped: true };
        let answerText;
        if (a.skipped) answerText = "[user skipped]";
        else if (Array.isArray(a.answer)) answerText = a.answer.join(", ");
        else if (a.answer === null || a.answer === undefined || a.answer === "")
          answerText = "[no answer]";
        else answerText = String(a.answer);
        return `Q: ${q.question}\nA: ${answerText}`;
      })
      .join("\n");
  }
  return `<clarifying_questions>\n${body}\n</clarifying_questions>`;
}

/**
 * Converts a chat history to a prompt history.
 * @param {Object[]} history - The chat history to convert
 * @returns {{role: string, content: string, attachments?: import("..").Attachment}[]}
 */
function convertToPromptHistory(history = []) {
  const formattedHistory = [];
  for (const record of history) {
    const { prompt, response } = record;
    let data;
    try {
      data = JSON.parse(response);
    } catch {
      consoleLogger.log(
        `[convertToPromptHistory] ChatHistory #${record.id} response is not valid JSON - skipping record.`,
      );
      continue;
    }

    // In the event that a bad response was stored - we should skip its entire record
    // because it was likely an error and cannot be used in chats and will fail to render on UI.
    if (typeof prompt !== "string") {
      consoleLogger.log(
        `[convertToPromptHistory] ChatHistory #${record.id} prompt property is not a string - skipping record.`,
      );
      continue;
    } else if (typeof data.text !== "string") {
      consoleLogger.log(
        `[convertToPromptHistory] ChatHistory #${record.id} response.text property is not a string - skipping record.`,
      );
      continue;
    }

    // If the agent saved one or more clarifying-question surveys on this
    // record, append them to the assistant content so future LLM turns
    // (agent or normal chat) can recall what the user answered.
    // Strip imd...thinking tags from the assistant content sent to the LLM
    // as chat history. Reasoning tokens are for the user's benefit (brain icon)
    // and should never be fed back to the model — they waste context and can
    // confuse the conversation.
    let assistantContent =
      data.text?.replace(
        /<think\s*(?:[^>]*?)?>[\s\S]*?<\/think\s*(?:[^>]*?)?>/gi,
        "",
      ) ?? data.text;
    if (data?.clarifyingQuestions?.length > 0) {
      const surveyBlocks = data.clarifyingQuestions
        .map(formatClarifyingSurveyForPrompt)
        .filter(Boolean)
        .join("\n\n");
      if (surveyBlocks)
        assistantContent = `${assistantContent}\n\n${surveyBlocks}`;
    }

    formattedHistory.push([
      {
        role: "user",
        content: prompt,
        // if there are attachments, add them as a property to the user message so we can reuse them in chat history later if supported by the llm.
        ...(data?.attachments?.length > 0
          ? { attachments: data?.attachments }
          : {}),
      },
      {
        role: "assistant",
        content: assistantContent,
      },
    ]);
  }
  return formattedHistory.flat();
}

/**
 * Safely stringifies any object containing BigInt values
 * @param {*} obj - Anything to stringify that might contain BigInt values
 * @returns {string} JSON string with BigInt values converted to strings
 */
function safeJSONStringify(obj) {
  return JSON.stringify(obj, (_, value) => {
    if (typeof value === "bigint") return value.toString();
    return value;
  });
}

function writeResponseChunk(response, data) {
  // Guard against writing to an already-ended or destroyed response.
  // Without this, a client disconnect during streaming causes an
  // "ERR_STREAM_WRITE_AFTER_END" or silent write to a dead socket.
  if (response.writableEnded || response.destroyed) return;
  try {
    response.write(`data: ${safeJSONStringify(data)}\n\n`);
  } catch {
    // Response was closed between our check and the write.
  }
  return;
}

/**
 * Formats the chat history to re-use attachments in the chat history
 * that might have existed in the conversation earlier.
 * @param {{role:string, content:string, attachments?: Object[]}[]} chatHistory
 * @param {function} formatterFunction - The function to format the chat history from the llm provider
 * @param {('asProperty'|'spread')} mode - "asProperty" or "spread". Determines how the content is formatted in the message object.
 * @returns {object[]}
 */
function formatChatHistory(
  chatHistory = [],
  formatterFunction,
  mode = "asProperty",
) {
  return chatHistory.map((historicalMessage) => {
    if (
      historicalMessage?.role !== "user" || // Only user messages can have attachments
      !historicalMessage?.attachments || // If there are no attachments, we can skip this
      !historicalMessage.attachments.length // If there is an array but it is empty, we can skip this
    )
      return historicalMessage;

    // Only pass image attachments (with actual content) to the LLM formatter.
    // File-reference attachments (contentString: null) are display metadata only.
    const imageAttachments = historicalMessage.attachments.filter(
      (a) => a?.contentString && a?.mime?.toLowerCase().startsWith("image/"),
    );
    if (!imageAttachments.length) return historicalMessage;

    // Some providers, like Ollama, expect the content to be embedded in the message object.
    if (mode === "spread") {
      return {
        role: historicalMessage.role,
        ...formatterFunction({
          userPrompt: historicalMessage.content,
          attachments: imageAttachments,
        }),
      };
    }

    // Most providers expect the content to be a property of the message object formatted like OpenAI models.
    return {
      role: historicalMessage.role,
      content: formatterFunction({
        userPrompt: historicalMessage.content,
        attachments: imageAttachments,
      }),
    };
  });
}

module.exports = {
  handleDefaultStreamResponseV2,
  convertToChatHistory,
  convertToPromptHistory,
  writeResponseChunk,
  clientAbortedHandler,
  formatChatHistory,
  safeJSONStringify,
};
