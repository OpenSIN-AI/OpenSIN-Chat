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

vi.mock("@/features/notebook/NotebookQuickActions", () => ({
  default: ({ mode, onSelect }) => (
    <div data-testid="notebook-quick-actions" data-mode={mode}>
      <button onClick={() => onSelect("test-prompt")}>Zusammenfassen</button>
    </div>
  ),
}));

vi.mock("@/features/notebook/useNotebookMode", () => ({
  default: () => ({
    modeId: "chat",
    mode: {
      id: "chat",
      label: "Chat",
      description: "",
      placeholder: "",
      allowsSources: true,
      allowsWeb: true,
      allowsActions: false,
      allowsCodeRunners: false,
    },
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

  it("renders a plain chat welcome instead of a dashboard", () => {
    renderEmptyState();
    expect(
      screen.getByRole("heading", { name: /Womit kann ich helfen/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Schreib eine Nachricht oder füge bei Bedarf/i),
    ).toBeInTheDocument();
  });

  it("does not duplicate the composer mode selector or sources panel", () => {
    renderEmptyState();
    expect(screen.queryByTestId("notebook-mode-cards")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("recent-notebook-sources"),
    ).not.toBeInTheDocument();
  });

  it("keeps concise optional suggestions", () => {
    renderEmptyState();
    expect(screen.getByTestId("notebook-quick-actions")).toHaveAttribute(
      "data-mode",
      "chat",
    );
    expect(screen.getByText("Zusammenfassen")).toBeInTheDocument();
  });

  it("passes workspace and centered layout to the prompt input", () => {
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

  it("passes streaming state to the prompt input", () => {
    renderEmptyState({ loadingResponse: true });
    expect(screen.getByTestId("prompt-input")).toHaveAttribute(
      "data-streaming",
      "true",
    );
  });

  it("uses a product-neutral safety note", () => {
    renderEmptyState();
    expect(screen.getByText(/KI kann Fehler machen/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/OpenSIN kann Fehler machen/i),
    ).not.toBeInTheDocument();
  });
});
