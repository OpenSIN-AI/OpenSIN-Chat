// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import MessageList from "./MessageList";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

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
  it("renders ChatHistory and PromptInput when history exists", () => {
    const { getByTestId, queryByText } = render(
      <MessageList
        chatHistory={[{ uuid: "msg-1", content: "hi" }]}
        workspace={{}}
      />,
    );
    expect(getByTestId("metrics")).toBeInTheDocument();
    expect(getByTestId("chat-history")).toBeInTheDocument();
    expect(getByTestId("prompt-input")).toBeInTheDocument();
    expect(
      queryByText("No messages yet. Start the conversation."),
    ).not.toBeInTheDocument();
  });

  it("renders an empty-state message when history is empty", () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <MessageList chatHistory={[]} workspace={{}} />,
    );
    expect(
      getByText("No messages yet. Start the conversation."),
    ).toBeInTheDocument();
    expect(getByTestId("prompt-input")).toBeInTheDocument();
    expect(queryByTestId("metrics")).not.toBeInTheDocument();
  });
});
