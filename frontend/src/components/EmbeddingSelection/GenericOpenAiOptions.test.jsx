// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

// react-tooltip renders a portal and triggers warnings in jsdom; stub the whole module.
vi.mock("react-tooltip", () => ({
  Tooltip: () => null,
}));

import GenericOpenAiEmbeddingOptions from "./GenericOpenAiOptions";

describe("GenericOpenAiEmbeddingOptions", () => {
  it("renders the base URL input", () => {
    render(<GenericOpenAiEmbeddingOptions settings={{}} />);
    const input = document.querySelector('input[name="EmbeddingBasePath"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "url");
    expect(input).toHaveAttribute("placeholder", "https://api.openai.com/v1");
    expect(input).toBeRequired();
  });

  it("renders the embedding model input", () => {
    render(<GenericOpenAiEmbeddingOptions settings={{}} />);
    const input = document.querySelector('input[name="EmbeddingModelPref"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("placeholder", "text-embedding-ada-002");
    expect(input).toBeRequired();
  });

  it("renders the max chunk length input as a number", () => {
    render(<GenericOpenAiEmbeddingOptions settings={{}} />);
    const input = document.querySelector(
      'input[name="EmbeddingModelMaxChunkLength"]',
    );
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "number");
    expect(input).toHaveAttribute("min", "1");
    expect(input).not.toBeRequired();
  });

  it("renders the optional API key input as a password", () => {
    render(<GenericOpenAiEmbeddingOptions settings={{}} />);
    const input = document.querySelector(
      'input[name="GenericOpenAiEmbeddingApiKey"]',
    );
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "password");
    expect(input).not.toBeRequired();
  });

  it("hydrates base URL and model from settings", () => {
    render(
      <GenericOpenAiEmbeddingOptions
        settings={{
          EmbeddingBasePath: "https://my-proxy.example.com/v1",
          EmbeddingModelPref: "text-embedding-3-small",
        }}
      />,
    );
    expect(
      document.querySelector('input[name="EmbeddingBasePath"]').value,
    ).toBe("https://my-proxy.example.com/v1");
    expect(
      document.querySelector('input[name="EmbeddingModelPref"]').value,
    ).toBe("text-embedding-3-small");
  });

  it("masks the API key with 20 asterisks when set", () => {
    render(
      <GenericOpenAiEmbeddingOptions
        settings={{ GenericOpenAiEmbeddingApiKey: "sk-abcdef" }}
      />,
    );
    const input = document.querySelector(
      'input[name="GenericOpenAiEmbeddingApiKey"]',
    );
    expect(input.value).toBe("*".repeat(20));
  });

  it("hides the advanced wrapper by default via the hidden attribute", () => {
    const { container } = render(
      <GenericOpenAiEmbeddingOptions settings={{}} />,
    );
    const advancedWrapper = Array.from(container.querySelectorAll("div")).find(
      (div) => div.hasAttribute("hidden"),
    );
    expect(advancedWrapper).toBeTruthy();
    // The advanced input may still exist in the DOM (via conditional render
    // with the hidden attribute), but it lives inside that hidden wrapper.
    const advancedInput = document.querySelector(
      'input[name="GenericOpenAiEmbeddingMaxConcurrentChunks"]',
    );
    if (advancedInput) {
      expect(advancedWrapper.contains(advancedInput)).toBe(true);
    }
  });

  it("reveals the advanced section after clicking the toggle", () => {
    const { container } = render(
      <GenericOpenAiEmbeddingOptions settings={{}} />,
    );
    const toggle = screen.getByRole("button", { name: /advanced settings/i });
    fireEvent.click(toggle);
    const advancedInput = document.querySelector(
      'input[name="GenericOpenAiEmbeddingMaxConcurrentChunks"]',
    );
    expect(advancedInput).toBeInTheDocument();
    expect(advancedInput).toHaveAttribute("type", "number");
    expect(advancedInput).toHaveAttribute("min", "1");
    // Hidden wrapper no longer has the hidden attribute after clicking the toggle
    const visibleWrappers = Array.from(
      container.querySelectorAll("div[hidden]"),
    );
    expect(visibleWrappers).toHaveLength(0);
  });

  it("hydrates the max chunk length from settings", () => {
    render(
      <GenericOpenAiEmbeddingOptions
        settings={{ EmbeddingModelMaxChunkLength: 4096 }}
      />,
    );
    const input = document.querySelector(
      'input[name="EmbeddingModelMaxChunkLength"]',
    );
    expect(input.value).toBe("4096");
  });

  it("renders without crashing when no settings are provided", () => {
    expect(() =>
      render(<GenericOpenAiEmbeddingOptions settings={{}} />),
    ).not.toThrow();
  });
});
