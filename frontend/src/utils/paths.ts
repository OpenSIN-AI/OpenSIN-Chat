// SPDX-License-Identifier: MIT
import { API_BASE } from "./constants";

/**
 * Check if a href matches the current pathname.
 * Matches exactly or as a parent path (e.g. /settings/model-routers matches /settings/model-routers/1).
 */
export function isPathMatch(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

interface PathOptions {
  search?: Record<string, string | number | boolean> | string;
}

function applyOptions(path: string, options: PathOptions = {}): string {
  let updatedPath = path;
  if (!options || Object.keys(options).length === 0) return updatedPath;

  if (options.search) {
    if (typeof options.search === "string") {
      updatedPath += `?${options.search}`;
    } else {
      const searchParams = new URLSearchParams(
        Object.entries(options.search).map(([k, v]) => [k, String(v)]),
      );
      updatedPath += `?${searchParams.toString()}`;
    }
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
    return "https://github.com/OpenSIN-AI/OpenSIN-Chat";
  },
  discord: () => {
    return "https://discord.gg/6UyHPeGZAC";
  },
  // In-app developer documentation served by the SPA at /docs (see pages/Docs).
  // The external hosted docs at docs.opensin.delqhi.com are no longer available,
  // so all documentation links now route to the in-app docs.
  docs: (path = "") => {
    return `/docs${path}`;
  },
  appDocs: (path = "") => {
    return `/docs${path}`;
  },
  chatModes: () => {
    return "/docs/user-guide";
  },
  mailToSupport: () => {
    return "mailto:support@sinchat.delqhi.com";
  },
  workspace: {
    chat: (slug: string, options: PathOptions = {}) => {
      return applyOptions(`/workspace/${slug}`, options);
    },
    settings: {
      generalAppearance: (slug: string) => {
        return `/workspace/${slug}/settings/general-appearance`;
      },
      chatSettings: function (slug: any, options = {}) {
        return applyOptions(
          `/workspace/${slug}/settings/chat-settings`,
          options,
        );
      },
      vectorDatabase: (slug: string) => {
        return `/workspace/${slug}/settings/vector-database`;
      },
      members: (slug: string) => {
        return `/workspace/${slug}/settings/members`;
      },
      agentConfig: (slug: string) => {
        return `/workspace/${slug}/settings/agent-config`;
      },
    },
    thread: (wsSlug: string, threadSlug: string) => {
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
    modelRouterRules: (id: string) => {
      return `/settings/model-routers/${id}`;
    },
    systemPromptVariables: () => "/settings/system-prompt-variables",
    transformations: () => "/settings/transformations",
    logs: () => {
      return "/settings/event-logs";
    },
    privacy: () => {
      return "/settings/privacy";
    },
    embedChatWidgets: () => {
      return `/settings/embed-chat-widgets`;
    },
    experimental: () => {
      return "/settings/beta-features";
    },
    telegram: () => {
      return "/settings/external-connections/telegram";
    },
    scheduledJobs: () => {
      return "/settings/scheduled-jobs";
    },
    scheduledJobRuns: (jobId: string) => {
      return `/settings/scheduled-jobs/${jobId}/runs`;
    },
    scheduledJobRunDetail: (jobId: string, runId: string) => {
      return `/settings/scheduled-jobs/${jobId}/runs/${runId}`;
    },
    politicianSync: () => {
      return "/settings/politician-sync";
    },
    terminal: () => {
      return "/settings/terminal";
    },
  },
  emailCenter: () => {
    return "/mail";
  },
  pdfAnalysis: () => {
    return "/pdf-analysis";
  },
  agents: {
    builder: () => {
      return `/settings/agents/builder`;
    },
    editAgent: (uuid: string) => {
      return `/settings/agents/builder/${uuid}`;
    },
  },
  documentation: {
    contextWindows: () => {
      return "/docs";
    },
  },

  experimental: {
    liveDocumentSync: {
      manage: () => `/settings/beta-features/live-document-sync/manage`,
    },
  },
};
