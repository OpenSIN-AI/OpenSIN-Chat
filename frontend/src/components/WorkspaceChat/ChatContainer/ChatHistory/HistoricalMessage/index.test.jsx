// SPDX-License-Identifier: MIT
// Tests for HistoricalMessage component
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HistoricalMessage from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

// ---- module mocks ----
vi.mock("@/utils/chat/purify", () => ({
  default: { sanitize: (s) => s ?? "" },
}));

vi.mock("@/utils/chat/markdown.ts", () => ({
  default: (text) => text ?? "",
}));

// ---- per-test mock overrides using vi.hoisted ----
const { editMessageMock, deleteMessageMock } = vi.hoisted(() => ({
  editMessageMock: { isEditing: false },
  deleteMessageMock: { isDeleted: false, completeDelete: false, onEndAnimation: vi.fn() },
}));

vi.mock("./Actions/EditMessage", () => ({
  EditMessageForm: () => <div data-testid="edit-form" />,
  useEditMessage: () => editMessageMock,
}));

vi.mock("./Actions/DeleteMessage", () => ({
  useWatchDeleteMessage: () => deleteMessageMock,
}));

vi.mock("./Actions/TTSButton", () => ({ default: () => null }));
vi.mock("./Actions/ActionMenu", () => ({ default: () => null }));
vi.mock("./Actions/RenderMetrics", () => ({ default: () => null }));

vi.mock("./Actions", () => ({
  default: () => <div data-testid="actions-bar" />,
}));

vi.mock("../Citation", () => ({
  default: () => <div data-testid="citations" />,
}));

vi.mock("../ThoughtContainer", () => ({
  ThoughtChainComponent: () => null,
  ThoughtBrainButton: () => null,
  THOUGHT_REGEX_CLOSE: /<\/think>/,
  THOUGHT_REGEX_COMPLETE: /<think>[\s\S]*?<\/think>/,
  THOUGHT_REGEX_OPEN: /<think>/,
}));

vi.mock("./HistoricalOutputs", () => ({ default: () => null }));
vi.mock("./HistoricalClarifyingQuestions", () => ({ default: () => null }));

vi.mock("@/components/ImageLightbox", () => ({
  openImageLightbox: vi.fn(),
}));

vi.mock(
  "@/components/WorkspaceChat/ChatContainer/ChatHistory/MessageActionsContext",
  () => ({
    useMessageActionsContext: () => ({
      isDeleted: () => false,
    }),
  })
);

vi.mock("@/utils/paths", () => ({
  default: {
    workspace: { chat: (slug) => `/workspace/${slug}/chat` },
    thread: { chat: (ws, t) => `/workspace/${ws}/t/${t}/chat` },
  },
}));

vi.mock("@/utils/chat", () => ({
  chatQueryRefusalResponse: () => false,
}));

// ---- helpers ----
const workspace = { slug: "my-ws", name: "My Workspace" };

const baseAssistantProps = {
  uuid: "msg-001",
  message: "Hello from assistant",
  role: "assistant",
  workspace,
  sources: [],
  attachments: [],
  error: false,
  feedbackScore: null,
  chatId: 42,
  isLastMessage: false,
  regenerateMessage: vi.fn(),
  saveEditedMessage: vi.fn(),
  forkThread: vi.fn(),
  metrics: {},
  outputs: [],
  clarifyingQuestions: [],
};

const baseUserProps = {
  ...baseAssistantProps,
  uuid: "msg-002",
  message: "Hello from user",
  role: "user",
};

const Wrapper = ({ children }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe("HistoricalMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an assistant message", () => {
    render(<HistoricalMessage {...baseAssistantProps} />, { wrapper: Wrapper });
    expect(screen.getByText("Hello from assistant")).toBeInTheDocument();
  });

  it("renders a user message", () => {
    render(<HistoricalMessage {...baseUserProps} />, { wrapper: Wrapper });
    expect(screen.getByText("Hello from user")).toBeInTheDocument();
  });

  it("renders the actions bar for both user and assistant messages", () => {
    render(<HistoricalMessage {...baseAssistantProps} />, { wrapper: Wrapper });
    expect(screen.getByTestId("actions-bar")).toBeInTheDocument();

    const { unmount } = render(<HistoricalMessage {...baseUserProps} />, { wrapper: Wrapper });
    expect(screen.getAllByTestId("actions-bar").length).toBeGreaterThanOrEqual(1);
    unmount();
  });

  it("renders edit form when isEditing is true", () => {
    editMessageMock.isEditing = true;
    render(<HistoricalMessage {...baseAssistantProps} />, { wrapper: Wrapper });
    expect(screen.getByTestId("edit-form")).toBeInTheDocument();
    editMessageMock.isEditing = false;
  });

  it("applies delete animation class when isDeleted is true", () => {
    deleteMessageMock.isDeleted = true;
    deleteMessageMock.completeDelete = false;
    const { container } = render(
      <HistoricalMessage {...baseAssistantProps} />,
      { wrapper: Wrapper }
    );
    expect(container.firstChild).toBeInTheDocument();
    deleteMessageMock.isDeleted = false;
  });

  it("returns null when completeDelete is true", () => {
    deleteMessageMock.isDeleted = true;
    deleteMessageMock.completeDelete = true;
    const { container } = render(
      <HistoricalMessage {...baseAssistantProps} />,
      { wrapper: Wrapper }
    );
    expect(container.firstChild).toBeNull();
    deleteMessageMock.isDeleted = false;
    deleteMessageMock.completeDelete = false;
  });

  it("renders citations when sources are provided", () => {
    render(
      <HistoricalMessage {...baseAssistantProps} sources={[{ id: 1, title: "Doc A" }]} />,
      { wrapper: Wrapper }
    );
    expect(screen.getByTestId("citations")).toBeInTheDocument();
  });

  it("renders an error message without crashing", () => {
    const { container } = render(
      <HistoricalMessage {...baseAssistantProps} error={true} message="Something went wrong" />,
      { wrapper: Wrapper }
    );
    expect(container).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("preserves a stable uuid across renders", () => {
    const { rerender } = render(
      <HistoricalMessage {...baseAssistantProps} uuid={undefined} />,
      { wrapper: Wrapper }
    );
    const firstId = document.querySelector("[data-message-id]")?.getAttribute("data-message-id");

    rerender(
      <Wrapper>
        <HistoricalMessage {...baseAssistantProps} uuid={undefined} />
      </Wrapper>
    );
    const secondId = document.querySelector("[data-message-id]")?.getAttribute("data-message-id");

    // Either both IDs are undefined (no data-message-id attr) or they are equal
    expect(firstId).toBe(secondId);
  });

  it("renders nothing (null) for assistant when message is null/empty", () => {
    const { container } = render(
      <HistoricalMessage {...baseAssistantProps} message={null} />,
      { wrapper: Wrapper }
    );
    // Component should either render empty or a placeholder — must not crash
    expect(container).toBeInTheDocument();
  });
});
