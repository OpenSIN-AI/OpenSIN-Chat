// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatTooltips } from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("react-tooltip", () => ({
  Tooltip: ({ id, content }) => (
    <div data-testid={`tooltip-${id}`} data-content={content} />
  ),
}));

vi.mock("react-dom", () => ({
  createPortal: (children) => children,
}));

describe("ChatTooltips", () => {
  it("renders all chat tooltip placeholders", () => {
    render(<ChatTooltips />);
    expect(screen.getByTestId("tooltip-message-to-speech")).toBeInTheDocument();
    expect(
      screen.getByTestId("tooltip-regenerate-assistant-text"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("tooltip-copy-assistant-text"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("tooltip-feedback-button")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip-action-menu")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip-edit-input-text")).toBeInTheDocument();
  });

  it("renders the agent skill disabled tooltip with translated content", () => {
    render(<ChatTooltips />);
    expect(
      screen.getByTestId("tooltip-agent-skill-disabled-tooltip"),
    ).toBeInTheDocument();
  });

  it("renders the document-level similarity tooltip", () => {
    render(<ChatTooltips />);
    expect(screen.getByTestId("tooltip-similarity-score")).toBeInTheDocument();
  });
});
