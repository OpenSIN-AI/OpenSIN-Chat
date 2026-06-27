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

  it("renders the greeting and prompt input", () => {
    renderEmptyState();
    expect(screen.getByText("How can I help you today?")).toBeInTheDocument();
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

  it("renders workspace sources and suggested messages", () => {
    renderEmptyState();
    expect(screen.getByTestId("workspace-sources")).toHaveAttribute(
      "data-documents",
      "2",
    );
    expect(screen.getByTestId("suggested-messages")).toHaveAttribute(
      "data-count",
      "2",
    );
  });

  it("handles a workspace with no documents or suggested messages", () => {
    renderEmptyState({ workspace: { slug: "empty" } });
    expect(screen.getByTestId("workspace-sources")).toHaveAttribute(
      "data-documents",
      "0",
    );
    expect(screen.getByTestId("suggested-messages")).toHaveAttribute(
      "data-count",
      "0",
    );
  });
});
