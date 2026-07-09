// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock(
  "@/pages/WorkspaceSettings/ChatSettings/WorkspaceLLMSelection/ChatModelSelection",
  () => ({
    default: ({ provider, workspace, setHasChanges }) => (
      <div data-testid="chat-model-selection" data-provider={provider}>
        Model Selection
      </div>
    ),
  }),
);

vi.mock(
  "@/pages/WorkspaceSettings/ChatSettings/WorkspaceLLMSelection/RouterSelection",
  () => ({
    default: ({ workspace, setHasChanges }) => (
      <div data-testid="router-selection">Router Selection</div>
    ),
  }),
);

import ModelSelector from "./index";

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("ModelSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders RouterSelection when selectedLLM is opensin-router", () => {
    renderWithRouter(
      <ModelSelector
        selectedLLM="opensin-router"
        workspace={{}}
        setHasChanges={vi.fn()}
      />,
    );
    expect(screen.getByTestId("router-selection")).toBeInTheDocument();
  });

  it("returns null when selectedLLM is default", () => {
    const { container } = renderWithRouter(
      <ModelSelector
        selectedLLM="default"
        workspace={{}}
        setHasChanges={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows multi-model not supported message for huggingface", () => {
    renderWithRouter(
      <ModelSelector
        selectedLLM="huggingface"
        workspace={{}}
        setHasChanges={vi.fn()}
      />,
    );
    expect(screen.getByText(/not supported/i)).toBeInTheDocument();
  });

  it("renders free-form input for bedrock", () => {
    renderWithRouter(
      <ModelSelector
        selectedLLM="bedrock"
        workspace={{ chatModel: "my-model" }}
        setHasChanges={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Model")).toBeInTheDocument();
  });

  it("renders ChatModelSelection for other providers", () => {
    renderWithRouter(
      <ModelSelector
        selectedLLM="openai"
        workspace={{}}
        setHasChanges={vi.fn()}
      />,
    );
    expect(screen.getByTestId("chat-model-selection")).toBeInTheDocument();
    expect(screen.getByTestId("chat-model-selection")).toHaveAttribute(
      "data-provider",
      "openai",
    );
  });

  it("passes workspace chatModel as default value for bedrock", () => {
    renderWithRouter(
      <ModelSelector
        selectedLLM="bedrock"
        workspace={{ chatModel: "claude-v2" }}
        setHasChanges={vi.fn()}
      />,
    );
    const input = screen.getByLabelText("Model");
    expect(input).toHaveValue("claude-v2");
  });
});
