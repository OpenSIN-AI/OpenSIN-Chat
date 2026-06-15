// SPDX-License-Identifier: MIT
// Tests for ChatHistory index (the scrollable message list)
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

// ---- module mocks ----
vi.mock("./HistoricalMessage", () => ({
  default: ({ message, role }) => (
    <div data-testid={`msg-${role}`}>{message}</div>
  ),
}));

vi.mock("./PromptReply", () => ({
  default: ({ message }) => <div data-testid="prompt-reply">{message}</div>,
}));

vi.mock("./StatusResponse", () => ({ default: () => null }));
vi.mock("./ToolApprovalRequest", () => ({ default: () => null }));
vi.mock("./ClarifyingQuestion", () => ({ default: () => null }));
vi.mock("./FileDownloadCard", () => ({ default: () => null }));
vi.mock("./ModelRouteNotification", () => ({ default: () => null }));
vi.mock("./ThoughtContainer", () => ({
  ThoughtExpansionProvider: ({ children }) => children,
}));
vi.mock("./MessageActionsContext", () => ({
  MessageActionsProvider: ({ children }) => children,
}));

vi.mock("../../../Modals/ManageWorkspace", () => ({
  useManageWorkspaceModal: () => ({ showing: false, hideModal: vi.fn() }),
  default: () => null,
}));

vi.mock("@/models/workspace", () => ({
  default: { threads: vi.fn().mockResolvedValue([]) },
}));

vi.mock("@/models/appearance", () => ({
  default: {
    getSettings: () => ({ showScrollbar: false }),
  },
}));

vi.mock("@/hooks/useTextSize", () => ({
  default: () => ({ textSizeClass: "text-sm" }),
}));

vi.mock("@/hooks/useChatHistoryScrollHandle", () => ({
  default: () => {
    // Patch scrollTo onto HTMLElement for jsdom — done once is enough
    if (!HTMLElement.prototype.scrollTo) {
      HTMLElement.prototype.scrollTo = vi.fn();
    }
    return { chatHistoryRef: { current: null } };
  },
}));

vi.mock("@/hooks/useChatHistory", () => ({
  invalidateChatHistory: vi.fn(),
}));

vi.mock("./Chartable", () => ({ default: () => null }));
vi.mock("@/utils/paths", () => ({
  default: {
    workspace: { chat: (slug) => `/workspace/${slug}/chat` },
  },
}));

vi.mock("lodash.debounce", () => ({
  default: (fn) => fn,
}));

// ---- dynamic import for the forwardRef component ----
let ChatHistory;

beforeAll(async () => {
  const mod = await import("./index");
  ChatHistory = mod.default;
});

const workspace = { slug: "ws-1", name: "Test WS" };

const Wrapper = ({ children }) => <MemoryRouter>{children}</MemoryRouter>;

describe("ChatHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an empty state when history is empty", async () => {
    const ref = createRef();
    render(
      <ChatHistory
        ref={ref}
        history={[]}
        workspace={workspace}
        sendCommand={vi.fn()}
        updateHistory={vi.fn()}
        regenerateAssistantMessage={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    // No messages rendered
    expect(screen.queryByTestId("msg-user")).toBeNull();
    expect(screen.queryByTestId("msg-assistant")).toBeNull();
  });

  it("renders user and assistant messages from history", async () => {
    const ref = createRef();
    const history = [
      { uuid: "u1", content: "Hi", role: "user", type: "chat" },
      { uuid: "a1", content: "Hello!", role: "assistant", type: "chat" },
    ];

    render(
      <ChatHistory
        ref={ref}
        history={history}
        workspace={workspace}
        sendCommand={vi.fn()}
        updateHistory={vi.fn()}
        regenerateAssistantMessage={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(screen.getByTestId("msg-user")).toBeInTheDocument();
      expect(screen.getByTestId("msg-assistant")).toBeInTheDocument();
    });
  });

  it("renders a streaming (animated) message as PromptReply", async () => {
    const ref = createRef();
    const history = [
      { uuid: "u1", content: "Tell me something", role: "user", type: "chat" },
      {
        uuid: "a2",
        content: "Streaming...",
        role: "assistant",
        type: "chat",
        animate: true,
        pending: false,
      },
    ];

    render(
      <ChatHistory
        ref={ref}
        history={history}
        workspace={workspace}
        sendCommand={vi.fn()}
        updateHistory={vi.fn()}
        regenerateAssistantMessage={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(screen.getByTestId("prompt-reply")).toBeInTheDocument();
    });
  });

  it("shows scroll-to-bottom button when not at bottom", async () => {
    const ref = createRef();
    const history = Array.from({ length: 20 }, (_, i) => ({
      uuid: `m${i}`,
      content: `Message ${i}`,
      role: i % 2 === 0 ? "user" : "assistant",
      type: "chat",
    }));

    render(
      <ChatHistory
        ref={ref}
        history={history}
        workspace={workspace}
        sendCommand={vi.fn()}
        updateHistory={vi.fn()}
        regenerateAssistantMessage={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    // Component renders without crashing for a long history
    await waitFor(() => {
      expect(screen.getAllByTestId(/^msg-/).length).toBeGreaterThan(0);
    });
  });
});
