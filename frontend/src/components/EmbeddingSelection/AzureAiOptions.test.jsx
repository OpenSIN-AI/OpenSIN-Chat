// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import AzureAiOptions from "./AzureAiOptions";

describe("AzureAiOptions", () => {
  it("renders the Azure service endpoint input", () => {
    render(<AzureAiOptions settings={{}} />);
    const input = document.querySelector('input[name="AzureOpenAiEndpoint"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "url");
    expect(input).toHaveAttribute(
      "placeholder",
      "https://my-azure.openai.azure.com",
    );
    expect(input).toBeRequired();
  });

  it("renders the Azure OpenAI API key input", () => {
    render(<AzureAiOptions settings={{}} />);
    const input = document.querySelector('input[name="AzureOpenAiKey"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("placeholder", "Azure OpenAI API Key");
    expect(input).toBeRequired();
  });

  it("renders the embedding deployment name input", () => {
    render(<AzureAiOptions settings={{}} />);
    const input = document.querySelector(
      'input[name="AzureOpenAiEmbeddingModelPref"]',
    );
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "text");
    expect(input).toBeRequired();
  });

  it("hydrates the endpoint with settings.AzureOpenAiEndpoint", () => {
    render(
      <AzureAiOptions
        settings={{ AzureOpenAiEndpoint: "https://prod.openai.azure.com" }}
      />,
    );
    const input = document.querySelector('input[name="AzureOpenAiEndpoint"]');
    expect(input.value).toBe("https://prod.openai.azure.com");
  });

  it("hydrates the deployment name from settings", () => {
    render(
      <AzureAiOptions
        settings={{ AzureOpenAiEmbeddingModelPref: "my-ada-deployment" }}
      />,
    );
    const input = document.querySelector(
      'input[name="AzureOpenAiEmbeddingModelPref"]',
    );
    expect(input.value).toBe("my-ada-deployment");
  });

  it("masks the AzureOpenAiKey with 20 asterisks when set", () => {
    render(<AzureAiOptions settings={{ AzureOpenAiKey: "real-key" }} />);
    const input = document.querySelector('input[name="AzureOpenAiKey"]');
    expect(input.value).toBe("*".repeat(20));
  });

  it("leaves the API key empty when not provided", () => {
    render(<AzureAiOptions settings={{}} />);
    const input = document.querySelector('input[name="AzureOpenAiKey"]');
    expect(input.value).toBe("");
  });

  it("disables autocomplete and spellcheck on every input", () => {
    render(<AzureAiOptions settings={{}} />);
    const inputs = document.querySelectorAll("input");
    inputs.forEach((input) => {
      expect(input).toHaveAttribute("autoComplete", "off");
      expect(input).toHaveAttribute("spellCheck", "false");
    });
  });

  it("renders without crashing when settings is undefined", () => {
    expect(() => render(<AzureAiOptions />)).not.toThrow();
  });
});
