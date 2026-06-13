// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SendPromptButton, EnhancePromptButton } from "./PromptButtons";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

describe("PromptButtons", () => {
  it("renders the send button", () => {
    const formRef = { current: null };
    render(<SendPromptButton formRef={formRef} promptInput="hi" isDisabled={false} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("disables the send button when disabled", () => {
    const formRef = { current: null };
    render(<SendPromptButton formRef={formRef} promptInput="hi" isDisabled={true} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("renders the enhance button", () => {
    render(<EnhancePromptButton promptInput="hi" setPromptInput={() => {}} isStreaming={false} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("disables the enhance button when input is empty", () => {
    render(<EnhancePromptButton promptInput="" setPromptInput={() => {}} isStreaming={false} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
