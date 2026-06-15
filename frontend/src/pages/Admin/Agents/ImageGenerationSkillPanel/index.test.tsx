// SPDX-License-Identifier: MIT
// Docs: index.test.doc.md
/**
 * Tests for ImageGenerationSkillPanel.
 *
 * Regression coverage for v0.6.5:
 *  - i18n: all panel strings now come from t() (no hardcoded English)
 *  - Client-side base_path validation: invalid URLs show a visible
 *    error message + red border so the admin isn't surprised when
 *    the server silently drops their bad input
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImageGenerationSkillPanel from "./index";
vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@/hooks/useSystemSettings", () => ({
  default: vi.fn(),
}));

vi.mock("@/components/lib/Toggle", () => ({
  default: ({ enabled, onChange, disabled }: any) => (
    <button
      type="button"
      data-testid="toggle"
      data-enabled={enabled ? "true" : "false"}
      disabled={disabled}
      onClick={onChange}
    >
      Toggle
    </button>
  ),
}));

vi.mock("@phosphor-icons/react", () => ({
  Image: () => null,
}));

import useSystemSettings from "@/hooks/useSystemSettings";

const baseProps = {
  title: "Image Generation",
  skill: "image-generation",
  toggleSkill: vi.fn(),
  enabled: true,
};

describe("ImageGenerationSkillPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSystemSettings as any).mockReturnValue({ settings: null, loading: false });
  });

  it("renders the panel title and description (i18n-driven)", () => {
    render(<ImageGenerationSkillPanel {...baseProps} />);
    expect(screen.getByText("Image Generation")).toBeInTheDocument();
    expect(
      screen.getByText(/Generate images using any OpenAI-compatible/),
    ).toBeInTheDocument();
  });

  it("renders Base URL, API Key, and Model labels via t()", () => {
    render(<ImageGenerationSkillPanel {...baseProps} />);
    expect(
      screen.getByPlaceholderText("https://api.openai.com"),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("sk-...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("dall-e-3")).toBeInTheDocument();
  });

  it("renders Base URL label with client-side validation enabled", () => {
    const { container } = render(<ImageGenerationSkillPanel {...baseProps} />);
    const label = Array.from(container.querySelectorAll("label")).find((el) =>
      el.textContent?.includes("Base URL"),
    );
    expect(label).toBeTruthy();
  });

  it("does NOT show the base_url error for a valid https:// URL", () => {
    (useSystemSettings as any).mockReturnValue({
      settings: { image_generation_base_path: "https://api.openai.com" },
    });
    render(<ImageGenerationSkillPanel {...baseProps} />);
    expect(
      screen.queryByText("Please enter a valid http:// or https:// URL."),
    ).not.toBeInTheDocument();
  });

  it("does NOT show the base_url error for a valid http:// URL", () => {
    (useSystemSettings as any).mockReturnValue({
      settings: { image_generation_base_path: "http://localhost:1234" },
    });
    render(<ImageGenerationSkillPanel {...baseProps} />);
    expect(
      screen.queryByText("Please enter a valid http:// or https:// URL."),
    ).not.toBeInTheDocument();
  });

  it("shows the base_url error after blur for an ftp:// URL", async () => {
    render(<ImageGenerationSkillPanel {...baseProps} />);
    const input = screen.getByPlaceholderText("https://api.openai.com");
    await userEvent.type(input, "ftp://internal-host");
    fireEvent.blur(input);
    await waitFor(() => {
      expect(
        screen.getByText(/valid http:\/\/ or https:\/\//i),
      ).toBeInTheDocument();
    });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.className).toMatch(/border-red-500/);
  });

  it("shows the base_url error after blur for an unparseable URL", async () => {
    render(<ImageGenerationSkillPanel {...baseProps} />);
    const input = screen.getByPlaceholderText("https://api.openai.com");
    await userEvent.type(input, "not a url at all");
    fireEvent.blur(input);
    await waitFor(() => {
      expect(
        screen.getByText(/valid http:\/\/ or https:\/\//i),
      ).toBeInTheDocument();
    });
  });

  it("clears the error once the URL becomes valid while typing", async () => {
    render(<ImageGenerationSkillPanel {...baseProps} />);
    const input = screen.getByPlaceholderText("https://api.openai.com");
    await userEvent.type(input, "not-a-url");
    fireEvent.blur(input);
    expect(screen.getByText(/valid http/i)).toBeInTheDocument();
    await userEvent.clear(input);
    await userEvent.type(input, "https://api.openai.com");
    expect(screen.queryByText(/valid http/i)).not.toBeInTheDocument();
  });

  it("sends the -CLEAR- sentinel when the remove-key checkbox is checked", async () => {
    render(<ImageGenerationSkillPanel {...baseProps} />);
    const checkbox = screen.getByLabelText(/remove the stored api key/i);
    await userEvent.click(checkbox);
    const hidden = document.querySelector(
      'input[name="system::image_generation_api_key"]',
    );
    expect(hidden).toHaveAttribute("type", "hidden");
    expect(hidden).toHaveValue("-CLEAR-");
  });

  it("shows the red border and aria-invalid for invalid URL after blur", async () => {
    render(<ImageGenerationSkillPanel {...baseProps} />);
    const input = screen.getByPlaceholderText("https://api.openai.com");
    await userEvent.type(input, "ftp://files.example.com");
    fireEvent.blur(input);
    await waitFor(() => {
      expect(input).toHaveAttribute("aria-invalid", "true");
    });
    expect(input.className).toMatch(/border-red-500/);
  });

  it("does NOT render the configuration inputs when the skill is disabled", () => {
    render(<ImageGenerationSkillPanel {...baseProps} enabled={false} />);
    expect(
      screen.queryByPlaceholderText("https://api.openai.com"),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/API Key/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Model/)).not.toBeInTheDocument();
  });
});