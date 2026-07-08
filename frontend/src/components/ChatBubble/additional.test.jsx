// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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

vi.mock("../UserIcon", () => ({
  default: ({ role, user }) => (
    <div data-testid="user-icon" data-role={role} data-user={user?.uid} />
  ),
}));

vi.mock("@/utils/request", () => ({
  userFromStorage: vi.fn(() => ({ username: "test-user" })),
}));

import ChatBubble from "./index";

describe("ChatBubble additional tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty message without crashing", () => {
    render(<ChatBubble message="" type="user" />);
    expect(screen.getByTestId("user-icon")).toBeInTheDocument();
  });

  it("renders long message content", () => {
    const longMsg = "a".repeat(500);
    render(<ChatBubble message={longMsg} type="assistant" />);
    expect(screen.getByText(longMsg)).toBeInTheDocument();
  });

  it("has role article for accessibility", () => {
    render(<ChatBubble message="test" type="user" />);
    expect(screen.getByRole("article")).toBeInTheDocument();
  });

  it("has aria-label 'User message' for user type", () => {
    render(<ChatBubble message="test" type="user" />);
    expect(screen.getByRole("article")).toHaveAttribute("aria-label", "User message");
  });

  it("has aria-label 'Assistant message' for assistant type", () => {
    render(<ChatBubble message="test" type="assistant" />);
    expect(screen.getByRole("article")).toHaveAttribute("aria-label", "Assistant message");
  });

  it("renders markdown with special characters", () => {
    render(<ChatBubble message="# Header\n\n**bold**" type="assistant" />);
    expect(screen.getByRole("article")).toBeInTheDocument();
  });
});
