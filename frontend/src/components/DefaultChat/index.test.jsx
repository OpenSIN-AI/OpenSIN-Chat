// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DefaultChatContainer from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@/hooks/useUser", () => ({
  default: vi.fn(() => ({ user: { username: "TestUser", role: "admin" } })),
}));

vi.mock("@/hooks/useLogo", () => ({
  default: vi.fn(() => ({ logo: "/logo.png" })),
}));

const mockWorkspaces = vi.fn(() => ({
  workspaces: [],
  isLoading: false,
}));

vi.mock("@/hooks/useWorkspaces", () => ({
  default: vi.fn(() => mockWorkspaces()),
}));

vi.mock("@/models/appearance", () => ({
  default: {
    getSettings: vi.fn(() => ({ showScrollbar: false })),
    get: vi.fn(() => false),
  },
}));

vi.mock("react-device-detect", () => ({
  isMobile: false,
}));

vi.mock("@/utils/request", () => ({
  safeJsonParse: vi.fn((value, fallback) => {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }),
  userFromStorage: vi.fn(() => ({ username: "TestUser" })),
}));

describe("DefaultChatContainer", () => {
  beforeEach(() => {
    mockWorkspaces.mockReturnValue({
      workspaces: [],
      isLoading: false,
    });
  });

  it("shows loading skeleton when workspaces are loading", () => {
    mockWorkspaces.mockReturnValue({
      workspaces: [],
      isLoading: true,
    });
    const { container } = render(
      <MemoryRouter>
        <DefaultChatContainer />
      </MemoryRouter>,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows no workspaces message when user has no workspaces", () => {
    render(
      <MemoryRouter>
        <DefaultChatContainer />
      </MemoryRouter>,
    );
    expect(screen.getByText(/aren't assigned/i)).toBeInTheDocument();
  });

  it("shows a link to the first workspace when workspaces exist", () => {
    mockWorkspaces.mockReturnValue({
      workspaces: [{ id: 1, slug: "ws-1", name: "Workspace One" }],
      isLoading: false,
    });
    render(
      <MemoryRouter>
        <DefaultChatContainer />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Choose a workspace/i)).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/workspace/ws-1");
  });

  it("uses the last visited workspace slug when available", () => {
    const workspace = { id: 2, slug: "ws-2", name: "Workspace Two" };
    window.localStorage.getItem.mockReturnValueOnce(JSON.stringify(workspace));
    mockWorkspaces.mockReturnValue({
      workspaces: [
        { id: 1, slug: "ws-1", name: "Workspace One" },
        { id: 2, slug: "ws-2", name: "Workspace Two" },
      ],
      isLoading: false,
    });
    render(
      <MemoryRouter>
        <DefaultChatContainer />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/workspace/ws-2");
  });
});
