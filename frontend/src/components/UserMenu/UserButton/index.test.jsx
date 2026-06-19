// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UserButton from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

const mockLoginMode = vi.fn(() => "multi");
const mockPfp = vi.fn(() => ({ pfp: null }));
const mockUser = vi.fn(() => ({
  user: { username: "TestUser", role: "admin" },
}));
const mockSupportEmail = vi.fn(() => ({ email: "support@example.com" }));

vi.mock("@/hooks/useLoginMode", () => ({
  default: () => mockLoginMode(),
}));

vi.mock("@/hooks/usePfp", () => ({
  default: () => mockPfp(),
}));

vi.mock("@/hooks/useUser", () => ({
  default: () => mockUser(),
}));

vi.mock("@/hooks/useSupportEmail", () => ({
  default: () => mockSupportEmail(),
}));

vi.mock("@/utils/request", () => ({
  userFromStorage: vi.fn(() => ({ username: "TestUser" })),
}));

vi.mock("../AccountModal", () => ({
  default: ({ user, hideModal }) => (
    <div data-testid="account-modal" data-user={user?.username}>
      <button type="button" onClick={hideModal}>
        Close
      </button>
    </div>
  ),
}));

describe("UserButton", () => {
  beforeEach(() => {
    mockLoginMode.mockReturnValue("multi");
    mockPfp.mockReturnValue({ pfp: null });
    mockUser.mockReturnValue({ user: { username: "TestUser", role: "admin" } });
    mockSupportEmail.mockReturnValue({ email: "support@example.com" });
    vi.clearAllMocks();
  });

  it("returns null when login mode is not set", () => {
    mockLoginMode.mockReturnValue(null);
    const { container } = render(<UserButton />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the user button in multi-user mode", () => {
    render(<UserButton />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("toggles the menu when clicked", () => {
    render(<UserButton />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(screen.getByText("Account")).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.queryByText("Account")).not.toBeInTheDocument();
  });

  it("closes the menu when clicking outside", () => {
    render(<UserButton />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Account")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("Account")).not.toBeInTheDocument();
  });

  it("opens the account modal when account is clicked", () => {
    render(<UserButton />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Account"));
    expect(screen.getByTestId("account-modal")).toBeInTheDocument();
  });

  it("shows the support email link", () => {
    render(<UserButton />);
    fireEvent.click(screen.getByRole("button"));
    const supportLink = screen.getByText("Support");
    expect(supportLink).toHaveAttribute("href", "mailto:support@example.com");
  });

  it("clears localStorage and redirects on sign out", () => {
    const removeItemSpy = vi
      .spyOn(window.localStorage, "removeItem")
      .mockImplementation(() => {});
    const originalLocation = window.location;
    const replaceMock = vi.fn();
    delete window.location;
    window.location = { ...originalLocation, replace: replaceMock };
    render(<UserButton />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Sign out"));
    expect(removeItemSpy).toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith("/");
    window.location = originalLocation;
    removeItemSpy.mockRestore();
  });
});
