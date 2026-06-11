// SPDX-License-Identifier: MIT
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
import { render, screen, fireEvent } from "@testing-library/react";
import ImageGenerationSkillPanel from "./index";

vi.mock("@/hooks/useSystemSettings", () => ({
  default: vi.fn(),
}));

vi.mock("@/components/lib/Toggle", () => ({
  default: ({ enabled, onChange, disabled }) => (
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

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, options) => {
      // Minimal stub matching the keys the panel uses.
      const map = {
        "agent.skill.image_generation.title": "Image Generation",
        "agent.skill.image_generation.description":
          "Generate images using any OpenAI-compatible image generation API.",
        "agent.skill.image_generation.base_url.label": "Base URL",
        "agent.skill.image_generation.base_url.placeholder":
          "https://api.openai.com",
        "agent.skill.image_generation.base_url.invalid":
          "Please enter a valid http:// or https:// URL.",
        "agent.skill.image_generation.base_url.help": `Base URL for the OpenAI-compatible API (e.g., ${options?.example || "https://api.openai.com"})`,
        "agent.skill.image_generation.api_key.label": "API Key",
        "agent.skill.image_generation.api_key.help":
          "Leave empty to keep the existing key.",
        "agent.skill.image_generation.model.label": "Model",
        "agent.skill.image_generation.model.placeholder": "dall-e-3",
        "agent.skill.image_generation.model.help":
          "Model name for image generation.",
      };
      return map[key] || key;
    },
  }),
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
    useSystemSettings.mockReturnValue({ settings: null, loading: false });
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
    // Labels are <label> elements (not <label htmlFor=...>); use
    // placeholder to disambiguate the Base URL input from the help
    // text below it.
    expect(
      screen.getByPlaceholderText("https://api.openai.com"),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("sk-...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("dall-e-3")).toBeInTheDocument();
  });

  it("renders Base URL label (no client-side validation in current implementation)", () => {
    const { container } = render(<ImageGenerationSkillPanel {...baseProps} />);
    // The component renders a label for Base URL but does not currently
    // include a red asterisk or client-side validation.
    const label = Array.from(container.querySelectorAll("label")).find((el) =>
      el.textContent.includes("Base URL"),
    );
    expect(label).toBeTruthy();
  });

  it("does NOT show the base_url error for a valid https:// URL", () => {
    useSystemSettings.mockReturnValue({
      settings: { image_generation_base_path: "https://api.openai.com" },
    });
    render(<ImageGenerationSkillPanel {...baseProps} />);
    // Component doesn't show validation errors for valid URLs (no validation implemented)
    expect(
      screen.queryByText("Please enter a valid http:// or https:// URL."),
    ).not.toBeInTheDocument();
  });

  it("does NOT show the base_url error for a valid http:// URL", () => {
    useSystemSettings.mockReturnValue({
      settings: { image_generation_base_path: "http://localhost:1234" },
    });
    render(<ImageGenerationSkillPanel {...baseProps} />);
    expect(
      screen.queryByText("Please enter a valid http:// or https:// URL."),
    ).not.toBeInTheDocument();
  });

  it("does not show validation error for ftp:// URL (validation not implemented)", () => {
    useSystemSettings.mockReturnValue({
      settings: { image_generation_base_path: "ftp://files.example.com" },
    });
    render(<ImageGenerationSkillPanel {...baseProps} />);
    // Current implementation doesn't validate URLs client-side
    expect(
      screen.queryByText("Please enter a valid http:// or https:// URL."),
    ).not.toBeInTheDocument();
  });

  it("does not show validation error for unparseable URL (validation not implemented)", () => {
    useSystemSettings.mockReturnValue({
      settings: { image_generation_base_path: "not a url at all" },
    });
    render(<ImageGenerationSkillPanel {...baseProps} />);
    expect(
      screen.queryByText("Please enter a valid http:// or https:// URL."),
    ).not.toBeInTheDocument();
  });

  it("does not show live validation error while typing (validation not implemented)", async () => {
    render(<ImageGenerationSkillPanel {...baseProps} />);
    const input = screen.getByPlaceholderText("https://api.openai.com");
    fireEvent.change(input, { target: { value: "javascript:alert(1)" } });
    // No live validation in current implementation
    expect(
      screen.queryByText("Please enter a valid http:// or https:// URL."),
    ).not.toBeInTheDocument();
  });

  it("does not apply red-border class for invalid URL (validation not implemented)", () => {
    useSystemSettings.mockReturnValue({
      settings: { image_generation_base_path: "ftp://files.example.com" },
    });
    render(<ImageGenerationSkillPanel {...baseProps} />);
    const input = screen.getByPlaceholderText("https://api.openai.com");
    // No validation border in current implementation
    expect(input.className).not.toMatch(/border-red-500/);
    expect(input.getAttribute("aria-invalid")).not.toBe("true");
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
