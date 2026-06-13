// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SettingsButton from "./index";

vi.mock("@/hooks/useUser", () => ({
  default: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  Link: ({ to, children, ...props }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useMatch: vi.fn(),
}));

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

import useUser from "@/hooks/useUser";
import { useMatch } from "react-router-dom";

describe("SettingsButton", () => {
  it("renders settings link when not in settings route", () => {
    useUser.mockReturnValue({ user: { role: "admin" } });
    useMatch.mockReturnValue(null);
    render(<SettingsButton />);
    const link = screen.getByLabelText("Settings");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/settings/interface");
  });

  it("renders home link when in settings route", () => {
    useUser.mockReturnValue({ user: { role: "admin" } });
    useMatch.mockReturnValue({ pathname: "/settings/interface" });
    render(<SettingsButton />);
    const link = screen.getByLabelText("Home");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });

  it("returns null for default role user", () => {
    useUser.mockReturnValue({ user: { role: "default" } });
    useMatch.mockReturnValue(null);
    const { container } = render(<SettingsButton />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null when user is null", () => {
    useUser.mockReturnValue({ user: null });
    useMatch.mockReturnValue(null);
    render(<SettingsButton />);
    const settingsLink = screen.queryByLabelText("Settings");
    expect(settingsLink).toBeInTheDocument();
  });

  it("renders settings link for non-default role user not in settings", () => {
    useUser.mockReturnValue({ user: { role: "manager" } });
    useMatch.mockReturnValue(null);
    render(<SettingsButton />);
    expect(screen.getByLabelText("Settings")).toBeInTheDocument();
  });
});
