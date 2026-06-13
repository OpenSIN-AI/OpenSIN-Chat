// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ToolsButton from "./ToolsButton";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

describe("ToolsButton", () => {
  const textareaRef = { current: { focus: vi.fn() } };
  const autoOpenedToolsRef = { current: true };
  const setShowTools = vi.fn();

  it("renders the tools label", () => {
    render(
      <ToolsButton
        showTools={false}
        setShowTools={setShowTools}
        textareaRef={textareaRef}
        autoOpenedToolsRef={autoOpenedToolsRef}
      />,
    );
    expect(screen.getByText("Tools")).toBeInTheDocument();
  });

  it("toggles the tools menu on click", () => {
    render(
      <ToolsButton
        showTools={false}
        setShowTools={setShowTools}
        textareaRef={textareaRef}
        autoOpenedToolsRef={autoOpenedToolsRef}
      />,
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(setShowTools).toHaveBeenCalledWith(true);
  });

  it("focuses the textarea after toggling", () => {
    render(
      <ToolsButton
        showTools={false}
        setShowTools={setShowTools}
        textareaRef={textareaRef}
        autoOpenedToolsRef={autoOpenedToolsRef}
      />,
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(textareaRef.current.focus).toHaveBeenCalled();
  });

  it("resets the auto-opened tools ref on click", () => {
    render(
      <ToolsButton
        showTools={false}
        setShowTools={setShowTools}
        textareaRef={textareaRef}
        autoOpenedToolsRef={autoOpenedToolsRef}
      />,
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(autoOpenedToolsRef.current).toBe(false);
  });
});
