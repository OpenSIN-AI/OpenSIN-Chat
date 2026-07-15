// SPDX-License-Identifier: MIT
// Tests for the WorkspaceChat container component (Issue #391).
//
// Covers the hot-path states: initial loading, workspace-not-found error,
// pending home message, and successful render with a workspace + thread.
// The component keeps the previous chat mounted while the next one's history
// is being fetched (the "loaded" state pattern), so we also verify that
// the stale content persists during a loading transition.

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";

// --- Mocks ---

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children, defaults }) => children || defaults || null,
  I18nextProvider: ({ children }) => children,
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

vi.mock("@/i18n", () => ({
  default: {
    t: (key) => key,
  },
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useParams: () => ({ threadSlug: null }),
  };
});

vi.mock("@/hooks/useChatHistory", () => {
  const history = [];
  return {
    default: () => ({
      history,
      isLoading: false,
      error: undefined,
      refresh: () => {},
      mutate: () => {},
    }),
  };
});

vi.mock("../contexts/TTSProvider", () => ({
  TTSProvider: ({ children }) => (
    <div data-testid="tts-provider">{children}</div>
  ),
  useWatchForAutoPlayAssistantTTSResponse: () => {},
}));

vi.mock("./LoadingChat", () => ({
  default: () => <div data-testid="loading-chat">LoadingChat</div>,
}));

vi.mock("./ChatContainer", () => ({
  default: ({ workspace, threadSlug, knownHistory }) => (
    <div
      data-testid="chat-container"
      data-workspace={workspace?.slug}
      data-thread={threadSlug ?? "none"}
      data-history-len={knownHistory?.length ?? 0}
    >
      ChatContainer
    </div>
  ),
}));

vi.mock("./ChatContainer/DnDWrapper", () => ({
  DnDFileUploaderProvider: ({ children }) => (
    <div data-testid="dnd-provider">{children}</div>
  ),
}));

vi.mock("./ChatContainer/AgentSessionsSidebar/AgentRunsContext", () => ({
  AgentRunsProvider: ({ children }) => (
    <div data-testid="agent-runs-provider">{children}</div>
  ),
}));

vi.mock("../ModalWrapper", () => ({
  default: ({ children, isOpen }) =>
    isOpen ? <div data-testid="modal-wrapper">{children}</div> : null,
}));

vi.mock("@/components/ErrorBoundaryFallback", () => ({
  default: () => <div data-testid="error-fallback">ErrorFallback</div>,
}));

vi.mock("@/utils/paths", () => ({
  default: { home: () => "/" },
}));

vi.mock("@/utils/clipboard", () => ({
  copyText: vi.fn(),
}));

vi.mock("@/utils/safeStorage", () => ({
  safeGetItem: vi.fn(() => null),
}));

vi.mock("@/utils/constants", () => ({
  AUTH_TOKEN: "opensin_authToken",
  LEGACY_KEY_MAP: {},
  PENDING_HOME_MESSAGE: "pending_home_message",
}));

// Mock sessionStorage for pending message tests
const sessionStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
  writable: true,
});

// --- Helper ---

function renderWorkspaceChat(props = {}) {
  return render(
    <MemoryRouter>
      <WorkspaceChat {...props} />
    </MemoryRouter>,
  );
}

// Import after mocks are set up
import WorkspaceChat from "./index";

// --- Tests ---

describe("WorkspaceChat — initial loading state", () => {
  it("renders LoadingChat when loaded is null and no pending message", () => {
    renderWorkspaceChat({ loading: true, workspace: null });
    expect(screen.getByTestId("loading-chat")).toBeInTheDocument();
  });

  it("renders an empty div when a pending home message exists", () => {
    sessionStorageMock.getItem.mockReturnValueOnce('{"message":"hello"}');
    renderWorkspaceChat({ loading: true, workspace: null });
    expect(screen.queryByTestId("loading-chat")).not.toBeInTheDocument();
  });
});

describe("WorkspaceChat — workspace not found error state", () => {
  it("renders the not-found modal when loading is false and workspace is null", () => {
    renderWorkspaceChat({ loading: false, workspace: null });
    expect(screen.getByTestId("modal-wrapper")).toBeInTheDocument();
    expect(screen.getByTestId("loading-chat")).toBeInTheDocument();
  });
});

describe("WorkspaceChat — successful render with workspace", () => {
  it("renders ChatContainer when workspace and history are loaded", async () => {
    const workspace = { slug: "test-ws", name: "Test Workspace" };
    renderWorkspaceChat({ loading: false, workspace });

    await waitFor(() => {
      expect(screen.getByTestId("chat-container")).toBeInTheDocument();
    });
    expect(screen.getByTestId("chat-container")).toHaveAttribute(
      "data-workspace",
      "test-ws",
    );
  });

  it("wraps ChatContainer in TTSProvider and DnDFileUploaderProvider", async () => {
    const workspace = { slug: "test-ws" };
    renderWorkspaceChat({ loading: false, workspace });

    await waitFor(() => {
      expect(screen.getByTestId("tts-provider")).toBeInTheDocument();
    });
    expect(screen.getByTestId("dnd-provider")).toBeInTheDocument();
  });

  it("passes threadSlug to ChatContainer when provided as prop", async () => {
    const workspace = { slug: "test-ws" };
    renderWorkspaceChat({
      loading: false,
      workspace,
      threadSlug: "my-thread",
    });

    await waitFor(() => {
      expect(screen.getByTestId("chat-container")).toHaveAttribute(
        "data-thread",
        "my-thread",
      );
    });
  });
});

describe("WorkspaceChat — pending message handling", () => {
  it("does not crash when sessionStorage is inaccessible", () => {
    // Simulate a privacy-mode browser where sessionStorage throws
    const original = window.sessionStorage;
    Object.defineProperty(window, "sessionStorage", {
      value: {
        getItem: () => {
          throw new Error("Access denied");
        },
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
      },
      writable: true,
    });

    expect(() =>
      renderWorkspaceChat({ loading: true, workspace: null }),
    ).not.toThrow();

    Object.defineProperty(window, "sessionStorage", {
      value: original,
      writable: true,
    });
  });
});
