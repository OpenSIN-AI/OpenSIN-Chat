// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AgentSessionButton from "./AgentSessionButton";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("react-tooltip", () => ({
  Tooltip: ({ id }) => <div data-testid={`tooltip-${id}`} />,
}));

describe("AgentSessionButton", () => {
  const sendCommand = vi.fn();
  const textareaRef = { current: { focus: vi.fn() } };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders when visible", () => {
    render(
      <AgentSessionButton
        sendCommand={sendCommand}
        promptInput=""
        textareaRef={textareaRef}
        visible={true}
      />,
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("returns null when not visible", () => {
    const { container } = render(
      <AgentSessionButton
        sendCommand={sendCommand}
        promptInput=""
        textareaRef={textareaRef}
        visible={false}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("prepends @agent when clicked", () => {
    render(
      <AgentSessionButton
        sendCommand={sendCommand}
        promptInput=""
        textareaRef={textareaRef}
        visible={true}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(sendCommand).toHaveBeenCalledWith({
      text: "@agent",
      writeMode: "prepend",
    });
  });

  it("does not prepend @agent when prompt already starts with @agent", () => {
    render(
      <AgentSessionButton
        sendCommand={sendCommand}
        promptInput="@agent do something"
        textareaRef={textareaRef}
        visible={true}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(sendCommand).not.toHaveBeenCalled();
  });

  it("focuses the textarea after click", () => {
    render(
      <AgentSessionButton
        sendCommand={sendCommand}
        promptInput=""
        textareaRef={textareaRef}
        visible={true}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(textareaRef.current.focus).toHaveBeenCalled();
  });

  it("has an accessible aria-label", () => {
    render(
      <AgentSessionButton
        sendCommand={sendCommand}
        promptInput=""
        textareaRef={textareaRef}
        visible={true}
      />,
    );
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Start Agent Session",
    );
  });
});
