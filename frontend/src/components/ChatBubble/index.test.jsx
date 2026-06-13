// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ChatBubble from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("../UserIcon", () => ({
  default: ({ role, user }) => (
    <div data-testid="user-icon" data-role={role} data-user={user?.uid} />
  ),
}));

vi.mock("@/utils/request", () => ({
  userFromStorage: vi.fn(() => ({ username: "test-user" })),
}));

vi.mock("@/utils/chat/markdown", () => ({
  default: (text) => `<p>${text}</p>`,
}));

vi.mock("@/utils/chat/purify", () => ({
  default: {
    sanitize: (html) => html,
  },
}));

describe("ChatBubble", () => {
  it("renders a user message with the user icon", () => {
    render(<ChatBubble message="Hello, assistant!" type="user" />);
    const icon = screen.getByTestId("user-icon");
    expect(icon).toBeInTheDocument();
    expect(icon.getAttribute("data-role")).toBe("user");
    expect(icon.getAttribute("data-user")).toBe("test-user");
    expect(screen.getByText("Hello, assistant!")).toBeInTheDocument();
  });

  it("renders an assistant message with the system icon", () => {
    render(<ChatBubble message="Hello, user!" type="assistant" />);
    const icon = screen.getByTestId("user-icon");
    expect(icon.getAttribute("data-role")).toBe("assistant");
    expect(icon.getAttribute("data-user")).toBe("system");
    expect(screen.getByText("Hello, user!")).toBeInTheDocument();
  });

  it("sanitizes and renders markdown content", () => {
    render(<ChatBubble message="**bold**" type="assistant" />);
    expect(screen.getByText("**bold**")).toBeInTheDocument();
  });

  it("renders with different message types", () => {
    const { container } = render(
      <ChatBubble message="System message" type="system" />,
    );
    expect(
      container.querySelector(".bg-theme-bg-secondary"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("user-icon")).toBeInTheDocument();
  });
});
