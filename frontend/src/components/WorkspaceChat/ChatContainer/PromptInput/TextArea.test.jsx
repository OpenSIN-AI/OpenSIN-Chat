// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TextArea from "./TextArea";

vi.mock("@/models/appearance", () => ({
  default: {
    get: vi.fn(() => true),
  },
}));

vi.mock("./index", () => ({
  PROMPT_INPUT_ID: "primary-prompt-input",
}));

describe("TextArea", () => {
  const handleChange = vi.fn();
  const captureEnterOrUndo = vi.fn();
  const handlePasteEvent = vi.fn();
  const saveCurrentState = vi.fn();
  const setFocused = vi.fn();
  const adjustTextArea = vi.fn();
  const t = (key) => key;

  const renderTextArea = (props = {}) => {
    return render(
      <TextArea
        textareaRef={{ current: null }}
        promptInput=""
        handleChange={handleChange}
        captureEnterOrUndo={captureEnterOrUndo}
        handlePasteEvent={handlePasteEvent}
        saveCurrentState={saveCurrentState}
        textSizeClass="text-base"
        t={t}
        setFocused={setFocused}
        adjustTextArea={adjustTextArea}
        {...props}
      />,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the textarea with the correct id", () => {
    renderTextArea();
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("id", "primary-prompt-input");
  });

  it("calls handleChange on input change", () => {
    renderTextArea();
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Hello" } });
    expect(handleChange).toHaveBeenCalled();
  });

  it("calls captureEnterOrUndo on key down", () => {
    renderTextArea();
    const textarea = screen.getByRole("textbox");
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(captureEnterOrUndo).toHaveBeenCalled();
  });

  it("calls saveCurrentState and handlePasteEvent on paste", () => {
    renderTextArea();
    const textarea = screen.getByRole("textbox");
    fireEvent.paste(textarea);
    expect(saveCurrentState).toHaveBeenCalled();
    expect(handlePasteEvent).toHaveBeenCalled();
  });

  it("calls setFocused on focus and blur", () => {
    renderTextArea();
    const textarea = screen.getByRole("textbox");
    fireEvent.focus(textarea);
    expect(setFocused).toHaveBeenCalledWith(true);
    fireEvent.blur(textarea);
    expect(setFocused).toHaveBeenCalledWith(false);
  });

  it("calls adjustTextArea on blur", () => {
    renderTextArea();
    const textarea = screen.getByRole("textbox");
    fireEvent.blur(textarea);
    expect(adjustTextArea).toHaveBeenCalled();
  });

  it("is marked as required", () => {
    renderTextArea();
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("required");
  });

  it("displays the placeholder", () => {
    renderTextArea();
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("placeholder", "chat_window.send_message");
  });

  it("reflects the current prompt value", () => {
    renderTextArea({ promptInput: "current prompt" });
    const textarea = screen.getByRole("textbox");
    expect(textarea.value).toBe("current prompt");
  });

  it("enforces a maxLength cap so 50000-char pastes are clipped by the browser", () => {
    renderTextArea();
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("maxLength");
    const cap = parseInt(textarea.getAttribute("maxLength"), 10);
    expect(cap).toBeGreaterThan(0);
    expect(cap).toBeLessThanOrEqual(50_000);
  });
});
