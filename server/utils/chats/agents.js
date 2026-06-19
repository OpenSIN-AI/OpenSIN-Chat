// SPDX-License-Identifier: MIT
const pluralize = require("pluralize");
const {
  WorkspaceAgentInvocation,
} = require("../../models/workspaceAgentInvocation");
const { writeResponseChunk } = require("../helpers/chat/responses");
const { Workspace } = require("../../models/workspace");

/**
 * In-memory cache for attachments associated with agent invocations.
 * Attachments are stored here when grepAgents creates an invocation,
 * then retrieved by AgentHandler when the websocket connects.
 * @type {Map<string, Array>}
 */
const invocationAttachmentsCache = new Map();

/**
 * In-memory cache for extra prompt instructions associated with agent invocations.
 * Used to pass the screenshot URL prompt from the HTTP handler to the agent handler.
 * @type {Map<string, string>}
 */
const invocationUrlPromptCache = new Map();

/**
 * Store attachments for an invocation UUID
 * @param {string} uuid - The invocation UUID
 * @param {Array} attachments - The attachments array
 */
function cacheInvocationAttachments(uuid, attachments = []) {
  if (attachments.length > 0) {
    invocationAttachmentsCache.set(uuid, attachments);
    setTimeout(() => invocationAttachmentsCache.delete(uuid), 5 * 60 * 1000);
  }
}

/**
 * Retrieve and remove attachments for an invocation UUID
 * @param {string} uuid - The invocation UUID
 * @returns {Array} The attachments array (empty if none cached)
 */
function getAndClearInvocationAttachments(uuid) {
  const attachments = invocationAttachmentsCache.get(uuid) || [];
  invocationAttachmentsCache.delete(uuid);
  return attachments;
}

/**
 * Store a screenshot URL prompt instruction for an invocation UUID.
 * @param {string} uuid - The invocation UUID
 * @param {string|null} urlPrompt - The prompt instruction to inject into the agent system prompt
 */
function cacheInvocationUrlPrompt(uuid, urlPrompt = null) {
  if (urlPrompt) {
    invocationUrlPromptCache.set(uuid, urlPrompt);
    setTimeout(() => invocationUrlPromptCache.delete(uuid), 5 * 60 * 1000);
  }
}

/**
 * Retrieve and remove a screenshot URL prompt instruction for an invocation UUID.
 * @param {string} uuid - The invocation UUID
 * @returns {string|null} The cached prompt instruction, or null
 */
function getAndClearInvocationUrlPrompt(uuid) {
  const urlPrompt = invocationUrlPromptCache.get(uuid) || null;
  invocationUrlPromptCache.delete(uuid);
  return urlPrompt;
}

async function grepAgents({
  uuid,
  response,
  message,
  workspace,
  user = null,
  thread = null,
  attachments = [],
  urlPrompt = null,
}) {
  let nativeToolingEnabled = false;

  // If the workspace is in automatic mode, check if the workspace supports native tooling
  // to determine if the agent flow should be used or not.
  if (workspace?.chatMode === "automatic")
    nativeToolingEnabled = await Workspace.supportsNativeToolCalling(workspace);

  const agentHandles = WorkspaceAgentInvocation.parseAgents(message);
  if (agentHandles.length > 0 || nativeToolingEnabled) {
    const { invocation: newInvocation } = await WorkspaceAgentInvocation.new({
      prompt: message,
      workspace: workspace,
      user: user,
      thread: thread,
    });

    if (!newInvocation) {
      writeResponseChunk(response, {
        id: uuid,
        type: "statusResponse",
        textResponse: `${pluralize(
          "Agent",
          agentHandles.length,
        )} ${agentHandles.join(
          ", ",
        )} could not be called. Chat will be handled as default chat.`,
        sources: [],
        close: true,
        animate: false,
        error: null,
      });
      return;
    }

    // Cache attachments for the websocket handler to retrieve later
    cacheInvocationAttachments(newInvocation.uuid, attachments);
    // Cache any screenshot URL prompt instruction so the agent can ask about it.
    cacheInvocationUrlPrompt(newInvocation.uuid, urlPrompt);

    writeResponseChunk(response, {
      id: uuid,
      type: "agentInitWebsocketConnection",
      textResponse: null,
      sources: [],
      close: false,
      error: null,
      websocketUUID: newInvocation.uuid,
    });

    // Close HTTP stream-able chunk response method because we will swap to agents now.
    writeResponseChunk(response, {
      id: uuid,
      type: "statusResponse",
      textResponse:
        "@agent: Swapping over to agent chat. Type /exit to exit agent execution loop early.",
      sources: [],
      close: true,
      error: null,
      animate: true,
    });
    return true;
  }

  return false;
}

module.exports = {
  grepAgents,
  getAndClearInvocationAttachments,
  getAndClearInvocationUrlPrompt,
};
