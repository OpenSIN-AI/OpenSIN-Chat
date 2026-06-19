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
    user: { id: 1, username: "OpenAfD", email: null },
  }),
}));

vi.mock("@/hooks/usePfp", () => ({
  default: () => ({ pfp: null, setPfp: vi.fn() }),
}));

vi.mock("@/hooks/useLoginMode", () => ({
  default: () => "multi",
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ theme: "system", setTheme: vi.fn() }),
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

vi.mock("@phosphor-icons/react", () => {
  const stub = (name) => {
    const C = () => <svg data-testid={`icon-${name}`} />;
    return C;
  };
  return {
    ArrowUpRight: stub("arrowupright"),
    BookOpen: stub("bookopen"),
    CaretUpDown: stub("caretupdown"),
    ChatCircleText: stub("chatcircletext"),
    Desktop: stub("desktop"),
    Gear: stub("gear"),
    GithubLogo: stub("githublogo"),
    Briefcase: stub("briefcase"),
    Envelope: stub("envelope"),
    Globe: stub("globe"),
    HouseLine: stub("houseline"),
    Info: stub("info"),
    LinkSimple: stub("linksimple"),
    Moon: stub("moon"),
    SignIn: stub("signin"),
    SignOut: stub("signout"),
    Sun: stub("sun"),
    UserCircle: stub("usercircle"),
  };
});

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
    expect(screen.getByText("OpenAfD")).toBeInTheDocument();
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
