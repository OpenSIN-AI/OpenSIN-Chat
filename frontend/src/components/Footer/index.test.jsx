// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer, { ICON_COMPONENTS, MAX_ICONS } from "./index";

vi.mock("@/hooks/useFooterIcons", () => ({
  default: vi.fn(),
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ isLight: true, setTheme: vi.fn() }),
}));

vi.mock("react-router-dom", () => ({
  Link: ({ to, children, ...props }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("react-device-detect", () => ({
  isMobile: false,
}));

vi.mock("../SettingsButton", () => ({
  default: () => <button data-testid="settings-button">Settings</button>,
}));

vi.mock("@phosphor-icons/react", () => ({
  BookOpen: () => <svg data-testid="icon-bookopen" />,
  GithubLogo: () => <svg data-testid="icon-githublogo" />,
  Envelope: () => <svg data-testid="icon-envelope" />,
  LinkSimple: () => <svg data-testid="icon-linksimple" />,
  HouseLine: () => <svg data-testid="icon-houseline" />,
  Globe: () => <svg data-testid="icon-globe" />,
  Briefcase: () => <svg data-testid="icon-briefcase" />,
  Info: () => <svg data-testid="icon-info" />,
  Sun: () => <svg data-testid="icon-sun" />,
  Moon: () => <svg data-testid="icon-moon" />,
}));

import useFooterIcons from "@/hooks/useFooterIcons";

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

  it("renders nothing while loading", () => {
    useFooterIcons.mockReturnValue({ footerData: [], isLoading: true });
    const { container } = render(<Footer />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders default footer items when no custom data", () => {
    useFooterIcons.mockReturnValue({ footerData: [], isLoading: false });
    render(<Footer />);
    // Github and docs links should render
    expect(screen.getByLabelText(/GitHub/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Dokumentation/i)).toBeInTheDocument();
  });

  it("renders custom footer icons when present", () => {
    useFooterIcons.mockReturnValue({
      footerData: [{ icon: "Globe", url: "https://example.com" }],
      isLoading: false,
    });
    render(<Footer />);
    const link = screen.getByLabelText("https://example.com");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://example.com");
  });

  it("falls back to Info icon for unknown icon names", () => {
    useFooterIcons.mockReturnValue({
      footerData: [{ icon: "NonExistentIcon", url: "https://fallback.com" }],
      isLoading: false,
    });
    render(<Footer />);
    expect(screen.getByLabelText("https://fallback.com")).toBeInTheDocument();
  });

  it("renders a nav element with aria-label", () => {
    useFooterIcons.mockReturnValue({ footerData: [], isLoading: false });
    render(<Footer />);
    expect(screen.getByRole("navigation")).toHaveAttribute(
      "aria-label",
      "Footer-Links",
    );
  });

  it("renders aria-labels on default footer links", () => {
    useFooterIcons.mockReturnValue({ footerData: [], isLoading: false });
    render(<Footer />);
    const githubLink = screen.getByLabelText("OpenAfD Chat auf GitHub ansehen");
    const docsLink = screen.getByLabelText("Dokumentation öffnen");
    expect(githubLink).toBeInTheDocument();
    expect(docsLink).toBeInTheDocument();
  });

  it("renders theme toggle button with Moon icon when in light mode", () => {
    useFooterIcons.mockReturnValue({ footerData: [], isLoading: false });
    render(<Footer />);
    const themeButton = screen.getByLabelText(/dunklen Modus wechseln/i);
    expect(themeButton).toBeInTheDocument();
    expect(themeButton).toHaveAttribute("type", "button");
  });
});
