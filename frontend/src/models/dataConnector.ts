// SPDX-License-Identifier: MIT
import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";
import showToast from "@/utils/toast";

const DataConnector = {
  github: {
    branches: async ({ repo: any, accessToken }: any): Promise<any> => {
      return await fetch(`${API_BASE}/ext/github/branches`, {
        method: "POST",
        headers: baseHeaders(),
        cache: "force-cache",
        body: JSON.stringify({ repo, accessToken }),
      })
        .then((res) => res.json())
        .then((res) => {
          if (!res.success) throw new Error(res.reason);
          return res.data;
        })
        .then((data) => {
          return { branches: data?.branches || [], error: null };
        })
        .catch((e) => {
          console.error(e);
          showToast(e.message, "error");
          return { branches: [], error: e.message };
        });
    },
    collect: async function ({ repo: any, accessToken: any, branch: any, ignorePaths = [] }: any): any {
      return await fetch(`${API_BASE}/ext/github/repo`, {
        method: "POST",
        headers: baseHeaders(),
        body: JSON.stringify({ repo, accessToken, branch, ignorePaths }),
      })
        .then((res) => res.json())
        .then((res) => {
          if (!res.success) throw new Error(res.reason);
          return { data: res.data, error: null };
        })
        .catch((e) => {
          console.error(e);
          return { data: null, error: e.message };
        });
    },
  },
  gitlab: {
    branches: async ({ repo: any, accessToken }: any): Promise<any> => {
      return await fetch(`${API_BASE}/ext/gitlab/branches`, {
        method: "POST",
        headers: baseHeaders(),
        cache: "force-cache",
        body: JSON.stringify({ repo, accessToken }),
      })
        .then((res) => res.json())
        .then((res) => {
          if (!res.success) throw new Error(res.reason);
          return res.data;
        })
        .then((data) => {
          return { branches: data?.branches || [], error: null };
        })
        .catch((e) => {
          console.error(e);
          showToast(e.message, "error");
          return { branches: [], error: e.message };
        });
    },
    collect: async function ({
      repo: any, accessToken: any, branch: any, ignorePaths = []: any, fetchIssues = false: any, fetchWikis = false: any, }: any): any {
      return await fetch(`${API_BASE}/ext/gitlab/repo`, {
        method: "POST",
        headers: baseHeaders(),
        body: JSON.stringify({
          repo,
          accessToken,
          branch,
          ignorePaths,
          fetchIssues,
          fetchWikis,
        }),
      })
        .then((res) => res.json())
        .then((res) => {
          if (!res.success) throw new Error(res.reason);
          return { data: res.data, error: null };
        })
        .catch((e) => {
          console.error(e);
          return { data: null, error: e.message };
        });
    },
  },
  youtube: {
    transcribe: async ({ url }: any): Promise<any> => {
      return await fetch(`${API_BASE}/ext/youtube/transcript`, {
        method: "POST",
        headers: baseHeaders(),
        body: JSON.stringify({ url }),
      })
        .then((res) => res.json())
        .then((res) => {
          if (!res.success) throw new Error(res.reason);
          return { data: res.data, error: null };
        })
        .catch((e) => {
          console.error(e);
          return { data: null, error: e.message };
        });
    },
  },
  websiteDepth: {
    scrape: async ({ url: any, depth: any, maxLinks }: any): Promise<any> => {
      return await fetch(`${API_BASE}/ext/website-depth`, {
        method: "POST",
        headers: baseHeaders(),
        body: JSON.stringify({ url, depth, maxLinks }),
      })
        .then((res) => res.json())
        .then((res) => {
          if (!res.success) throw new Error(res.reason);
          return { data: res.data, error: null };
        })
        .catch((e) => {
          console.error(e);
          return { data: null, error: e.message };
        });
    },
  },

  confluence: {
    collect: async function ({
      baseUrl: any, spaceKey: any, username: any, accessToken: any, cloud: any, personalAccessToken: any, bypassSSL: any, }: any): any {
      return await fetch(`${API_BASE}/ext/confluence`, {
        method: "POST",
        headers: baseHeaders(),
        body: JSON.stringify({
          baseUrl,
          spaceKey,
          username,
          accessToken,
          cloud,
          personalAccessToken,
          bypassSSL,
        }),
      })
        .then((res) => res.json())
        .then((res) => {
          if (!res.success) throw new Error(res.reason);
          return { data: res.data, error: null };
        })
        .catch((e) => {
          console.error(e);
          return { data: null, error: e.message };
        });
    },
  },

  drupalwiki: {
    collect: async function ({ baseUrl: any, spaceIds: any, accessToken }: any): any {
      return await fetch(`${API_BASE}/ext/drupalwiki`, {
        method: "POST",
        headers: baseHeaders(),
        body: JSON.stringify({
          baseUrl,
          spaceIds,
          accessToken,
        }),
      })
        .then((res) => res.json())
        .then((res) => {
          if (!res.success) throw new Error(res.reason);
          return { data: res.data, error: null };
        })
        .catch((e) => {
          console.error(e);
          return { data: null, error: e.message };
        });
    },
  },
  obsidian: {
    collect: async function ({ files }: any): any {
      return await fetch(`${API_BASE}/ext/obsidian/vault`, {
        method: "POST",
        headers: baseHeaders(),
        body: JSON.stringify({
          files,
        }),
      })
        .then((res) => res.json())
        .then((res) => {
          if (!res.success) throw new Error(res.reason);
          return { data: res.data, error: null };
        })
        .catch((e) => {
          console.error(e);
          return { data: null, error: e.message };
        });
    },
  },

  paperlessNgx: {
    collect: async function ({ baseUrl: any, apiToken }: any): any {
      return await fetch(`${API_BASE}/ext/paperless-ngx`, {
        method: "POST",
        headers: baseHeaders(),
        body: JSON.stringify({ baseUrl, apiToken }),
      })
        .then((res) => res.json())
        .then((res) => {
          if (!res.success) throw new Error(res.reason);
          return { data: res.data, error: null };
        })
        .catch((e) => {
          console.error(e);
          return { data: null, error: e.message };
        });
    },
  },
};

export default DataConnector;
