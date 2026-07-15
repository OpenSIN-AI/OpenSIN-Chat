// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@/hooks/useCanViewChatHistory", () => ({
  default: vi.fn(),
  useCanViewChatHistory: vi.fn(),
}));

import { CanViewChatHistory, CanViewChatHistoryProvider } from "./index";
import useCanViewChatHistory from "@/hooks/useCanViewChatHistory";

describe("CanViewChatHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders FullScreenLoader when loading", () => {
    vi.mocked(useCanViewChatHistory).mockReturnValue({
      loading: true,
      viewable: false,
    });
    const { container } = render(
      <MemoryRouter>
        <CanViewChatHistory>
          <div>Content</div>
        </CanViewChatHistory>
      </MemoryRouter>,
    );
    expect(container.querySelector("#preloader")).toBeInTheDocument();
  });

  it("renders children when viewable is true", () => {
    vi.mocked(useCanViewChatHistory).mockReturnValue({
      loading: false,
      viewable: true,
    });
    render(
      <MemoryRouter>
        <CanViewChatHistory>
          <div data-testid="content">Protected Content</div>
        </CanViewChatHistory>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("redirects to home when not viewable", () => {
    vi.mocked(useCanViewChatHistory).mockReturnValue({
      loading: false,
      viewable: false,
    });
    const { container } = render(
      <MemoryRouter>
        <CanViewChatHistory>
          <div data-testid="content">Protected Content</div>
        </CanViewChatHistory>
      </MemoryRouter>,
    );
    // Should show preloader (redirecting) and not render children
    expect(container.querySelector("#preloader")).toBeInTheDocument();
    expect(screen.queryByTestId("content")).not.toBeInTheDocument();
  });
});

describe("CanViewChatHistoryProvider", () => {
  it("renders null when loading", () => {
    vi.mocked(useCanViewChatHistory).mockReturnValue({
      loading: true,
      viewable: false,
    });
    const { container } = render(
      <MemoryRouter>
        <CanViewChatHistoryProvider>
          {({ viewable }) => <div>{viewable ? "yes" : "no"}</div>}
        </CanViewChatHistoryProvider>
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders children with viewable=true when not loading and viewable", () => {
    vi.mocked(useCanViewChatHistory).mockReturnValue({
      loading: false,
      viewable: true,
    });
    render(
      <MemoryRouter>
        <CanViewChatHistoryProvider>
          {({ viewable }) => (
            <div data-testid="result">{viewable ? "yes" : "no"}</div>
          )}
        </CanViewChatHistoryProvider>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("result")).toHaveTextContent("yes");
  });

  it("renders children with viewable=false when not loading and not viewable", () => {
    vi.mocked(useCanViewChatHistory).mockReturnValue({
      loading: false,
      viewable: false,
    });
    render(
      <MemoryRouter>
        <CanViewChatHistoryProvider>
          {({ viewable }) => (
            <div data-testid="result">{viewable ? "yes" : "no"}</div>
          )}
        </CanViewChatHistoryProvider>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("result")).toHaveTextContent("no");
  });
});
