// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ProviderPrivacy from "./index";

vi.mock("@/hooks/useSystemSettings", () => ({
  default: vi.fn(),
}));

vi.mock("@/media/logo/openafd-icon.svg", () => ({
  default: "mock-logo.svg",
}));

vi.mock("@phosphor-icons/react", () => ({
  ArrowSquareOut: () => <svg data-testid="arrow-square-out-icon" />,
}));

vi.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }) => (
    <a href={to} data-testid="policy-link" {...props}>
      {children}
    </a>
  ),
}));

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("text-case", () => ({
  titleCase: (s) => s,
  sentenceCase: (s) => s,
}));

import useSystemSettings from "@/hooks/useSystemSettings";

describe("ProviderPrivacy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders null while loading", () => {
    useSystemSettings.mockReturnValue({ settings: null, loading: true });
    const { container } = render(<ProviderPrivacy />);
    expect(container.innerHTML).toBe("");
  });

  it("renders three provider sections when settings are loaded", () => {
    useSystemSettings.mockReturnValue({
      settings: {
        LLMProvider: "openai",
        EmbeddingEngine: "native",
        VectorDB: "chroma",
      },
      loading: false,
    });
    render(<ProviderPrivacy />);
    expect(screen.getByText("LLM Provider")).toBeInTheDocument();
    expect(screen.getByText("Embedding Preference")).toBeInTheDocument();
    expect(screen.getByText("Vector Database")).toBeInTheDocument();
  });

  it("renders provider name from PROVIDER_PRIVACY_MAP", () => {
    useSystemSettings.mockReturnValue({
      settings: {
        LLMProvider: "openai",
        EmbeddingEngine: "native",
        VectorDB: "chroma",
      },
      loading: false,
    });
    render(<ProviderPrivacy />);
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("Chroma")).toBeInTheDocument();
  });

  it("renders privacy policy link when provider has policyUrl", () => {
    useSystemSettings.mockReturnValue({
      settings: {
        LLMProvider: "openai",
        EmbeddingEngine: "native",
        VectorDB: "chroma",
      },
      loading: false,
    });
    render(<ProviderPrivacy />);
    const link = screen.getByTestId("policy-link");
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe(
      "https://openai.com/policies/privacy-policy/",
    );
    expect(screen.getByText("privacy policy")).toBeInTheDocument();
  });

  it("renders description list when provider has no policyUrl", () => {
    useSystemSettings.mockReturnValue({
      settings: {
        LLMProvider: "ollama",
        EmbeddingEngine: "native",
        VectorDB: "lancedb",
      },
      loading: false,
    });
    render(<ProviderPrivacy />);
    expect(
      screen.getByText(
        "Your model and chats are only accessible on the machine running Ollama models.",
      ),
    ).toBeInTheDocument();
  });

  it("renders Unknown for null provider settings", () => {
    useSystemSettings.mockReturnValue({
      settings: { LLMProvider: null, EmbeddingEngine: null, VectorDB: null },
      loading: false,
    });
    render(<ProviderPrivacy />);
    const unknowns = screen.getAllByText("Unknown");
    expect(unknowns.length).toBe(3);
  });

  it("renders default provider name for unknown provider strings", () => {
    useSystemSettings.mockReturnValue({
      settings: {
        LLMProvider: "some-unknown-provider",
        EmbeddingEngine: "native",
        VectorDB: "chroma",
      },
      loading: false,
    });
    render(<ProviderPrivacy />);
    const matches = screen.getAllByText(/some-unknown-provider/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
