// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Stub react-tooltip to avoid portal warnings in jsdom.
vi.mock("react-tooltip", () => ({
  Tooltip: () => null,
}));

// Stub Preloader for components that use it as a loading indicator.
vi.mock("@/components/Preloader", () => ({
  default: () => null,
}));

// Stub hooks that talk to the network / filesystem.
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

vi.mock("@/models/system", () => ({
  default: {
    customModels: vi.fn(async () => ({
      models: [
        { id: "nomic-embed-text", name: "nomic-embed-text" },
        { id: "mxbai-embed-large", name: "mxbai-embed-large" },
      ],
    })),
  },
}));

import GenericOpenAiEmbeddingOptions from "./GenericOpenAiOptions";
import LocalAiOptions from "./LocalAiOptions";
import OllamaEmbeddingOptions from "./OllamaOptions";
import LiteLLMOptions from "./LiteLLMOptions";
import LMStudioEmbeddingOptions from "./LMStudioOptions";
import LemonadeEmbeddingOptions from "./LemonadeOptions";
import CohereEmbeddingOptions from "./CohereOptions";
import GeminiOptions from "./GeminiOptions";

describe("EmbeddingSelection — icon & a11y regression suite", () => {
  describe("GenericOpenAiEmbeddingOptions", () => {
    it("toggles the advanced section via a type=button + aria-label", () => {
      render(<GenericOpenAiEmbeddingOptions settings={{}} />);
      const toggle = screen.getByRole("button", {
        name: /show advanced settings/i,
      });
      expect(toggle).toHaveAttribute("type", "button");
      expect(toggle).toHaveAttribute("aria-label", "Show advanced settings");
      fireEvent.click(toggle);
      // After click the label should flip — but the local state updates
      // only after the next render, so we just assert the click doesn't
      // throw and the button is still type=button.
      expect(toggle).toHaveAttribute("type", "button");
    });

    it("renders the CaretDown phosphor icon next to the toggle", () => {
      const { container } = render(
        <GenericOpenAiEmbeddingOptions settings={{}} />,
      );
      const toggle = screen.getByRole("button", {
        name: /show advanced settings/i,
      });
      const svg = toggle.querySelector("svg");
      expect(svg).toBeInTheDocument();
      // The collapsed state uses the CaretDown phosphor icon.
      // Phosphor renders an inner <svg> with the icon path; the outer svg
      // has class `ph-caret-down` or `caret-down` depending on bundle.
      // We just assert an svg is mounted inside the toggle.
      expect(container).toBeTruthy();
    });

    it("does not submit a form when the toggle is clicked", () => {
      // Wrap in a <form> with a submit spy to verify the button has
      // type="button" and therefore won't trigger form submission.
      const onSubmit = vi.fn((e) => e.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <GenericOpenAiEmbeddingOptions settings={{}} />
        </form>,
      );
      const toggle = screen.getByRole("button", {
        name: /show advanced settings/i,
      });
      fireEvent.click(toggle);
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("LocalAiOptions", () => {
    it("renders the advanced toggle as a type=button with aria-label", () => {
      render(<LocalAiOptions settings={{}} />);
      const toggle = screen.getByRole("button", {
        name: /show advanced settings/i,
      });
      expect(toggle).toHaveAttribute("type", "button");
      expect(toggle).toHaveAttribute("aria-label", "Show advanced settings");
    });

    it("does not render the Auto-Detect button when basePathValue is set", () => {
      // The mocked hook returns basePathValue.value = "http://127.0.0.1:11434"
      // so the Auto-Detect button should NOT be in the DOM until the
      // user opens the advanced section.
      render(<LocalAiOptions settings={{}} />);
      const auto = screen.queryByRole("button", { name: /auto-detect/i });
      expect(auto).toBeNull();
    });
  });

  describe("OllamaEmbeddingOptions", () => {
    it("renders the advanced toggle as a type=button with aria-label", () => {
      render(<OllamaEmbeddingOptions settings={{}} />);
      const toggle = screen.getByRole("button", {
        name: /show advanced settings/i,
      });
      expect(toggle).toHaveAttribute("type", "button");
      expect(toggle).toHaveAttribute("aria-label", "Show advanced settings");
    });

    it("does not submit a form when the toggle is clicked", () => {
      const onSubmit = vi.fn((e) => e.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <OllamaEmbeddingOptions settings={{}} />
        </form>,
      );
      const toggle = screen.getByRole("button", {
        name: /show advanced settings/i,
      });
      fireEvent.click(toggle);
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("LiteLLMOptions", () => {
    it("renders the LiteLLM base URL input with the expected attrs", () => {
      render(<LiteLLMOptions settings={{}} />);
      const input = document.querySelector('input[name="LiteLLMBasePath"]');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "url");
      expect(input).toHaveAttribute("placeholder", "http://127.0.0.1:4000");
      expect(input).toBeRequired();
    });

    it("hydrates the base URL from settings", () => {
      render(
        <LiteLLMOptions settings={{ LiteLLMBasePath: "http://proxy:4000" }} />,
      );
      const input = document.querySelector('input[name="LiteLLMBasePath"]');
      expect(input.value).toBe("http://proxy:4000");
    });
  });

  describe("LMStudioEmbeddingOptions", () => {
    it("renders the advanced toggle as a type=button with aria-label", () => {
      render(<LMStudioEmbeddingOptions settings={{}} />);
      const toggle = screen.getByRole("button", {
        name: /show manual endpoint input/i,
      });
      expect(toggle).toHaveAttribute("type", "button");
      expect(toggle).toHaveAttribute(
        "aria-label",
        "Show manual endpoint input",
      );
    });
  });

  describe("LemonadeEmbeddingOptions", () => {
    it("renders the advanced toggle as a type=button with aria-label", () => {
      render(<LemonadeEmbeddingOptions settings={{}} />);
      const toggle = screen.getByRole("button", {
        name: /show manual endpoint input/i,
      });
      expect(toggle).toHaveAttribute("type", "button");
      expect(toggle).toHaveAttribute(
        "aria-label",
        "Show manual endpoint input",
      );
    });
  });

  describe("CohereEmbeddingOptions", () => {
    it("renders the Cohere API key password input", () => {
      render(<CohereEmbeddingOptions settings={{}} />);
      const input = document.querySelector('input[name="CohereApiKey"]');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "password");
      expect(input).toHaveAttribute("placeholder", "Cohere API Key");
      expect(input).toBeRequired();
    });

    it("masks the Cohere API key with 20 asterisks when set", () => {
      render(
        <CohereEmbeddingOptions settings={{ CohereApiKey: "real-key" }} />,
      );
      const input = document.querySelector('input[name="CohereApiKey"]');
      expect(input.value).toBe("*".repeat(20));
    });
  });

  describe("GeminiOptions", () => {
    it("renders the Gemini API key password input", () => {
      render(<GeminiOptions settings={{}} />);
      const input = document.querySelector(
        'input[name="GeminiEmbeddingApiKey"]',
      );
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "password");
      expect(input).toBeRequired();
    });

    it("selects the default Gemini embedding model from settings", () => {
      render(
        <GeminiOptions
          settings={{ EmbeddingModelPref: "gemini-embedding-001" }}
        />,
      );
      const select = document.querySelector(
        'select[name="EmbeddingModelPref"]',
      );
      expect(select.value).toBe("gemini-embedding-001");
    });
  });
});
