// SPDX-License-Identifier: MIT
/* eslint-disable jsx-a11y/aria-role -- role prop is consumed by UserIcon, not an ARIA role */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import UserIcon from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

const mockPfp = vi.fn(() => ({ pfp: null }));
vi.mock("../../hooks/usePfp", () => ({
  default: (...args) => mockPfp(...args),
}));

vi.mock("./user.svg", () => ({ default: "user.svg" }));
vi.mock("./workspace.svg", () => ({ default: "workspace.svg" }));

describe("UserIcon", () => {
  beforeEach(() => {
    mockPfp.mockReturnValue({ pfp: null });
  });

  it("renders the user icon container", () => {
    render(<UserIcon role="user" />);
    expect(screen.getByTestId("user-icon")).toBeInTheDocument();
  });

  it("renders workspace image for non-user roles", () => {
    render(<UserIcon role="assistant" />);
    const img = screen.getByAltText("System profile picture");
    expect(img).toBeInTheDocument();
  });

  it("renders user profile picture when available", () => {
    mockPfp.mockReturnValue({ pfp: "data:image/png;base64,abc123" });
    render(<UserIcon role="user" />);
    const img = screen.getByAltText("User profile picture");
    expect(img).toHaveAttribute("src", "data:image/png;base64,abc123");
  });

  it("renders default user image when no pfp is set", () => {
    render(<UserIcon role="user" />);
    const img = screen.getByAltText("User profile picture");
    expect(img).toHaveAttribute("src", "user.svg");
  });
});
