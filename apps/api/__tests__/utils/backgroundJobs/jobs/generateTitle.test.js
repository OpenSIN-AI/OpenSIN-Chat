// SPDX-License-Identifier: MIT
const mockUpdate = jest.fn();
const mockGetThread = jest.fn();
const mockGetWorkspace = jest.fn();
const mockGetChatCompletion = jest.fn();

jest.mock("../../../../models/workspaceThread", () => ({
  WorkspaceThread: {
    defaultName: "New Thread",
    get: mockGetThread,
    update: mockUpdate,
  },
}));

jest.mock("../../../../models/workspace", () => ({
  Workspace: {
    get: mockGetWorkspace,
  },
}));

jest.mock("../../../../utils/helpers", () => ({
  resolveProviderConnector: jest.fn(),
}));

const { resolveProviderConnector } = require("../../../../utils/helpers");
const { WorkspaceThread } = require("../../../../models/workspaceThread");
const { Workspace } = require("../../../../models/workspace");
const generateTitleJob = require("../../../../utils/backgroundJobs/jobs/generateTitle");

describe("generateTitleJob", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetThread.mockResolvedValue({ id: 1, name: "New Thread" });
    mockGetWorkspace.mockResolvedValue({ id: 1, slug: "default" });
    resolveProviderConnector.mockResolvedValue({
      connector: {
        getChatCompletion: mockGetChatCompletion,
      },
    });
  });

  test("generates a clean title from LLM response", async () => {
    mockGetChatCompletion.mockResolvedValue({
      textResponse: "  \"OpenSIN Chat Overview\"  ",
    });

    await generateTitleJob({
      threadId: 1,
      workspaceSlug: "default",
      prompt: "Was ist OpenSIN-AI?",
      response: "OpenSIN-AI ist ein KI-Arbeitsraum.",
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.objectContaining({ name: "OpenSIN Chat Overview" }),
    );
  });

  test("extracts the last line from reasoning model output", async () => {
    mockGetChatCompletion.mockResolvedValue({
      textResponse:
        "We are asked: Return ONLY a concise 3-5 word title.\nThe user asked about AfD energy policy.\nAfD Energy Policy Summary",
    });

    await generateTitleJob({
      threadId: 1,
      workspaceSlug: "default",
      prompt: "Was ist die Energiepolitik der AfD?",
      response: "Die AfD setzt sich für bezahlbare Energie ein.",
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.objectContaining({ name: "AfD Energy Policy Summary" }),
    );
  });

  test("extracts title from inline reasoning with literal newline escapes", async () => {
    mockGetChatCompletion.mockResolvedValue({
      textResponse:
        "We are asked: Return ONLY a concise 3-5 word title.\\n\\nThe user asked about AfD energy policy.\\n\\nAfD Energy Policy Summary",
    });

    await generateTitleJob({
      threadId: 1,
      workspaceSlug: "default",
      prompt: "Was ist die Energiepolitik der AfD?",
      response: "Die AfD setzt sich für bezahlbare Energie ein.",
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.objectContaining({ name: "AfD Energy Policy Summary" }),
    );
  });

  test("finds a valid title earlier when the last line is garbage", async () => {
    mockGetChatCompletion.mockResolvedValue({
      textResponse:
        "We need to generate a concise 3-5 word title\nAfD Energy Policy Summary\nWe need to generate a",
    });

    await generateTitleJob({
      threadId: 1,
      workspaceSlug: "default",
      prompt: "Was ist die Energiepolitik der AfD?",
      response: "Die AfD setzt sich für bezahlbare Energie ein.",
    });

    // Last line contains the echo marker, so we should walk back and pick
    // "AfD Energy Policy Summary".
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.objectContaining({ name: "AfD Energy Policy Summary" }),
    );
  });

  test("falls back to truncated user prompt when LLM echoes instructions", async () => {
    mockGetChatCompletion.mockResolvedValue({
      textResponse:
        "You are a title assistant. Generate a very short, concise thread title maximum 5 words",
    });

    await generateTitleJob({
      threadId: 1,
      workspaceSlug: "default",
      prompt: "Erkläre mir die Energiepolitik der AfD",
      response: "Die AfD setzt sich für bezahlbare Energie ein.",
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.objectContaining({ name: "Erkläre mir die Energiepolitik der" }),
    );
  });

  test("limits title to 5 words and 40 characters", async () => {
    mockGetChatCompletion.mockResolvedValue({
      textResponse:
        "Dies ist ein viel zu langer Titel der mehr als fünf Wörter enthält und auch sehr viele Zeichen hat",
    });

    await generateTitleJob({
      threadId: 1,
      workspaceSlug: "default",
      prompt: "Hallo",
      response: "Hallo! Wie kann ich dir helfen?",
    });

    const title = mockUpdate.mock.calls[0][1].name;
    expect(title.split(/\s+/).length).toBeLessThanOrEqual(5);
    expect(title.length).toBeLessThanOrEqual(40);
  });

  test("throws on missing payload fields", async () => {
    await expect(generateTitleJob({})).rejects.toThrow(
      "Missing required payload fields",
    );
  });

  test("throws when thread is not found", async () => {
    mockGetThread.mockResolvedValue(null);
    await expect(
      generateTitleJob({
        threadId: 999,
        workspaceSlug: "default",
        prompt: "Hallo",
        response: "Hallo!",
      }),
    ).rejects.toThrow("Thread 999 not found");
  });
});
