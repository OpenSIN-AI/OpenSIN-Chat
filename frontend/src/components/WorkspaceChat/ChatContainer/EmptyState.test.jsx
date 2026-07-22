// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import EmptyState from "./EmptyState";

vi.mock("./PromptInput", () => ({
  default: ({ workspace, isStreaming, attachments, centered }) => (
    <div
      data-testid="prompt-input"
      data-workspace={workspace?.slug}
      data-streaming={String(isStreaming)}
      data-centered={String(centered)}
      data-attachments={attachments?.length}
    >
      PromptInput
    </div>
  ),
}));

vi.mock("./ChatSidebar", () => ({
  useChatSidebar: () => ({
    openSidebar: vi.fn(),
  }),
}));

vi.mock("@/features/notebook/NotebookModeCards", () => ({
  default: ({ value, onChange }) => (
    <div data-testid="notebook-mode-cards" data-value={value}>
      <button role="radio" aria-checked={value === "chat"} aria-label="Chat" onClick={() => onChange("chat")}>Chat</button>
      <button role="radio" aria-checked={value === "work"} aria-label="Work" onClick={() => onChange("work")}>Work</button>
      <button role="radio" aria-checked={value === "code"} aria-label="Code" onClick={() => onChange("code")}>Code</button>
    </div>
  ),
}));

vi.mock("@/features/notebook/NotebookQuickActions", () => ({
  default: ({ mode, onSelect }) => (
    <div data-testid="notebook-quick-actions" data-mode={mode}>
      <button onClick={() => onSelect("test-prompt")}>Quellen zusammenfassen</button>
    </div>
  ),
}));

vi.mock("@/features/notebook/RecentNotebookSources", () => ({
  default: ({ workspace, onOpenSources }) => (
    <div data-testid="recent-notebook-sources">
      <button onClick={onOpenSources}>Quellen</button>
    </div>
  ),
}));

vi.mock("@/features/notebook/useNotebookMode", () => ({
  default: () => ({
    modeId: "chat",
    mode: { id: "chat", label: "Chat", description: "", placeholder: "", allowsSources: true, allowsWeb: true, allowsActions: false, allowsCodeRunners: false },
    setModeId: vi.fn(),
  }),
}));

describe("EmptyState", () => {
  const workspace = {
    slug: "test-workspace",
    documents: [{ id: 1 }, { id: 2 }],
  };
  const handleSubmit = vi.fn();
  const sendCommand = vi.fn();

  function renderEmptyState(props = {}) {
    return render(
      <EmptyState
        workspace={workspace}
        handleSubmit={handleSubmit}
        sendCommand={sendCommand}
        loadingResponse={false}
        files={[]}
        workspaceSlug={workspace.slug}
        threadSlug="thread-1"
        {...props}
      />,
    );
  }

  it("renders the welcome heading and mode cards", () => {
    renderEmptyState();
    expect(screen.getByRole("heading", { name: /Womit kann ich helfen/i })).toBeInTheDocument();
    expect(screen.getByTestId("notebook-mode-cards")).toBeInTheDocument();
  });

  it("renders Chat, Work, and Code radio buttons", () => {
    renderEmptyState();
    expect(screen.getByRole("radio", { name: /Chat/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Work/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Code/i })).toBeInTheDocument();
  });

  it("renders quick actions with default chat suggestions", () => {
    renderEmptyState();
    expect(screen.getByText("Quellen zusammenfassen")).toBeInTheDocument();
  });

  it("passes workspace to prompt input", () => {
    renderEmptyState();
    expect(screen.getByTestId("prompt-input")).toHaveAttribute(
      "data-workspace",
      "test-workspace",
    );
    expect(screen.getByTestId("prompt-input")).toHaveAttribute(
      "data-centered",
      "true",
    );
  });

  it("passes streaming state to prompt input", () => {
    renderEmptyState({ loadingResponse: true });
    expect(screen.getByTestId("prompt-input")).toHaveAttribute(
      "data-streaming",
      "true",
    );
  });

  it("renders recent sources section", () => {
    renderEmptyState();
    expect(screen.getByTestId("recent-notebook-sources")).toBeInTheDocument();
  });

  it("does not render model name in greeting", () => {
    renderEmptyState();
    expect(screen.queryByText(/openai\//i)).not.toBeInTheDocument();
    expect(screen.queryByText(/anthropic\//i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ollama\//i)).not.toBeInTheDocument();
  });
});
