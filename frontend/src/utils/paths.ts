// SPDX-License-Identifier: MIT
import { API_BASE } from "./constants";

/**
 * Check if a href matches the current pathname.
 * Matches exactly or as a parent path (e.g. /settings/model-routers matches /settings/model-routers/1).
 */
export function isPathMatch(href, pathname) {
  return pathname === href || pathname.startsWith(href + "/");
}

interface PathOptions {
  search?: Record<string, string | number | boolean>;
}

function applyOptions(path: string, options: PathOptions = {}): string {
  let updatedPath = path;
  if (!options || Object.keys(options).length === 0) return updatedPath;

  if (options.search) {
    const searchParams = new URLSearchParams(
      Object.entries(options.search).map(([k, v]) => [k, String(v)])
    );
    updatedPath += `?${searchParams.toString()}`;
  }
  return updatedPath;
}

export default {
  home: () => {
    return "/";
  },
  login: (noTry = false) => {
    return `/login${noTry ? "?nt=1" : ""}`;
  },
  sso: {
    login: () => {
      return "/sso/simple";
    },
  },
  onboarding: {
    home: () => {
      return "/onboarding";
    },
    survey: () => {
      return "/onboarding/survey";
    },
    llmPreference: () => {
      return "/onboarding/llm-preference";
    },
    embeddingPreference: () => {
      return "/onboarding/embedding-preference";
    },
    vectorDatabase: () => {
      return "/onboarding/vector-database";
    },
    userSetup: () => {
      return "/onboarding/user-setup";
    },
    dataHandling: () => {
      return "/onboarding/data-handling";
    },
  },
  github: () => {
    return "https://github.com/Family-Team-Projects/OpenSIN-Chat";
  },
  discord: () => {
    return "https://discord.gg/6UyHPeGZAC";
  },
  docs: (path = "") => {
    // External hosted documentation (feature/agent/channel guides).
    return `https://opensin.delqhi.com/docs${path}`;
  },
  // In-app developer documentation served by the SPA at /docs (see pages/Docs).
  appDocs: (path = "") => {
    return `/docs${path}`;
  },
  chatModes: () => {
    return "https://opensin.delqhi.com/docs/features/chat-modes";
  },
  mailToSupport: () => {
    return "mailto:support@opensin.delqhi.com";
  },
  workspace: {
    chat: (slug, options = {}) => {
      return applyOptions(`/workspace/${slug}`, options);
    },
    settings: {
      generalAppearance: (slug) => {
        return `/workspace/${slug}/settings/general-appearance`;
      },
      chatSettings: function (slug: any, options = {}) {
        return applyOptions(
          `/workspace/${slug}/settings/chat-settings`,
          options,
        );
      },
      vectorDatabase: (slug) => {
        return `/workspace/${slug}/settings/vector-database`;
      },
      members: (slug) => {
        return `/workspace/${slug}/settings/members`;
      },
      agentConfig: (slug) => {
        return `/workspace/${slug}/settings/agent-config`;
      },
    },
    thread: (wsSlug, threadSlug) => {
      return `/workspace/${wsSlug}/t/${threadSlug}`;
    },
  },
  apiDocs: () => {
    return `${API_BASE}/docs`;
  },
  settings: {
    users: () => {
      return `/settings/users`;
    },
    invites: () => {
      return `/settings/invites`;
    },
    workspaces: () => {
      return `/settings/workspaces`;
    },
    chats: () => {
      return "/settings/workspace-chats";
    },
    llmPreference: () => {
      return "/settings/llm-preference";
    },
    systemHealth: () => {
      return "/settings/system-health";
    },
    transcriptionPreference: () => {
      return "/settings/transcription-preference";
    },
    audioPreference: () => {
      return "/settings/audio-preference";
    },
    defaultSystemPrompt: () => {
      return "/settings/default-system-prompt";
    },
    embedder: {
      modelPreference: () => "/settings/embedding-preference",
      chunkingPreference: () => "/settings/text-splitter-preference",
    },
    embeddingPreference: () => {
      return "/settings/embedding-preference";
    },
    vectorDatabase: () => {
      return "/settings/vector-database";
    },
    security: () => {
      return "/settings/security";
    },
    interface: () => {
      return "/settings/interface";
    },
    branding: () => {
      return "/settings/branding";
    },
    agentSkills: () => {
      return "/settings/agents";
    },
    chat: () => {
      return "/settings/chat";
    },
    apiKeys: () => {
      return "/settings/api-keys";
    },
    modelRouters: () => {
      return "/settings/model-routers";
    },
    modelRouterRules: (id) => {
      return `/settings/model-routers/${id}`;
    },
    systemPromptVariables: () => "/settings/system-prompt-variables",
    logs: () => {
      return "/settings/event-logs";
    },
    privacy: () => {
      return "/settings/privacy";
    },
    embedChatWidgets: () => {
      return `/settings/embed-chat-widgets`;
    },
    browserExtension: () => {
      return `/settings/browser-extension`;
    },
    mobile: () => {
      return `/settings/mobile-connections`;
    },
    experimental: () => {
      return "/settings/beta-features";
    },
    mobileConnections: () => {
      return "/settings/mobile-connections";
    },
    telegram: () => {
      return "/settings/external-connections/telegram";
    },
    scheduledJobs: () => {
      return "/settings/scheduled-jobs";
    },
    scheduledJobRuns: (jobId) => {
      return `/settings/scheduled-jobs/${jobId}/runs`;
    },
    scheduledJobRunDetail: (jobId, runId) => {
      return `/settings/scheduled-jobs/${jobId}/runs/${runId}`;
    },
  },
  pdfAnalysis: () => {
    return "/pdf-analysis";
  },
  agents: {
    builder: () => {
      return `/settings/agents/builder`;
    },
    editAgent: (uuid) => {
      return `/settings/agents/builder/${uuid}`;
    },
  },
  communityHub: {
    website: () => {
      return "https://opensin.delqhi.com/hub";
    },
    viewMoreOfType: function (type: any) {
      return `${this.website()}/list/${type}`;
    },
    viewItem: function (type: any, id: any) {
      return `${this.website()}/i/${type}/${id}`;
    },
    trending: () => {
      return `/settings/community-hub/trending`;
    },
    authentication: () => {
      return `/settings/community-hub/authentication`;
    },
    importItem: (importItemId) => {
      return `/settings/community-hub/import-item${importItemId ? `?id=${importItemId}` : ""}`;
    },
    profile: function (username: any) {
      if (username) return `${this.website()}/u/${username}`;
      return `${this.website()}/me`;
    },
    noPrivateItems: () => {
      return "https://opensin.delqhi.com/docs/community-hub/faq#no-private-items";
    },
  },

  documentation: {
    mobileIntroduction: () => {
      return "https://opensin.delqhi.com/docs/mobile/overview";
    },
    contextWindows: () => {
      return "https://opensin.delqhi.com/docs/chatting-with-documents/introduction#you-exceed-the-context-window---what-now";
    },
  },

  experimental: {
    liveDocumentSync: {
      manage: () => `/settings/beta-features/live-document-sync/manage`,
    },
  },
};
