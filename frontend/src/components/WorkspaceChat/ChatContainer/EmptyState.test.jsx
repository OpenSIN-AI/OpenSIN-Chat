// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useTranslation } from "react-i18next";
import EmptyState from "./EmptyState";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

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

vi.mock("./PromptInput/AgentSessionButton", () => ({
  default: () => <button data-testid="agent-session-btn">Agent</button>,
}));

vi.mock("./PromptInput/AgentModeButton", () => ({
  default: () => <button data-testid="agent-mode-btn">Agent Mode</button>,
  useAgentMode: () => ({
    activeMode: null,
    showDropdown: false,
    setShowDropdown: vi.fn(),
    buttonRef: { current: null },
    dropdownRef: { current: null },
    selectMode: vi.fn(),
    clearMode: vi.fn(),
  }),
}));

vi.mock("@/components/lib/WorkspaceSources", () => ({
  default: ({ documents }) => (
    <div data-testid="workspace-sources" data-documents={documents.length}>
      WorkspaceSources
    </div>
  ),
}));

vi.mock("@/components/lib/SuggestedMessages", () => ({
  default: ({ suggestedMessages }) => (
    <div
      data-testid="suggested-messages"
      data-count={String(suggestedMessages?.length || 0)}
    >
      SuggestedMessages
    </div>
  ),
}));

vi.mock("./ChatSidebar", () => ({
  useChatSidebar: () => ({ toggleSidebar: vi.fn() }),
}));

describe("EmptyState", () => {
  const workspace = {
    slug: "test-workspace",
    documents: [{ id: 1 }, { id: 2 }],
    suggestedMessages: ["Hello", "How are you?"],
  };
  const handleSubmit = vi.fn();
  const sendCommand = vi.fn();

  function renderEmptyState(props = {}) {
    function Wrapper() {
      const { t } = useTranslation();
      return (
        <EmptyState
          workspace={workspace}
          handleSubmit={handleSubmit}
          sendCommand={sendCommand}
          loadingResponse={false}
          files={[]}
          t={t}
          {...props}
        />
      );
    }
    return render(<Wrapper />);
  }

  it("renders the translated welcome region and prompt input", () => {
    renderEmptyState();
    expect(
      screen.getByRole("region", { name: "How can I help you today?" }),
    ).toBeInTheDocument();
    expect(screen.getByText("OpenSIN Intelligence")).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Workspace shortcuts" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("prompt-input")).toBeInTheDocument();
  });

  it("passes the workspace to prompt input", () => {
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

  it("renders capability cards for workspace with documents", () => {
    renderEmptyState();
    const buttons = screen.getAllByRole("button");
    const capabilityButtons = buttons.filter(
      (b) => !b.hasAttribute("data-testid"),
    );
    expect(capabilityButtons.length).toBeGreaterThanOrEqual(4);
  });

  it("handles a workspace with no documents or suggested messages", () => {
    renderEmptyState({ workspace: { slug: "empty" } });
    expect(screen.getByTestId("prompt-input")).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    const capabilityButtons = buttons.filter(
      (b) => !b.hasAttribute("data-testid"),
    );
    expect(capabilityButtons.length).toBeGreaterThanOrEqual(4);
  });
});
