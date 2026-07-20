// SPDX-License-Identifier: MIT
const consoleLogger = require("../logger/console.js");

const { v4: uuidv4 } = require("uuid");
const { DocumentManager } = require("../DocumentManager");
const { WorkspaceChats } = require("../../models/workspaceChats");
const { WorkspaceParsedFiles } = require("../../models/workspaceParsedFiles");
const { WorkspaceThread } = require("../../models/workspaceThread");
const { getVectorDbClass, resolveProviderConnector } = require("../helpers");
const { writeResponseChunk } = require("../helpers/chat/responses");
const { grepAgents } = require("./agents");
const BackgroundQueue = require("../backgroundJobs/queue");
const {
  grepCommand,
  VALID_COMMANDS,
  chatPrompt,
  recentChatHistory,
  sourceIdentifier,
} = require("./index");
const {
  extractImageUrls,
  buildScreenshotUrlPrompt,
} = require("./extractImageUrls");
const { withInlineCitations } = require("./inlineCitations");

const VALID_CHAT_MODE = ["automatic", "chat", "query"];

async function streamChatWithWorkspace(
  response,
  workspace,
  message,
  chatMode = "automatic",
  user = null,
  thread = null,
  attachments = [],
  abortController = null,
) {
  const uuid = uuidv4();

  // Extract any URLs visible in image attachments so the LLM can ask whether
  // to analyze them on the web. This is a no-op when there are no images.
  const imageAttachmentStrings = (attachments || [])
    .filter(
      (attachment) =>
        attachment?.contentString &&
        attachment?.mime?.toLowerCase().startsWith("image/"),
    )
    .map((attachment) => attachment.contentString);
  const extractedImageUrls = imageAttachmentStrings.length
    ? await extractImageUrls(imageAttachmentStrings)
    : [];
  const imageUrlPrompt = extractedImageUrls.length
    ? buildScreenshotUrlPrompt(extractedImageUrls)
    : null;

  const updatedMessage = await grepCommand(message, user);

  if (Object.keys(VALID_COMMANDS).includes(updatedMessage)) {
    const data = await VALID_COMMANDS[updatedMessage](
      workspace,
      message,
      uuid,
      user,
      thread,
    );
    writeResponseChunk(response, data);
    return;
  }

  // If is agent enabled chat we will exit this flow early.
  const isAgentChat = await grepAgents({
    uuid,
    response,
    message: updatedMessage,
    user,
    workspace,
    thread,
    attachments,
    urlPrompt: imageUrlPrompt,
  });
  if (isAgentChat) return;

  const {
    connector: LLMConnector,
    routingMetadata,
    prefetchedContext,
    error: routerError,
  } = await resolveLLMConnector({
    workspace,
    message: updatedMessage,
    user,
    thread,
    attachments,
  });

  if (routerError) {
    return writeResponseChunk(response, {
      id: uuid,
      type: "abort",
      textResponse: null,
      sources: [],
      close: true,
      error: routerError,
    });
  }

  if (routingMetadata?.routedTo?.shouldNotify) {
    writeResponseChunk(response, {
      uuid: `${uuid}:route`,
      type: "modelRouteNotification",
      routedTo: routingMetadata.routedTo,
    });
  }

  const VectorDb = getVectorDbClass();

  const messageLimit = workspace?.openAiHistory ?? 20;
  // PERF: namespace existence + count are independent I/O — run in parallel
  const [hasVectorizedSpace, embeddingsCount] = await Promise.all([
    VectorDb.hasNamespace(workspace.slug),
    VectorDb.namespaceCount(workspace.slug),
  ]);

  // User is trying to query-mode chat a workspace that has no data in it - so
  // we should exit early as no information can be found under these conditions.
  if ((!hasVectorizedSpace || embeddingsCount === 0) && chatMode === "query") {
    const textResponse =
      workspace?.queryRefusalResponse ??
      "There is no relevant information in this workspace to answer your query.";
    writeResponseChunk(response, {
      id: uuid,
      type: "textResponse",
      textResponse,
      sources: [],
      attachments,
      close: true,
      error: null,
    });
    await WorkspaceChats.new({
      workspaceId: workspace.id,
      prompt: message,
      response: {
        text: textResponse,
        sources: [],
        type: chatMode,
        attachments,
      },
      threadId: thread?.id || null,
      include: false,
      user,
    });
    return;
  }

  // If we are here we know that we are in a workspace that is:
  // 1. Chatting in "chat" mode and may or may _not_ have embeddings
  // 2. Chatting in "query" mode and has at least 1 embedding
  let completeText;
  let metrics;
  let contextTexts = [];
  let sources = [];
  let pinnedDocIdentifiers = [];

  // If the router pre-fetched context we can reuse it; otherwise fetch fresh.
  const {
    rawHistory,
    chatHistory,
    pinnedDocs: prefetchedPinnedDocs,
    parsedFiles: prefetchedParsedFiles,
  } = prefetchedContext ??
  (await recentChatHistory({ user, workspace, thread, messageLimit }));

  // Always-on docs (legacy pin + contextMode summary/full) — single unified
  // loader so a document is never injected twice. Reuse pre-fetched if available.
  const alwaysOnDocs =
    prefetchedPinnedDocs ??
    (await new DocumentManager({
      workspace,
      maxTokens: LLMConnector.promptWindowLimit(),
    }).alwaysOnContextDocs());
  alwaysOnDocs.forEach((doc) => {
    const { pageContent, ...metadata } = doc;
    // Full-text always-on docs are excluded from similarity search to avoid
    // duplicating the same content as RAG chunks. Summaries stay searchable.
    if (doc.contextMode !== "summary") {
      pinnedDocIdentifiers.push(sourceIdentifier(doc));
    }
    contextTexts.push(doc.pageContent);
    sources.push({
      text:
        pageContent.slice(0, 1_000) + "...continued on in source document...",
      ...metadata,
    });
  });

  // Parsed files — reuse pre-fetched if available, otherwise fetch fresh.
  const parsedFiles =
    prefetchedParsedFiles ??
    (await WorkspaceParsedFiles.getContextFiles(
      workspace,
      thread || null,
      user || null,
    ));
  parsedFiles.forEach((doc) => {
    const { pageContent, ...metadata } = doc;
    contextTexts.push(doc.pageContent);
    sources.push({
      text:
        pageContent.slice(0, 1_000) + "...continued on in source document...",
      ...metadata,
    });
  });

  const vectorSearchResults =
    embeddingsCount !== 0
      ? await VectorDb.performSimilaritySearch({
          namespace: workspace.slug,
          input: updatedMessage,
          LLMConnector,
          similarityThreshold: workspace?.similarityThreshold,
          topN: workspace?.topN,
          filterIdentifiers: pinnedDocIdentifiers,
          rerank: workspace?.vectorSearchMode === "rerank",
        })
      : {
          contextTexts: [],
          sources: [],
          message: null,
        };

  // Failed similarity search if it was run at all and failed.
  if (!!vectorSearchResults.message) {
    writeResponseChunk(response, {
      id: uuid,
      type: "abort",
      textResponse: null,
      sources: [],
      close: true,
      error: vectorSearchResults.message,
    });
    return;
  }

  const { fillSourceWindow } = require("../helpers/chat");
  const filledSources = fillSourceWindow({
    nDocs: workspace?.topN ?? 4,
    searchResults: vectorSearchResults.sources,
    history: rawHistory,
    filterIdentifiers: pinnedDocIdentifiers,
  });

  // Keep contextTexts and sources index-aligned so [source:N] markers map
  // correctly to sources[N-1] in the frontend. fillSourceWindow may backfill
  // from history — those chunks must appear in both arrays at the same index.
  contextTexts = [...contextTexts, ...filledSources.contextTexts];
  sources = [...sources, ...filledSources.sources];

  // If in query mode and no context chunks are found from search, backfill, or pins -  do not
  // let the LLM try to hallucinate a response or use general knowledge and exit early
  if (chatMode === "query" && contextTexts.length === 0) {
    const textResponse =
      workspace?.queryRefusalResponse ??
      "There is no relevant information in this workspace to answer your query.";
    writeResponseChunk(response, {
      id: uuid,
      type: "textResponse",
      textResponse,
      sources: [],
      close: true,
      error: null,
    });

    await WorkspaceChats.new({
      workspaceId: workspace.id,
      prompt: message,
      response: {
        text: textResponse,
        sources: [],
        type: chatMode,
        attachments,
      },
      threadId: thread?.id || null,
      include: false,
      user,
    });
    return;
  }

  // Compress & Assemble message to ensure prompt passes token limit with room for response
  // and build system messages based on inputs and history.
  // Reuse the system prompt from routing pre-fetch when available.
  let systemPrompt =
    prefetchedContext?.systemPrompt ??
    (await chatPrompt(workspace, user, {
      prompt: updatedMessage,
      rawHistory,
    }));
  if (imageUrlPrompt) systemPrompt += "\n\n" + imageUrlPrompt;

  // Inject inline-citation instructions when there are context documents so
  // the LLM marks statements with [source:N] markers for the frontend to render.
  systemPrompt = withInlineCitations(systemPrompt, contextTexts.length);
  const messages = await LLMConnector.compressMessages(
    {
      systemPrompt,
      userPrompt: updatedMessage,
      contextTexts,
      chatHistory,
      attachments,
    },
    rawHistory,
  );

  // Early exit if the client already disconnected during the prep work
  // (vector search, doc fetching, prompt assembly).
  if (response.writableEnded || response.destroyed) {
    consoleLogger.log(
      `\x1b[43m\x1b[34m[STREAM ABORTED]\x1b[0m Client disconnected before LLM call. Skipping generation.`,
    );
    return;
  }

  // If streaming is not explicitly enabled for connector
  // we do regular waiting of a response and send a single chunk.
  if (LLMConnector.streamingEnabled() !== true) {
    consoleLogger.log(
      `\x1b[31m[STREAMING DISABLED]\x1b[0m Streaming is not available for ${LLMConnector.constructor.name}. Will use regular chat method.`,
    );

    // Abort early if the client disconnected during the non-streaming
    // completion call — without this the server keeps consuming LLM
    // tokens for a response nobody will read.
    let clientDisconnected = false;
    const onClientClose = () => {
      clientDisconnected = true;
    };
    response.on("close", onClientClose);

    const { textResponse, metrics: performanceMetrics } =
      await LLMConnector.getChatCompletion(messages, {
        temperature: workspace?.openAiTemp ?? LLMConnector.defaultTemp,
        user: user,
        signal: abortController?.signal,
      });

    response.removeListener("close", onClientClose);

    if (clientDisconnected) {
      consoleLogger.log(
        `\x1b[43m\x1b[34m[STREAM ABORTED]\x1b[0m Client disconnected during non-streaming completion. Skipping write.`,
      );
      return;
    }

    completeText = textResponse;
    metrics = performanceMetrics;
    writeResponseChunk(response, {
      uuid,
      sources,
      type: "textResponseChunk",
      textResponse: completeText,
      close: true,
      error: false,
      metrics,
    });
  } else {
    const stream = await LLMConnector.streamGetChatCompletion(messages, {
      temperature: workspace?.openAiTemp ?? LLMConnector.defaultTemp,
      user: user,
      signal: abortController?.signal,
    });

    // Guard against connectors that return a null/undefined stream when the
    // provider request fails (e.g. NVIDIA NIM 401 invalid API key). Without
    // this guard the subsequent handleStream() and stream.metrics accesses
    // throw "Cannot read properties of null" and the endpoint falls back to
    // the generic "Internal error" message. Issue #262.
    if (!stream) {
      const providerName =
        LLMConnector.className ||
        LLMConnector.constructor?.name ||
        "LLM provider";

      consoleLogger.error(
        `\x1b[31m[STREAM FAILED]\x1b[0m ${providerName} returned a null stream. The provider is likely misconfigured or the API key is invalid.`,
      );
      writeResponseChunk(response, {
        uuid,
        sources,
        type: "abort",
        textResponse: null,
        close: true,
        error: `${providerName} failed to start the chat stream. Please verify the provider configuration and API key in System Settings.`,
      });
      return;
    }

    completeText = await LLMConnector.handleStream(response, stream, {
      uuid,
      sources,
    });
    metrics = stream?.metrics || {};
  }

  if (completeText?.length > 0) {
    const { chat } = await WorkspaceChats.new({
      workspaceId: workspace.id,
      prompt: message,
      response: {
        text: completeText,
        sources,
        type: chatMode,
        attachments,
        metrics,
      },
      threadId: thread?.id || null,
      user,
    });

    // --- Persistente asynchrone Titel-Generierung (OpenSIN-Chat) ---
    // Jobs laufen in `server/utils/backgroundJobs/queue.js` und überleben
    // Server-Restarts, Mac-Sleep und Docker-Neustarts (SQLite-basiert).
    // Nur serialisierbare Daten (IDs/Slugs/Strings) in das Payload — keine
    // Prisma-Objekte, die JSON.stringify nicht überleben würden.
    if (thread && thread.name === WorkspaceThread.defaultName) {
      BackgroundQueue.add("GENERATE_THREAD_TITLE", {
        threadId: thread.id,
        workspaceSlug: workspace.slug,
        prompt: message,
        response: completeText,
      }).catch((err) =>
        consoleLogger.error("[Chat] Queue enqueue failed:", err.message),
      );
    }
    // --- ENDE ---

    writeResponseChunk(response, {
      uuid,
      type: "finalizeResponseStream",
      close: true,
      error: false,
      chatId: chat.id,
      metrics,
    });
    return;
  }

  writeResponseChunk(response, {
    uuid,
    type: "finalizeResponseStream",
    close: true,
    error: false,
    metrics,
  });
  return;
}

async function resolveLLMConnector({
  workspace,
  message,
  user,
  thread,
  attachments,
}) {
  try {
    const result = await resolveProviderConnector({
      workspace,
      prompt: message,
      user,
      thread,
      attachments,
    });
    return { ...result, error: null };
  } catch (routerError) {
    return {
      connector: null,
      routingMetadata: null,
      prefetchedContext: null,
      error: `Model router error: ${routerError.message}`,
    };
  }
}

module.exports = {
  VALID_CHAT_MODE,
  streamChatWithWorkspace,
};
