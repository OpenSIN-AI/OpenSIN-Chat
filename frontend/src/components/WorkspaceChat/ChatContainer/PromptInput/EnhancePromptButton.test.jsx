// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EnhancePromptButton from "./EnhancePromptButton";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("react-tooltip", () => ({
  Tooltip: ({ id }) => <div data-testid={`tooltip-${id}`} />,
}));

vi.mock("@phosphor-icons/react/dist/csr/Sparkle", () => ({ default: (props) => <svg data-testid="phosphor-sparkle-icon" {...props} />, Sparkle: (props) => <svg data-testid="phosphor-sparkle-icon" {...props} /> }));;

describe("EnhancePromptButton", () => {
  const setPromptInput = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when prompt is empty", () => {
    const { container } = render(
      <EnhancePromptButton
        promptInput=""
        setPromptInput={setPromptInput}
        isStreaming={false}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders when prompt is not empty", () => {
    render(
      <EnhancePromptButton
        promptInput="Hello"
        setPromptInput={setPromptInput}
        isStreaming={false}
      />,
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("calls fetch and updates the prompt on success", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ enhanced: "Enhanced prompt" }),
    });
    render(
      <EnhancePromptButton
        promptInput="Hello"
        setPromptInput={setPromptInput}
        isStreaming={false}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(setPromptInput).toHaveBeenCalledWith("Enhanced prompt");
    });
    fetchSpy.mockRestore();
  });

  it("does not call fetch when streaming", () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    render(
      <EnhancePromptButton
        promptInput="Hello"
        setPromptInput={setPromptInput}
        isStreaming={true}
      />,
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("does not call fetch when prompt is empty", () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const { container } = render(
      <EnhancePromptButton
        promptInput="   "
        setPromptInput={setPromptInput}
        isStreaming={false}
      />,
    );
    expect(container.firstChild).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
