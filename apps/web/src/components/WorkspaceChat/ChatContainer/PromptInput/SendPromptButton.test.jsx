// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SendPromptButton from "./SendPromptButton";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("react-tooltip", () => ({
  Tooltip: ({ id }) => <div data-testid={`tooltip-${id}`} />,
}));

describe("SendPromptButton", () => {
  const formRef = { current: null };

  it("renders as enabled when input is not empty and not disabled", () => {
    render(
      <SendPromptButton
        formRef={formRef}
        promptInput="Hello"
        isDisabled={false}
      />,
    );
    const button = screen.getByRole("button");
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute("type", "submit");
  });

  it("renders as disabled when input is empty", () => {
    render(
      <SendPromptButton formRef={formRef} promptInput="" isDisabled={false} />,
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("renders as disabled when input only contains whitespace", () => {
    render(
      <SendPromptButton
        formRef={formRef}
        promptInput="   "
        isDisabled={false}
      />,
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("renders as disabled when isDisabled is true", () => {
    render(
      <SendPromptButton
        formRef={formRef}
        promptInput="Hello"
        isDisabled={true}
      />,
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("has an accessible aria-label", () => {
    render(
      <SendPromptButton
        formRef={formRef}
        promptInput="Hello"
        isDisabled={false}
      />,
    );
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Send prompt message to workspace",
    );
  });

  it("renders a tooltip for the send button", () => {
    render(
      <SendPromptButton
        formRef={formRef}
        promptInput="Hello"
        isDisabled={false}
      />,
    );
    expect(screen.getByTestId("tooltip-send-prompt")).toBeInTheDocument();
  });
});
