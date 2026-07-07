// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Footer, { ICON_COMPONENTS, MAX_ICONS } from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@/hooks/useUser", () => ({
  default: () => ({
    user: { id: 1, username: "OpenSIN", email: null },
  }),
}));

vi.mock("@/hooks/usePfp", () => ({
  default: () => ({ pfp: null, setPfp: vi.fn() }),
}));

vi.mock("@/hooks/useLoginMode", () => ({
  default: () => "multi",
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: "system",
    setTheme: vi.fn(),
    availableThemes: { system: "System", light: "Light", dark: "Dark" },
    isLight: false,
  }),
}));
vi.mock("@/ThemeContext", () => ({
  useThemeContext: () => ({
    theme: "system",
    setTheme: vi.fn(),
    availableThemes: { system: "System", light: "Light", dark: "Dark" },
    isLight: false,
  }),
}));

vi.mock("@/hooks/useLanguageOptions", () => ({
  useLanguageOptions: () => ({
    currentLanguage: "en",
    supportedLanguages: ["en", "de"],
    getLanguageName: (lang) => (lang === "de" ? "Deutsch" : "English"),
    changeLanguage: vi.fn(),
  }),
}));

vi.mock("../UserMenu/AccountModal", () => ({
  default: () => <div data-testid="account-modal" />,
}));

vi.mock("react-router-dom", () => ({
  Link: ({ to, children, ...props }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@phosphor-icons/react/dist/csr/ArrowUpRight", () => ({
  default: (props) => <svg data-testid="icon-arrowupright" {...props} />,
  ArrowUpRight: (props) => <svg data-testid="icon-arrowupright" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/BookOpen", () => ({
  default: (props) => <svg data-testid="icon-bookopen" {...props} />,
  BookOpen: (props) => <svg data-testid="icon-bookopen" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/CaretUpDown", () => ({
  default: (props) => <svg data-testid="icon-caretupdown" {...props} />,
  CaretUpDown: (props) => <svg data-testid="icon-caretupdown" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/ChatCircleText", () => ({
  default: (props) => <svg data-testid="icon-chatcircletext" {...props} />,
  ChatCircleText: (props) => (
    <svg data-testid="icon-chatcircletext" {...props} />
  ),
}));
vi.mock("@phosphor-icons/react/dist/csr/Desktop", () => ({
  default: (props) => <svg data-testid="icon-desktop" {...props} />,
  Desktop: (props) => <svg data-testid="icon-desktop" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/Gear", () => ({
  default: (props) => <svg data-testid="icon-gear" {...props} />,
  Gear: (props) => <svg data-testid="icon-gear" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/GithubLogo", () => ({
  default: (props) => <svg data-testid="icon-githublogo" {...props} />,
  GithubLogo: (props) => <svg data-testid="icon-githublogo" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/Briefcase", () => ({
  default: (props) => <svg data-testid="icon-briefcase" {...props} />,
  Briefcase: (props) => <svg data-testid="icon-briefcase" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/Envelope", () => ({
  default: (props) => <svg data-testid="icon-envelope" {...props} />,
  Envelope: (props) => <svg data-testid="icon-envelope" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/Globe", () => ({
  default: (props) => <svg data-testid="icon-globe" {...props} />,
  Globe: (props) => <svg data-testid="icon-globe" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/HouseLine", () => ({
  default: (props) => <svg data-testid="icon-houseline" {...props} />,
  HouseLine: (props) => <svg data-testid="icon-houseline" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/Info", () => ({
  default: (props) => <svg data-testid="icon-info" {...props} />,
  Info: (props) => <svg data-testid="icon-info" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/LinkSimple", () => ({
  default: (props) => <svg data-testid="icon-linksimple" {...props} />,
  LinkSimple: (props) => <svg data-testid="icon-linksimple" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/Moon", () => ({
  default: (props) => <svg data-testid="icon-moon" {...props} />,
  Moon: (props) => <svg data-testid="icon-moon" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/SignIn", () => ({
  default: (props) => <svg data-testid="icon-signin" {...props} />,
  SignIn: (props) => <svg data-testid="icon-signin" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/SignOut", () => ({
  default: (props) => <svg data-testid="icon-signout" {...props} />,
  SignOut: (props) => <svg data-testid="icon-signout" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/Sun", () => ({
  default: (props) => <svg data-testid="icon-sun" {...props} />,
  Sun: (props) => <svg data-testid="icon-sun" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/UserCircle", () => ({
  default: (props) => <svg data-testid="icon-usercircle" {...props} />,
  UserCircle: (props) => <svg data-testid="icon-usercircle" {...props} />,
}));

describe("Footer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports ICON_COMPONENTS map with all icons", () => {
    expect(Object.keys(ICON_COMPONENTS).length).toBeGreaterThan(0);
    expect(ICON_COMPONENTS.GithubLogo).toBeDefined();
    expect(ICON_COMPONENTS.BookOpen).toBeDefined();
    expect(ICON_COMPONENTS.Info).toBeDefined();
  });

  it("exports MAX_ICONS constant", () => {
    expect(MAX_ICONS).toBe(3);
  });

  it("renders the account trigger with name and demo subtitle", () => {
    render(<Footer />);
    expect(screen.getByText("OpenSIN")).toBeInTheDocument();
    expect(screen.getByText("Demo account")).toBeInTheDocument();
  });

  it("does not show the menu items until the trigger is clicked", () => {
    render(<Footer />);
    expect(screen.queryByText("Profile")).not.toBeInTheDocument();
  });

  it("opens the menu with all entries on click", () => {
    render(<Footer />);
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Documentation")).toBeInTheDocument();
    expect(screen.getByText("Feedback")).toBeInTheDocument();
    expect(screen.getByText("Theme")).toBeInTheDocument();
    expect(screen.getByText("Language")).toBeInTheDocument();
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  it("links Feedback to the GitHub new issue page", () => {
    render(<Footer />);
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    const feedback = screen.getByText("Feedback").closest("a");
    expect(feedback).toHaveAttribute(
      "href",
      expect.stringContaining("/issues/new"),
    );
    expect(feedback).toHaveAttribute("target", "_blank");
  });
});
