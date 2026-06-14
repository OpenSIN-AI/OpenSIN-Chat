// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import MessageList from "./MessageList";

vi.mock("./ChatHistory", () => ({
  default: vi.fn(() => <div data-testid="chat-history" />),
}));

vi.mock("./PromptInput", () => ({
  default: vi.fn(() => <div data-testid="prompt-input" />),
}));

vi.mock("./ChatHistory/HistoricalMessage/Actions/RenderMetrics", () => ({
  MetricsProvider: ({ children }) => (
    <div data-testid="metrics">{children}</div>
  ),
}));

describe("MessageList", () => {
  it("renders ChatHistory and PromptInput", () => {
    const { getByTestId } = render(
      <MessageList chatHistory={[]} workspace={{}} />,
    );
    expect(getByTestId("metrics")).toBeInTheDocument();
    expect(getByTestId("chat-history")).toBeInTheDocument();
    expect(getByTestId("prompt-input")).toBeInTheDocument();
  });
});
