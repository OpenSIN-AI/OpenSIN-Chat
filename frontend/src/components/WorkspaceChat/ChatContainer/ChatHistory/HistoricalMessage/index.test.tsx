// SPDX-License-Identifier: MIT
// Tests for HistoricalMessage component — user and assistant message rendering.
// Issue #391
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
  default: { sanitize: (s: string) => s ?? "" },
}));

vi.mock("@/utils/chat/markdown.ts", () => ({
  default: (text: string) => text ?? "",
}));

// ---- per-test mock overrides using vi.hoisted ----
const { editMessageMock, deleteMessageMock } = vi.hoisted(() => ({
  editMessageMock: { isEditing: false },
  deleteMessageMock: {
    isDeleted: false,
    completeDelete: false,
    onEndAnimation: vi.fn(),
  },
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
  }),
);

vi.mock("@/utils/paths", () => ({
  default: {
    workspace: { chat: (slug: string) => `/workspace/${slug}/chat` },
    thread: { chat: (ws: string, t: string) => `/workspace/${ws}/t/${t}/chat` },
  },
}));

vi.mock("./RenderChatContent", () => ({
  default: ({ message }: { message: string }) => <span>{message}</span>,
}));

vi.mock("@/utils/chat", () => ({
  chatQueryRefusalResponse: () => false,
  ABORT_STREAM_EVENT: "abort-chat-stream",
  default: vi.fn(),
}));

vi.mock("@/components/Sidebar/ActiveWorkspaces/ThreadContainer", () => ({
  THREAD_RENAME_EVENT: "thread-rename",
}));

vi.mock("@/components/contexts/TTSProvider", () => ({
  emitAssistantMessageCompleteEvent: vi.fn(),
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
  chatId: "42",
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

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe("HistoricalMessage – message rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an assistant message with its content", () => {
    render(<HistoricalMessage {...baseAssistantProps} />, { wrapper: Wrapper });
    expect(screen.getByText("Hello from assistant")).toBeInTheDocument();
  });

  it("renders a user message with its content", () => {
    render(<HistoricalMessage {...baseUserProps} />, { wrapper: Wrapper });
    expect(screen.getByText("Hello from user")).toBeInTheDocument();
  });

  it("renders different content for user vs assistant messages", () => {
    const { unmount: unmountAssistant } = render(
      <HistoricalMessage {...baseAssistantProps} />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText("Hello from assistant")).toBeInTheDocument();
    expect(screen.queryByText("Hello from user")).not.toBeInTheDocument();
    unmountAssistant();

    render(<HistoricalMessage {...baseUserProps} />, { wrapper: Wrapper });
    expect(screen.getByText("Hello from user")).toBeInTheDocument();
    expect(screen.queryByText("Hello from assistant")).not.toBeInTheDocument();
  });

  it("renders user message bubble with compact conversation styling", () => {
    const { container } = render(<HistoricalMessage {...baseUserProps} />, {
      wrapper: Wrapper,
    });
    const bubble = container.querySelector(".rounded-br-md");
    expect(bubble).toBeInTheDocument();
    expect(bubble?.className).toContain("rounded-2xl");
    expect(bubble?.className).toContain("bg-[var(--chat-user-bubble)]");
    expect(bubble?.className).toContain("text-[var(--chat-text)]");
  });

  it("renders assistant message without user bubble styling", () => {
    const { container } = render(
      <HistoricalMessage {...baseAssistantProps} />,
      {
        wrapper: Wrapper,
      },
    );
    // Assistant messages remain unboxed, unlike compact user bubbles.
    const userBubble = container.querySelector(".rounded-br-md");
    expect(userBubble).toBeNull();
  });

  it("renders both user and assistant messages with actions bar", () => {
    render(<HistoricalMessage {...baseAssistantProps} />, { wrapper: Wrapper });
    expect(screen.getByTestId("actions-bar")).toBeInTheDocument();
  });

  it("renders markdown content for assistant messages", () => {
    render(
      <HistoricalMessage
        {...baseAssistantProps}
        message="**Bold text** and *italic*"
      />,
      { wrapper: Wrapper },
    );
    // The RenderChatContent mock renders the raw message
    expect(screen.getByText("**Bold text** and *italic*")).toBeInTheDocument();
  });

  it("renders long user messages without truncation", () => {
    const longMessage = "A".repeat(500);
    render(<HistoricalMessage {...baseUserProps} message={longMessage} />, {
      wrapper: Wrapper,
    });
    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });

  it("does not crash when message is empty string", () => {
    const { container } = render(
      <HistoricalMessage {...baseAssistantProps} message="" />,
      { wrapper: Wrapper },
    );
    expect(container).toBeInTheDocument();
  });
});
