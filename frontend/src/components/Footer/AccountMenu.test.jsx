// SPDX-License-Identifier: MIT
// Issue #156: verify the v0-style AccountMenu renders correctly across themes
// and login states. jsdom has no layout engine, so we assert structure,
// a11y roles, portal placement and width clamping rather than pixel visuals.
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

// ── Mocks ───────────────────────────────────────────────────────────────────
// react-router <Link> needs a Router; stub it to a plain anchor.
vi.mock("react-router", () => ({
  Link: ({ to, children, ...rest }) => (
    <a href={typeof to === "string" ? to : "#"} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@/utils/paths", () => ({
  default: {
    github: () => "https://github.com/OpenSIN-AI/OpenSIN-Chat",
    home: () => "/",
    login: () => "/login",
    appDocs: () => "/docs",
    settings: { interface: () => "/settings/interface" },
  },
}));

const setTheme = vi.fn();
let currentTheme = "dark";
vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: currentTheme,
    setTheme,
    availableThemes: { system: "System", light: "Light", dark: "Dark" },
    isLight: currentTheme === "light",
  }),
}));
vi.mock("@/ThemeContext", () => ({
  useThemeContext: () => ({
    theme: currentTheme,
    setTheme,
    availableThemes: { system: "System", light: "Light", dark: "Dark" },
    isLight: currentTheme === "light",
  }),
}));

const changeLanguage = vi.fn();
vi.mock("@/hooks/useLanguageOptions", () => ({
  useLanguageOptions: () => ({
    currentLanguage: "de",
    supportedLanguages: ["de", "en"],
    getLanguageName: (l) => ({ de: "Deutsch", en: "English" })[l] || l,
    changeLanguage,
  }),
}));

let loginMode = "multi"; // non-null => logged in
vi.mock("@/hooks/useLoginMode", () => ({ default: () => loginMode }));

let mockUser = { username: "Tester", email: "tester@example.com" };
vi.mock("@/hooks/useUser", () => ({ default: () => ({ user: mockUser }) }));

vi.mock("@/hooks/usePfp", () => ({ default: () => ({ pfp: null }) }));

vi.mock("../UserMenu/AccountModal", () => ({
  default: () => <div data-testid="account-modal" />,
}));

import AccountMenu from "./AccountMenu";

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: /(Tester|OpenSIN)/i }));
}

beforeEach(() => {
  currentTheme = "dark";
  loginMode = "multi";
  mockUser = { username: "Tester", email: "tester@example.com" };
  vi.clearAllMocks();
});

describe("AccountMenu", () => {
  it("renders the trigger with display name, subtitle and avatar initials", () => {
    render(<AccountMenu />);
    const trigger = screen.getByRole("button", { name: /Tester/i });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(within(trigger).getByText("Tester")).toBeInTheDocument();
    expect(within(trigger).getByText("tester@example.com")).toBeInTheDocument();
    // Avatar fallback shows uppercased initials (first two chars).
    expect(within(trigger).getByText("TE")).toBeInTheDocument();
  });

  it("opens a portaled menu rendered outside the sidebar container", () => {
    const { container } = render(<AccountMenu />);
    openMenu();
    const menu = screen.getByRole("menu");
    expect(menu).toBeInTheDocument();
    // Portal => menu must NOT live inside the component's own subtree.
    expect(container.contains(menu)).toBe(false);
    expect(document.body.contains(menu)).toBe(true);
  });

  it("clamps popup width between 248 and 300px", () => {
    render(<AccountMenu />);
    openMenu();
    const menu = screen.getByRole("menu");
    const width = parseInt(menu.style.width, 10);
    expect(width).toBeGreaterThanOrEqual(248);
    expect(width).toBeLessThanOrEqual(300);
    // Anchored upward via `bottom`, not `top`.
    expect(menu.style.bottom).not.toBe("");
  });

  it("exposes the theme segment with System/Hell/Dunkel and switches theme", () => {
    render(<AccountMenu />);
    openMenu();
    for (const label of ["System", "Light", "Dark"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    expect(setTheme).toHaveBeenCalledWith("light");
  });

  it("marks the active theme button with aria-pressed", () => {
    currentTheme = "light";
    render(<AccountMenu />);
    openMenu();
    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("renders the language switcher and changes language", () => {
    render(<AccountMenu />);
    openMenu();
    const select = screen.getByLabelText("Language");
    expect(select).toHaveValue("de");
    fireEvent.change(select, { target: { value: "en" } });
    expect(changeLanguage).toHaveBeenCalledWith("en");
  });

  it("shows the logout item when logged in", () => {
    render(<AccountMenu />);
    openMenu();
    expect(
      screen.getByRole("menuitem", { name: /Sign out/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /Sign in/i }),
    ).not.toBeInTheDocument();
  });

  it("opens the account profile modal instead of navigating to settings", () => {
    render(<AccountMenu />);
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /Profile/i }));
    expect(screen.getByTestId("account-modal")).toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("shows the login item when logged out", () => {
    loginMode = null;
    mockUser = null;
    render(<AccountMenu />);
    openMenu();
    expect(
      screen.getByRole("menuitem", { name: /Sign in/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /Sign out/i }),
    ).not.toBeInTheDocument();
  });

  it("does not turn the profile action into a settings link in single-user mode", () => {
    loginMode = "single";
    mockUser = null;
    render(<AccountMenu />);
    openMenu();
    expect(
      screen.queryByRole("menuitem", { name: /Profile/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /Settings/i }),
    ).toHaveAttribute("href", "/settings/interface");
  });

  it("closes the menu on Escape", () => {
    render(<AccountMenu />);
    openMenu();
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
