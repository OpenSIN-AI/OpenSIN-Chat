// SPDX-License-Identifier: MIT
/**
 * Tests for resetMemory (utils/chats/commands/reset.js).
 *
 * Verifies the migration from the deprecated markHistoryInvalid /
 * markThreadHistoryInvalid functions to markThreadHistoryInvalidV2
 * (Issue #383). The critical behavior: user_id and thread_id must be
 * passed as explicit null (not undefined) because Prisma treats
 * undefined as "ignore this filter" — which would invalidate ALL
 * users' chats instead of only the intended ones.
 */

jest.mock("../../../models/workspaceChats", () => ({
  WorkspaceChats: {
    markThreadHistoryInvalidV2: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("../../../utils/router", () => ({
  ModelRouterService: {
    resetForWorkspace: jest.fn(),
  },
}));

const { WorkspaceChats } = require("../../../models/workspaceChats");
const { ModelRouterService } = require("../../../utils/router");
const { resetMemory } = require("../../../utils/chats/commands/reset");

describe("resetMemory", () => {
  const workspace = { id: 7 };
  const msgUUID = "test-uuid";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("resets default-thread history with explicit nulls when no user and no thread", async () => {
    const result = await resetMemory(workspace, "", msgUUID, null, null);

    expect(WorkspaceChats.markThreadHistoryInvalidV2).toHaveBeenCalledTimes(1);
    expect(WorkspaceChats.markThreadHistoryInvalidV2).toHaveBeenCalledWith({
      workspaceId: 7,
      user_id: null,
      thread_id: null,
    });
    expect(result).toMatchObject({
      uuid: msgUUID,
      type: "textResponse",
      close: true,
      error: false,
      action: "reset_chat",
    });
  });

  test("scopes reset to the user's default thread when user is present", async () => {
    const user = { id: 42 };
    await resetMemory(workspace, "", msgUUID, user, null);

    expect(WorkspaceChats.markThreadHistoryInvalidV2).toHaveBeenCalledWith({
      workspaceId: 7,
      user_id: 42,
      thread_id: null,
    });
  });

  test("scopes reset to a specific thread when thread is present", async () => {
    const user = { id: 42 };
    const thread = { id: 99 };
    await resetMemory(workspace, "", msgUUID, user, thread);

    expect(WorkspaceChats.markThreadHistoryInvalidV2).toHaveBeenCalledWith({
      workspaceId: 7,
      user_id: 42,
      thread_id: 99,
    });
  });

  test("never passes undefined filter values to the model", async () => {
    await resetMemory(workspace, "", msgUUID, undefined, undefined);

    const callArg =
      WorkspaceChats.markThreadHistoryInvalidV2.mock.calls[0][0];
    expect(callArg.user_id).toBeNull();
    expect(callArg.thread_id).toBeNull();
  });

  test("clears the model router state for the workspace", async () => {
    const user = { id: 1 };
    const thread = { id: 2 };
    await resetMemory(workspace, "", msgUUID, user, thread);

    expect(ModelRouterService.resetForWorkspace).toHaveBeenCalledWith(
      workspace,
      user,
      thread,
    );
  });
});
