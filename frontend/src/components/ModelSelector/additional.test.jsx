// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

describe("ModelSelector additional tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes setHasChanges to ChatModelSelection", () => {
    const setHasChanges = vi.fn();
    renderWithRouter(
      <ModelSelector
        selectedLLM="openai"
        workspace={{}}
        setHasChanges={setHasChanges}
      />,
    );
    expect(screen.getByTestId("chat-model-selection")).toBeInTheDocument();
  });

  it("passes setHasChanges to RouterSelection for opensin-router", () => {
    const setHasChanges = vi.fn();
    renderWithRouter(
      <ModelSelector
        selectedLLM="opensin-router"
        workspace={{}}
        setHasChanges={setHasChanges}
      />,
    );
    expect(screen.getByTestId("router-selection")).toBeInTheDocument();
  });

  it("renders system model link for huggingface", () => {
    renderWithRouter(
      <ModelSelector
        selectedLLM="huggingface"
        workspace={{}}
        setHasChanges={vi.fn()}
      />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/settings/llm-preference");
  });

  it("calls setHasChanges when bedrock input changes", () => {
    const setHasChanges = vi.fn();
    renderWithRouter(
      <ModelSelector
        selectedLLM="bedrock"
        workspace={{ chatModel: "" }}
        setHasChanges={setHasChanges}
      />,
    );
    const input = screen.getByLabelText("Model");
    fireEvent.change(input, { target: { value: "new-model" } });
    expect(setHasChanges).toHaveBeenCalledWith(true);
  });

  it("renders with empty workspace object", () => {
    renderWithRouter(
      <ModelSelector
        selectedLLM="openai"
        workspace={{}}
        setHasChanges={vi.fn()}
      />,
    );
    expect(screen.getByTestId("chat-model-selection")).toBeInTheDocument();
  });

  it("renders with undefined workspace for bedrock", () => {
    renderWithRouter(
      <ModelSelector
        selectedLLM="bedrock"
        workspace={undefined}
        setHasChanges={vi.fn()}
      />,
    );
    const input = screen.getByLabelText("Model");
    expect(input).toHaveValue("");
  });
});
