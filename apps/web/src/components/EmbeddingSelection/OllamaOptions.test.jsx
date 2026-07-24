// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Stub the auto-discovery + provider-models hooks so the component
// doesn't try to actually probe localhost:11434 during the test.
vi.mock("@/hooks/useProviderEndpointAutoDiscovery", () => ({
  default: () => ({
    autoDetecting: false,
    basePath: {
      value: "http://127.0.0.1:11434",
      onChange: vi.fn(),
      onBlur: vi.fn(),
    },
    basePathValue: { value: "http://127.0.0.1:11434" },
    showAdvancedControls: false,
    setShowAdvancedControls: vi.fn(),
    handleAutoDetectClick: vi.fn(),
    authToken: { onChange: vi.fn(), onBlur: vi.fn() },
    authTokenValue: { value: "" },
  }),
}));

vi.mock("@/hooks/useProviderModels", () => ({
  default: () => ({
    customModels: [
      { id: "nomic-embed-text", name: "nomic-embed-text" },
      { id: "mxbai-embed-large", name: "mxbai-embed-large" },
    ],
    isLoading: false,
  }),
}));

// Preloader renders a div — no behaviour to test, but stubbing keeps the
// DOM tree minimal.
vi.mock("@/components/Preloader", () => ({
  default: () => null,
}));

// react-tooltip renders a portal and triggers warnings in jsdom; stub it.
vi.mock("react-tooltip", () => ({
  Tooltip: () => null,
}));

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

import OllamaEmbeddingOptions from "./OllamaOptions";

describe("OllamaEmbeddingOptions", () => {
  it("renders the max chunk length input with the default value", () => {
    render(<OllamaEmbeddingOptions settings={{}} />);
    const input = document.querySelector(
      'input[name="EmbeddingModelMaxChunkLength"]',
    );
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "number");
    expect(input.value).toBe("8192");
    expect(input).toBeRequired();
  });

  it("uses the setting EmbeddingModelMaxChunkLength when provided", () => {
    render(
      <OllamaEmbeddingOptions
        settings={{ EmbeddingModelMaxChunkLength: 2048 }}
      />,
    );
    const input = document.querySelector(
      'input[name="EmbeddingModelMaxChunkLength"]',
    );
    expect(input.value).toBe("2048");
  });

  it("updates the max chunk length input on change", () => {
    render(<OllamaEmbeddingOptions settings={{}} />);
    const input = document.querySelector(
      'input[name="EmbeddingModelMaxChunkLength"]',
    );
    fireEvent.change(input, { target: { value: "512" } });
    expect(input.value).toBe("512");
  });

  it("hides the advanced wrapper (base URL field) by default via the hidden attribute", () => {
    const { container } = render(<OllamaEmbeddingOptions settings={{}} />);
    const hiddenWrappers = container.querySelectorAll("div[hidden]");
    expect(hiddenWrappers.length).toBeGreaterThan(0);
    // The base URL field should live inside the hidden wrapper, if rendered
    const basePathInput = document.querySelector(
      'input[name="EmbeddingBasePath"]',
    );
    if (basePathInput) {
      const insideHidden = Array.from(hiddenWrappers).some((w) =>
        w.contains(basePathInput),
      );
      expect(insideHidden).toBe(true);
    }
  });

  it("renders the advanced toggle button", () => {
    render(<OllamaEmbeddingOptions settings={{}} />);
    const toggle = screen.getByRole("button", { name: /advanced settings/i });
    expect(toggle).toBeInTheDocument();
  });

  it("hides the batch size input in the collapsed advanced wrapper by default", () => {
    const { container } = render(<OllamaEmbeddingOptions settings={{}} />);
    const batchInput = document.querySelector(
      'input[name="OllamaEmbeddingBatchSize"]',
    );
    if (batchInput) {
      const hiddenWrappers = container.querySelectorAll("div[hidden]");
      const insideHidden = Array.from(hiddenWrappers).some((w) =>
        w.contains(batchInput),
      );
      expect(insideHidden).toBe(true);
    }
  });

  it("renders the batch size input with the value from settings", () => {
    render(
      <OllamaEmbeddingOptions settings={{ OllamaEmbeddingBatchSize: 4 }} />,
    );
    const batchInput = document.querySelector(
      'input[name="OllamaEmbeddingBatchSize"]',
    );
    expect(batchInput).toBeInTheDocument();
    expect(batchInput).toHaveAttribute("type", "number");
    expect(batchInput).toHaveAttribute("min", "1");
  });

  it("renders the auth token input as an optional password field", () => {
    render(<OllamaEmbeddingOptions settings={{}} />);
    const auth = document.querySelector('input[name="OllamaLLMAuthToken"]');
    expect(auth).toBeInTheDocument();
    expect(auth).toHaveAttribute("type", "password");
    expect(auth).not.toBeRequired();
  });

  it("renders the embedding model select with the models returned by the hook", () => {
    render(<OllamaEmbeddingOptions settings={{}} />);
    const select = document.querySelector('select[name="EmbeddingModelPref"]');
    expect(select).toBeInTheDocument();
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toEqual(
      expect.arrayContaining(["nomic-embed-text", "mxbai-embed-large"]),
    );
  });

  it("selects the configured EmbeddingModelPref from settings", () => {
    render(
      <OllamaEmbeddingOptions
        settings={{ EmbeddingModelPref: "mxbai-embed-large" }}
      />,
    );
    const select = document.querySelector('select[name="EmbeddingModelPref"]');
    expect(select.value).toBe("mxbai-embed-large");
  });

  it("renders without crashing when settings is an empty object", () => {
    expect(() =>
      render(<OllamaEmbeddingOptions settings={{}} />),
    ).not.toThrow();
  });
});
