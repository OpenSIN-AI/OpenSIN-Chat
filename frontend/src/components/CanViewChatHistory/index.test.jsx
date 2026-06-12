// SPDX-License-Identifier: MIT
/* eslint-disable i18next/no-literal-string */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CanViewChatHistory, CanViewChatHistoryProvider } from "./index";

vi.mock("@/hooks/useCanViewChatHistory", () => ({
  default: vi.fn(),
  useCanViewChatHistory: vi.fn(),
}));

vi.mock("@/components/Preloader", () => ({
  FullScreenLoader: () => <div data-testid="full-screen-loader">Loading</div>,
}));

vi.mock("@/utils/paths", () => ({
  default: { home: () => "/" },
}));

import useCanViewChatHistory from "@/hooks/useCanViewChatHistory";

{/* eslint-disable i18next/no-literal-string */}
describe("CanViewChatHistory", () => {
  it("renders children when viewable and not loading", () => {
    useCanViewChatHistory.mockReturnValue({
      loading: false,
      viewable: true,
    });
    render(
      <CanViewChatHistory>
        <div data-testid="child">Chat Content</div>
      </CanViewChatHistory>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("shows loader when loading", () => {
    useCanViewChatHistory.mockReturnValue({
      loading: true,
      viewable: false,
    });
    render(
      <CanViewChatHistory>
        <div data-testid="child">Chat Content</div>
      </CanViewChatHistory>,
    );
    expect(screen.getByTestId("full-screen-loader")).toBeInTheDocument();
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
  });

  it("redirects to home when not viewable and not loading", () => {
    const originalLocation = window.location;
    delete window.location;
    window.location = { href: "" };

    useCanViewChatHistory.mockReturnValue({
      loading: false,
      viewable: false,
    });
    render(
      <CanViewChatHistory>
        <div data-testid="child">Chat Content</div>
      </CanViewChatHistory>,
    );
    expect(window.location.href).toBe("/");
    expect(screen.getByTestId("full-screen-loader")).toBeInTheDocument();
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();

    window.location = originalLocation;
  });
});
{/* eslint-enable i18next/no-literal-string */}

{/* eslint-disable i18next/no-literal-string */}
describe("CanViewChatHistoryProvider", () => {
  it("renders children with viewable prop when not loading", () => {
    useCanViewChatHistory.mockReturnValue({
      loading: false,
      viewable: true,
    });
    render(
      <CanViewChatHistoryProvider>
        {({ viewable }) => (
          <div data-testid="provider-child">{viewable ? "yes" : "no"}</div>
        )}
      </CanViewChatHistoryProvider>,
    );
    expect(screen.getByTestId("provider-child")).toHaveTextContent("yes");
  });

  it("returns null when loading", () => {
    useCanViewChatHistory.mockReturnValue({
      loading: true,
      viewable: false,
    });
    const { container } = render(
      <CanViewChatHistoryProvider>
        {({ viewable }) => <div>content</div>}
      </CanViewChatHistoryProvider>,
    );
    expect(container.innerHTML).toBe("");
  });

  it("passes viewable=false when not viewable and not loading", () => {
    useCanViewChatHistory.mockReturnValue({
      loading: false,
      viewable: false,
    });
    render(
      <CanViewChatHistoryProvider>
        {({ viewable }) => (
          <div data-testid="provider-child">{viewable ? "yes" : "no"}</div>
        )}
      </CanViewChatHistoryProvider>,
    );
    expect(screen.getByTestId("provider-child")).toHaveTextContent("no");
  });
});
{/* eslint-enable i18next/no-literal-string */}
