// SPDX-License-Identifier: MIT
import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

const ModelRouter: any = {
  getAll: async () => {
    return await fetch(`${API_BASE}/model-routers`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .then((res) => res?.routers || [])
      .catch((e) => {
        console.error(e);
        return [];
      });
  },

  get: async (id: any) => {
    return await fetch(`${API_BASE}/model-routers/${id}`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { router: null, error: e.message };
      });
  },

  create: async (data: any) => {
    return await fetch(`${API_BASE}/model-routers/new`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { router: null, error: e.message };
      });
  },

  update: async (id: any, data: any) => {
    return await fetch(`${API_BASE}/model-routers/${id}`, {
      method: "PUT",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { router: null, error: e.message };
      });
  },

  delete: async (id: any) => {
    return await fetch(`${API_BASE}/model-routers/${id}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },

  createRule: async (routerId: any, data: any) => {
    return await fetch(`${API_BASE}/model-routers/${routerId}/rules/new`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { rule: null, error: e.message };
      });
  },

  updateRule: async (routerId: any, ruleId: any, data: any) => {
    return await fetch(
      `${API_BASE}/model-routers/${routerId}/rules/${ruleId}`,
      {
        method: "PUT",
        headers: { ...baseHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    )
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { rule: null, error: e.message };
      });
  },

  deleteRule: async (routerId: any, ruleId: any) => {
    return await fetch(
      `${API_BASE}/model-routers/${routerId}/rules/${ruleId}`,
      {
        method: "DELETE",
        headers: baseHeaders(),
      },
    )
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },

  reorderRules: async (routerId: any, ruleUpdates: any) => {
    return await fetch(`${API_BASE}/model-routers/${routerId}/rules/reorder`, {
      method: "PUT",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ ruleUpdates }),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },
};

export default ModelRouter;
