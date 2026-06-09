// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import OpenAiOptions from "./OpenAiOptions";

describe("OpenAiOptions", () => {
  it("renders the API Key password input", () => {
    render(<OpenAiOptions settings={{}} />);
    const input = document.querySelector('input[name="OpenAiKey"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("placeholder", "OpenAI API Key");
  });

  it("renders the embedding model preference select", () => {
    render(<OpenAiOptions settings={{}} />);
    const select = document.querySelector('select[name="EmbeddingModelPref"]');
    expect(select).toBeInTheDocument();
    expect(select).toBeRequired();
  });

  it("lists the three known OpenAI embedding models", () => {
    render(<OpenAiOptions settings={{}} />);
    const select = document.querySelector('select[name="EmbeddingModelPref"]');
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toEqual([
      "text-embedding-ada-002",
      "text-embedding-3-small",
      "text-embedding-3-large",
    ]);
  });

  it("marks the model matching settings.EmbeddingModelPref as selected", () => {
    render(
      <OpenAiOptions
        settings={{ EmbeddingModelPref: "text-embedding-3-large" }}
      />,
    );
    const select = document.querySelector('select[name="EmbeddingModelPref"]');
    expect(select.value).toBe("text-embedding-3-large");
  });

  it("marks the first model as selected by default when no preference is set", () => {
    render(<OpenAiOptions settings={{}} />);
    const select = document.querySelector('select[name="EmbeddingModelPref"]');
    expect(select.value).toBe("text-embedding-ada-002");
  });

  it("masks the OpenAiKey with 20 asterisks when it is set", () => {
    render(<OpenAiOptions settings={{ OpenAiKey: "sk-real-secret" }} />);
    const input = document.querySelector('input[name="OpenAiKey"]');
    expect(input.value).toBe("*".repeat(20));
  });

  it("leaves the OpenAiKey empty when it is not set", () => {
    render(<OpenAiOptions settings={{}} />);
    const input = document.querySelector('input[name="OpenAiKey"]');
    expect(input.value).toBe("");
  });

  it("disables browser autocomplete and spellcheck on the API key", () => {
    render(<OpenAiOptions settings={{}} />);
    const input = document.querySelector('input[name="OpenAiKey"]');
    expect(input).toHaveAttribute("autoComplete", "off");
    expect(input).toHaveAttribute("spellCheck", "false");
  });

  it("renders without crashing when no settings prop is supplied", () => {
    expect(() => render(<OpenAiOptions />)).not.toThrow();
  });
});
