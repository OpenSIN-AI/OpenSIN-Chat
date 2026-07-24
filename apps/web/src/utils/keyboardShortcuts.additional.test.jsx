// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

import { KeyboardShortcutWrapper } from "./keyboardShortcuts";

// Mock userFromStorage so the hook doesn't try to read localStorage
vi.mock("@/utils/request", () => ({
  userFromStorage: vi.fn(() => null),
}));

// Mock the LLMSelector action event
vi.mock(
  "@/components/WorkspaceChat/ChatContainer/PromptInput/LLMSelector/action",
  () => ({
    TOGGLE_LLM_SELECTOR_EVENT: "toggle-llm-selector",
  }),
);

// Mock paths
vi.mock("./paths", () => ({
  default: {
    home: () => "/",
    settings: {
      interface: () => "/settings/interface",
      workspaces: () => "/settings/workspaces",
      apiKeys: () => "/settings/api-keys",
      llmPreference: () => "/settings/llm-preference",
      chat: () => "/settings/chat",
    },
  },
}));

describe("keyboardShortcuts utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("KeyboardShortcutWrapper renders children", () => {
    render(
      <KeyboardShortcutWrapper>
        <div data-testid="child">Child content</div>
      </KeyboardShortcutWrapper>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("KeyboardShortcutWrapper renders multiple children", () => {
    render(
      <KeyboardShortcutWrapper>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
      </KeyboardShortcutWrapper>,
    );
    expect(screen.getByTestId("child-1")).toBeInTheDocument();
    expect(screen.getByTestId("child-2")).toBeInTheDocument();
  });
});
