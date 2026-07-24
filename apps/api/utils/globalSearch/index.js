// SPDX-License-Identifier: MIT

const prisma = require("../prisma");

const { SEARCH_TYPES, normalizeSearchTypes } = require("./types");
const { normalizeQuery, normalizeLimit } = require("./query");
const { getSearchableWorkspaces } = require("./access");
const { rankAndLimit } = require("./ranking");
const { buildSnippet } = require("./snippet");

const MAX_SEARCHABLE_CHAT_LENGTH = 100_000;

function includesType(types, type) {
  return types.includes(type);
}

function workspaceMap(workspaces) {
  return new Map(workspaces.map((workspace) => [workspace.id, workspace]));
}

function baseResult({
  type,
  id,
  workspace,
  title,
  subtitle = "",
  snippet = "",
  createdAt = null,
  updatedAt = null,
  target = {},
  metadata = {},
}) {
  return {
    type,
    id: String(id),
    workspaceId: workspace?.id || null,
    workspaceName: workspace?.name || null,
    workspaceSlug: workspace?.slug || null,
    title: String(title || ""),
    subtitle: String(subtitle || ""),
    snippet: String(snippet || ""),
    createdAt,
    updatedAt,
    target,
    metadata,
  };
}

async function searchWorkspaces({ query, workspaces }) {
  const lower = query.toLocaleLowerCase();

  return workspaces
    .filter(
      (workspace) =>
        workspace.name.toLocaleLowerCase().includes(lower) ||
        workspace.slug.toLocaleLowerCase().includes(lower),
    )
    .map((workspace) =>
      baseResult({
        type: SEARCH_TYPES.WORKSPACE,
        id: workspace.id,
        workspace,
        title: workspace.name,
        subtitle: "Notebook",
        createdAt: workspace.createdAt,
        updatedAt: workspace.lastUpdatedAt,
        target: {
          workspaceSlug: workspace.slug,
        },
      }),
    );
}

async function searchThreads({
  query,
  workspaceIds,
  workspacesById,
  perTypeLimit,
}) {
  const threads = await prisma.workspace_threads.findMany({
    where: {
      workspace_id: { in: workspaceIds },
      name: { contains: query },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      workspace_id: true,
      createdAt: true,
      lastUpdatedAt: true,
    },
    orderBy: { lastUpdatedAt: "desc" },
    take: perTypeLimit,
  });

  return threads.map((thread) => {
    const workspace = workspacesById.get(thread.workspace_id);
    return baseResult({
      type: SEARCH_TYPES.THREAD,
      id: thread.id,
      workspace,
      title: thread.name,
      subtitle: workspace?.name || "Chat",
      createdAt: thread.createdAt,
      updatedAt: thread.lastUpdatedAt,
      target: {
        workspaceSlug: workspace?.slug,
        threadSlug: thread.slug,
      },
    });
  });
}

async function searchChats({
  query,
  workspaceIds,
  workspacesById,
  perTypeLimit,
}) {
  const chats = await prisma.workspace_chats.findMany({
    where: {
      workspaceId: { in: workspaceIds },
      OR: [{ prompt: { contains: query } }, { response: { contains: query } }],
    },
    select: {
      id: true,
      workspaceId: true,
      thread_id: true,
      prompt: true,
      response: true,
      createdAt: true,
      lastUpdatedAt: true,
    },
    orderBy: { lastUpdatedAt: "desc" },
    take: perTypeLimit,
  });

  const threadIds = [
    ...new Set(chats.map((chat) => chat.thread_id).filter(Boolean)),
  ];

  const threads = threadIds.length
    ? await prisma.workspace_threads.findMany({
        where: { id: { in: threadIds } },
        select: { id: true, name: true, slug: true },
      })
    : [];

  const threadsById = new Map(threads.map((thread) => [thread.id, thread]));

  return chats.map((chat) => {
    const workspace = workspacesById.get(chat.workspaceId);
    const thread = chat.thread_id ? threadsById.get(chat.thread_id) : null;

    const promptMatches = chat.prompt
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase());

    const sourceText = promptMatches
      ? chat.prompt
      : chat.response.length > MAX_SEARCHABLE_CHAT_LENGTH
        ? chat.response.slice(0, MAX_SEARCHABLE_CHAT_LENGTH)
        : chat.response;

    return baseResult({
      type: SEARCH_TYPES.CHAT,
      id: chat.id,
      workspace,
      title:
        thread?.name ||
        buildSnippet(chat.prompt, query).slice(0, 90) ||
        "Unterhaltung",
      subtitle: workspace?.name || "Chat",
      snippet: buildSnippet(sourceText, query),
      createdAt: chat.createdAt,
      updatedAt: chat.lastUpdatedAt,
      target: {
        workspaceSlug: workspace?.slug,
        threadSlug: thread?.slug || null,
        chatId: chat.id,
      },
      metadata: {
        matchedField: promptMatches ? "prompt" : "response",
      },
    });
  });
}

async function searchDocuments({
  query,
  workspaceIds,
  workspacesById,
  perTypeLimit,
}) {
  const documents = await prisma.workspace_documents.findMany({
    where: {
      workspaceId: { in: workspaceIds },
      OR: [
        { filename: { contains: query } },
        { docpath: { contains: query } },
        { metadata: { contains: query } },
      ],
    },
    select: {
      id: true,
      docId: true,
      filename: true,
      docpath: true,
      workspaceId: true,
      metadata: true,
      createdAt: true,
      lastUpdatedAt: true,
    },
    orderBy: { lastUpdatedAt: "desc" },
    take: perTypeLimit,
  });

  return documents.map((document) => {
    const workspace = workspacesById.get(document.workspaceId);
    return baseResult({
      type: SEARCH_TYPES.SOURCE,
      id: document.docId,
      workspace,
      title: document.filename,
      subtitle: workspace?.name || "Quelle",
      snippet: buildSnippet(document.metadata || document.docpath, query),
      createdAt: document.createdAt,
      updatedAt: document.lastUpdatedAt,
      target: {
        workspaceSlug: workspace?.slug,
        sourceId: document.docId,
        sourcePanel: "sources",
      },
      metadata: {
        documentId: document.id,
        docpath: document.docpath,
      },
    });
  });
}

async function searchNotes({
  query,
  workspaceIds,
  workspacesById,
  perTypeLimit,
}) {
  if (!prisma.workspace_notes) return [];

  const notes = await prisma.workspace_notes.findMany({
    where: {
      workspaceId: { in: workspaceIds },
      deletedAt: null,
      OR: [{ title: { contains: query } }, { content: { contains: query } }],
    },
    orderBy: { updatedAt: "desc" },
    take: perTypeLimit,
  });

  return notes.map((note) => {
    const workspace = workspacesById.get(note.workspaceId);
    return baseResult({
      type: SEARCH_TYPES.NOTE,
      id: note.id,
      workspace,
      title: note.title || "Unbenannte Notiz",
      subtitle: workspace?.name || "Notiz",
      snippet: buildSnippet(note.content, query),
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      target: {
        workspaceSlug: workspace?.slug,
        noteId: note.id,
        sidebar: "notepad",
      },
    });
  });
}

async function searchArtifacts({
  query,
  workspaceIds,
  workspacesById,
  perTypeLimit,
}) {
  if (!prisma.workspace_artifacts) return [];

  const artifacts = await prisma.workspace_artifacts.findMany({
    where: {
      workspaceId: { in: workspaceIds },
      status: { not: "archived" },
      OR: [
        { title: { contains: query } },
        { description: { contains: query } },
        { content: { contains: query } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: perTypeLimit,
  });

  return artifacts.map((artifact) => {
    const workspace = workspacesById.get(artifact.workspaceId);
    return baseResult({
      type: SEARCH_TYPES.ARTIFACT,
      id: artifact.uuid,
      workspace,
      title: artifact.title,
      subtitle: workspace?.name || "Ergebnis",
      snippet: buildSnippet(artifact.description || artifact.content, query),
      createdAt: artifact.createdAt,
      updatedAt: artifact.updatedAt,
      target: {
        workspaceSlug: workspace?.slug,
        artifactUuid: artifact.uuid,
        sidebar: "results",
      },
      metadata: {
        artifactType: artifact.type,
        status: artifact.status,
      },
    });
  });
}

async function globalSearch({
  user,
  query: rawQuery,
  types: rawTypes,
  limit: rawLimit,
}) {
  const query = normalizeQuery(rawQuery);
  const types = normalizeSearchTypes(rawTypes);
  const limit = normalizeLimit(rawLimit);

  if (query.length < 2) {
    return { query, results: [], counts: {}, total: 0 };
  }

  const workspaces = await getSearchableWorkspaces(user);
  if (!workspaces.length) {
    return { query, results: [], counts: {}, total: 0 };
  }

  const workspaceIds = workspaces.map((workspace) => workspace.id);
  const workspacesById = workspaceMap(workspaces);
  const perTypeLimit = Math.min(Math.max(limit * 2, 20), 100);

  const tasks = [];

  if (includesType(types, SEARCH_TYPES.WORKSPACE)) {
    tasks.push(searchWorkspaces({ query, workspaces }));
  }
  if (includesType(types, SEARCH_TYPES.THREAD)) {
    tasks.push(
      searchThreads({ query, workspaceIds, workspacesById, perTypeLimit }),
    );
  }
  if (includesType(types, SEARCH_TYPES.CHAT)) {
    tasks.push(
      searchChats({ query, workspaceIds, workspacesById, perTypeLimit }),
    );
  }
  if (includesType(types, SEARCH_TYPES.SOURCE)) {
    tasks.push(
      searchDocuments({ query, workspaceIds, workspacesById, perTypeLimit }),
    );
  }
  if (includesType(types, SEARCH_TYPES.NOTE)) {
    tasks.push(
      searchNotes({ query, workspaceIds, workspacesById, perTypeLimit }),
    );
  }
  if (includesType(types, SEARCH_TYPES.ARTIFACT)) {
    tasks.push(
      searchArtifacts({ query, workspaceIds, workspacesById, perTypeLimit }),
    );
  }

  const settled = await Promise.allSettled(tasks);
  const combined = settled.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );

  const ranked = rankAndLimit({ results: combined, query, limit });

  const counts = ranked.reduce((accumulator, result) => {
    accumulator[result.type] = (accumulator[result.type] || 0) + 1;
    return accumulator;
  }, {});

  return { query, results: ranked, counts, total: ranked.length };
}

module.exports = {
  globalSearch,
  searchWorkspaces,
  searchThreads,
  searchChats,
  searchDocuments,
  searchNotes,
  searchArtifacts,
};
