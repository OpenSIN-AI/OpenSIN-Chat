// SPDX-License-Identifier: MIT
import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...baseHeaders(),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

const EmailAutomation = {
  bootstrap: () => request("/email-automation/bootstrap"),
  inbox: (accountId: string | null, query = "is:inbox", limit = 30) => {
    const params = new URLSearchParams({ query, limit: String(limit) });
    if (accountId) params.set("accountId", accountId);
    return request(`/email-automation/inbox?${params.toString()}`);
  },
  readThread: (threadId: string, accountId: string | null) => {
    const params = new URLSearchParams();
    if (accountId) params.set("accountId", accountId);
    return request(
      `/email-automation/threads/${encodeURIComponent(threadId)}?${params.toString()}`,
    );
  },
  saveAccount: (account: Record<string, unknown>) =>
    request("/email-automation/accounts", {
      method: "POST",
      body: JSON.stringify(account),
    }),
  deleteAccount: (id: string) =>
    request(`/email-automation/accounts/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  testAccount: (id: string) =>
    request(`/email-automation/accounts/${encodeURIComponent(id)}/test`, {
      method: "POST",
    }),
  saveGroup: (group: Record<string, unknown>) =>
    request("/email-automation/groups", {
      method: "POST",
      body: JSON.stringify(group),
    }),
  deleteGroup: (id: string) =>
    request(`/email-automation/groups/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  saveWorkflow: (workflow: Record<string, unknown>) =>
    request("/email-automation/workflows", {
      method: "POST",
      body: JSON.stringify(workflow),
    }),
  workflowAction: (id: string | number, action: "toggle" | "trigger") =>
    request(`/email-automation/workflows/${id}/${action}`, { method: "POST" }),
  deleteWorkflow: (id: string | number) =>
    request(`/email-automation/workflows/${id}`, { method: "DELETE" }),
};

export default EmailAutomation;
