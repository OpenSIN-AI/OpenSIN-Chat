// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Admin from "@/models/admin";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Admin", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe("users", () => {
    it("returns the users array on success", async () => {
      const users = [{ id: 1, username: "alice" }];
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ users }));
      const result = await Admin.users();
      expect(result).toEqual(users);
    });

    it("returns an empty array on network error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
      const result = await Admin.users();
      expect(result).toEqual([]);
    });
  });

  describe("newUser", () => {
    it("sends a POST to /admin/users/new with JSON body", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(jsonResponse({ user: { id: 2 }, error: null }));
      await Admin.newUser({ username: "bob" });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/users/new"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("returns the parsed JSON on success", async () => {
      const body = { user: { id: 2 }, error: null };
      global.fetch = vi.fn().mockResolvedValue(jsonResponse(body));
      const result = await Admin.newUser({ username: "bob" });
      expect(result).toEqual(body);
    });

    it("returns { user: null, error } on network failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
      const result = await Admin.newUser({ username: "bob" });
      expect(result.user).toBeNull();
      expect(result.error).toBe("Network error");
    });
  });

  describe("updateUser", () => {
    it("POSTs to /admin/user/{userId}", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
      await Admin.updateUser(7, { role: "admin" });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/user/7"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("returns the parsed JSON on success", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(jsonResponse({ success: true, error: null }));
      const result = await Admin.updateUser(7, { role: "admin" });
      expect(result).toEqual({ success: true, error: null });
    });

    it("returns { success: false, error } on network failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("boom"));
      const result = await Admin.updateUser(7, {});
      expect(result.success).toBe(false);
      expect(result.error).toBe("boom");
    });
  });

  describe("deleteUser", () => {
    it("DELETEs /admin/user/{userId}", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
      await Admin.deleteUser(7);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/user/7"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("returns { success: false, error } on network failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("nope"));
      const result = await Admin.deleteUser(7);
      expect(result.success).toBe(false);
      expect(result.error).toBe("nope");
    });
  });

  describe("invites", () => {
    it("returns the invites array on success", async () => {
      const invites = [{ id: 1, code: "abc" }];
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ invites }));
      const result = await Admin.invites();
      expect(result).toEqual(invites);
    });

    it("returns an empty array on network error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("fail"));
      const result = await Admin.invites();
      expect(result).toEqual([]);
    });
  });

  describe("newInvite", () => {
    it("POSTs to /admin/invite/new with role and workspaceIds in the body", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(jsonResponse({ invite: { id: 1 } }));
      await Admin.newInvite({ role: "admin", workspaceIds: [1, 2] });
      const call = global.fetch.mock.calls[0];
      expect(call[0]).toEqual(expect.stringContaining("/admin/invite/new"));
      const body = JSON.parse(call[1].body);
      expect(body).toEqual({ role: "admin", workspaceIds: [1, 2] });
    });

    it("returns the parsed JSON on success", async () => {
      const body = { invite: { id: 1, code: "xyz" }, error: null };
      global.fetch = vi.fn().mockResolvedValue(jsonResponse(body));
      const result = await Admin.newInvite({});
      expect(result).toEqual(body);
    });
  });

  describe("disableInvite", () => {
    it("DELETEs /admin/invite/{inviteId}", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
      await Admin.disableInvite(5);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/invite/5"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("returns { success: false, error } on network failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("nope"));
      const result = await Admin.disableInvite(5);
      expect(result.success).toBe(false);
      expect(result.error).toBe("nope");
    });
  });

  describe("workspaces", () => {
    it("returns the workspaces array on success", async () => {
      const workspaces = [{ slug: "alpha" }, { slug: "beta" }];
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ workspaces }));
      const result = await Admin.workspaces();
      expect(result).toEqual(workspaces);
    });

    it("returns an empty array on network error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("fail"));
      const result = await Admin.workspaces();
      expect(result).toEqual([]);
    });
  });

  describe("workspaceUsers", () => {
    it("returns the users for the workspace", async () => {
      const users = [{ id: 1 }];
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ users }));
      const result = await Admin.workspaceUsers(42);
      expect(result).toEqual(users);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/workspaces/42/users"),
        expect.anything(),
      );
    });

    it("returns an empty array on network error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("fail"));
      const result = await Admin.workspaceUsers(42);
      expect(result).toEqual([]);
    });
  });

  describe("newWorkspace", () => {
    it("POSTs the workspace name to /admin/workspaces/new", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(jsonResponse({ workspace: { slug: "new" } }));
      await Admin.newWorkspace("new");
      const call = global.fetch.mock.calls[0];
      expect(call[0]).toEqual(expect.stringContaining("/admin/workspaces/new"));
      expect(JSON.parse(call[1].body)).toEqual({ name: "new" });
    });

    it("returns the parsed JSON on success", async () => {
      const body = { workspace: { slug: "new" }, error: null };
      global.fetch = vi.fn().mockResolvedValue(jsonResponse(body));
      const result = await Admin.newWorkspace("new");
      expect(result).toEqual(body);
    });
  });

  describe("updateUsersInWorkspace", () => {
    it("POSTs the userIds array to /admin/workspaces/{id}/update-users", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
      await Admin.updateUsersInWorkspace(3, [1, 2, 3]);
      const call = global.fetch.mock.calls[0];
      expect(call[0]).toEqual(
        expect.stringContaining("/admin/workspaces/3/update-users"),
      );
      expect(JSON.parse(call[1].body)).toEqual({ userIds: [1, 2, 3] });
    });

    it("defaults userIds to [] when omitted", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
      await Admin.updateUsersInWorkspace(3);
      const call = global.fetch.mock.calls[0];
      expect(JSON.parse(call[1].body)).toEqual({ userIds: [] });
    });
  });

  describe("deleteWorkspace", () => {
    it("DELETEs /admin/workspaces/{id}", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
      await Admin.deleteWorkspace(3);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/workspaces/3"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("returns { success: false, error } on network failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("nope"));
      const result = await Admin.deleteWorkspace(3);
      expect(result.success).toBe(false);
      expect(result.error).toBe("nope");
    });
  });

  describe("systemPreferencesByFields", () => {
    it("joins labels with commas in the query string", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ settings: {} }));
      await Admin.systemPreferencesByFields(["a", "b", "c"]);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("labels=a,b,c"),
        expect.anything(),
      );
    });

    it("returns the parsed JSON on success", async () => {
      const body = { settings: { foo: "bar" } };
      global.fetch = vi.fn().mockResolvedValue(jsonResponse(body));
      const result = await Admin.systemPreferencesByFields(["foo"]);
      expect(result).toEqual(body);
    });

    it("returns null on network failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("boom"));
      const result = await Admin.systemPreferencesByFields(["foo"]);
      expect(result).toBeNull();
    });
  });

  describe("updateSystemPreferences", () => {
    it("POSTs the updates to /admin/system-preferences", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
      await Admin.updateSystemPreferences({ foo: "bar" });
      const call = global.fetch.mock.calls[0];
      expect(call[0]).toEqual(
        expect.stringContaining("/admin/system-preferences"),
      );
      expect(JSON.parse(call[1].body)).toEqual({ foo: "bar" });
    });

    it("returns { success: false, error } on network failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("boom"));
      const result = await Admin.updateSystemPreferences({});
      expect(result.success).toBe(false);
      expect(result.error).toBe("boom");
    });
  });

  describe("getApiKeys", () => {
    it("returns the parsed JSON when response is ok", async () => {
      const data = { apiKeys: [{ id: 1, name: "k1" }] };
      global.fetch = vi.fn().mockResolvedValue(jsonResponse(data));
      const result = await Admin.getApiKeys();
      expect(result).toEqual(data);
    });

    it("returns { apiKeys: [], error } when response is not ok", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(null, { status: 500, statusText: "Server" }),
        );
      const result = await Admin.getApiKeys();
      expect(result.apiKeys).toEqual([]);
      expect(typeof result.error).toBe("string");
    });

    it("returns { apiKeys: [], error } on network failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("boom"));
      const result = await Admin.getApiKeys();
      expect(result.apiKeys).toEqual([]);
      expect(result.error).toBe("boom");
    });
  });

  describe("generateApiKey", () => {
    it("POSTs the data to /admin/generate-api-key", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(jsonResponse({ apiKey: { id: 1 } }));
      await Admin.generateApiKey({ name: "k1" });
      const call = global.fetch.mock.calls[0];
      expect(call[0]).toEqual(
        expect.stringContaining("/admin/generate-api-key"),
      );
      expect(JSON.parse(call[1].body)).toEqual({ name: "k1" });
    });

    it("defaults to {} body when no data is provided", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(jsonResponse({ apiKey: { id: 1 } }));
      await Admin.generateApiKey();
      const call = global.fetch.mock.calls[0];
      expect(JSON.parse(call[1].body)).toEqual({});
    });

    it("returns { apiKey: null, error } on non-ok response", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(null, { status: 400, statusText: "Bad" }),
        );
      const result = await Admin.generateApiKey({});
      expect(result.apiKey).toBeNull();
      expect(typeof result.error).toBe("string");
    });
  });

  describe("deleteApiKey", () => {
    it("DELETEs /admin/delete-api-key/{id}", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(new Response(null, { status: 200 }));
      await Admin.deleteApiKey("abc-123");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/delete-api-key/abc-123"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("returns true when response is ok", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(new Response(null, { status: 200 }));
      const result = await Admin.deleteApiKey("abc-123");
      expect(result).toBe(true);
    });

    it("returns false on network failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("nope"));
      const result = await Admin.deleteApiKey("abc-123");
      expect(result).toBe(false);
    });
  });
});
