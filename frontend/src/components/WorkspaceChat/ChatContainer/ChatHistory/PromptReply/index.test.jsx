// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PromptReply from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@/utils/chat/markdown", () => ({
  default: (text) => `<p>${text}</p>`,
}));

vi.mock("@/utils/chat/purify", () => ({
  default: {
    sanitize: (html) => html,
  },
}));

vi.mock("../Citation", () => ({
  default: ({ sources }) => (
    <div data-testid="citations" data-count={sources.length}>
      Citations
    </div>
  ),
}));

vi.mock("../ThoughtContainer", () => ({
  THOUGHT_REGEX_OPEN: /<thinking>/,
  THOUGHT_REGEX_CLOSE: /<\/thinking>/,
  THOUGHT_REGEX_COMPLETE: /<thinking>[\s\S]*?<\/thinking>/,
  ThoughtChainComponent: ({ content }) => (
    <div data-testid="thought-chain" data-content={content}>
      Thought Chain
    </div>
  ),
  ThoughtBrainButton: ({ content }) => (
    <button type="button" data-testid="brain-button" data-content={content}>
      Brain
    </button>
  ),
}));

describe("PromptReply", () => {
  it("returns null when there is no reply, sources, pending, or error", () => {
    const { container } = render(<PromptReply uuid="1" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the shimmering activity state when pending", () => {
    const { container } = render(<PromptReply uuid="1" pending={true} />);
    expect(container.querySelector(".thinking-shimmer")).toBeInTheDocument();
  });

  it("renders an error message when error is provided", () => {
    render(<PromptReply uuid="1" error="Something went wrong" />);
    expect(screen.getByText(/could not respond/i)).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });

  it("renders the error id when one is provided (Issue #371)", () => {
    render(
      <PromptReply
        uuid="1"
        error="Internal error"
        errorId="123e4567-e89b-12d3-a456-426614174000"
      />,
    );
    expect(
      screen.getByText(/123e4567-e89b-12d3-a456-426614174000/i),
    ).toBeInTheDocument();
  });

  it("does not render an error id line when errorId is absent", () => {
    render(<PromptReply uuid="1" error="Internal error" />);
    expect(screen.getByText(/could not respond/i)).toBeInTheDocument();
    expect(screen.queryByText(/Error ID:/i)).not.toBeInTheDocument();
  });

  it("renders the reply container when a reply is provided", () => {
    const { container } = render(<PromptReply uuid="1" reply="Hello, user!" />);
    expect(
      container.querySelector(".flex.justify-start.w-full"),
    ).toBeInTheDocument();
  });

  it("renders citations when sources are provided", () => {
    render(
      <PromptReply
        uuid="1"
        reply="Hello, user!"
        sources={[{ id: 1 }, { id: 2 }]}
      />,
    );
    expect(screen.getByTestId("citations")).toHaveAttribute("data-count", "2");
  });
});
