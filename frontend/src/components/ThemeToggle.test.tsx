// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ThemeToggle from "@/components/ThemeToggle";

vi.mock("@/ThemeContext", () => ({
  useThemeContext: vi.fn(),
}));

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

import { useThemeContext } from "@/ThemeContext";

const mockSetTheme = vi.fn();

function createMockContext(
  theme: "light" | "dark" | "system",
  isLight: boolean,
) {
  return {
    theme,
    setTheme: mockSetTheme,
    availableThemes: { system: "System", light: "Light", dark: "Dark" },
    isLight,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ThemeToggle", () => {
  it("renders nothing when useThemeContext returns null", () => {
    vi.mocked(useThemeContext).mockReturnValue(null);
    const { container } = render(<ThemeToggle />);
    expect(container.firstChild).toBeNull();
  });

  it("renders Moon icon when isLight is true", () => {
    vi.mocked(useThemeContext).mockReturnValue(
      createMockContext("light", true),
    );
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button.querySelector("svg")).toBeInTheDocument();
  });

  it("renders Sun icon when isLight is false", () => {
    vi.mocked(useThemeContext).mockReturnValue(
      createMockContext("dark", false),
    );
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button.querySelector("svg")).toBeInTheDocument();
  });

  it("cycles light → dark → system → light on click", () => {
    let theme: "light" | "dark" | "system" = "light";
    vi.mocked(useThemeContext).mockImplementation(() =>
      createMockContext(theme, theme === "light"),
    );
    mockSetTheme.mockImplementation((next: "light" | "dark" | "system") => {
      theme = next;
    });

    const { rerender } = render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button"));
    expect(mockSetTheme).toHaveBeenCalledWith("dark");

    rerender(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockSetTheme).toHaveBeenCalledWith("system");

    rerender(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("aria-label and title reflect the next theme", () => {
    vi.mocked(useThemeContext).mockReturnValue(
      createMockContext("light", true),
    );
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Theme — Dark");
    expect(button).toHaveAttribute("title", "Theme — Dark");
  });

  it("applies optional className prop", () => {
    vi.mocked(useThemeContext).mockReturnValue(
      createMockContext("light", true),
    );
    render(<ThemeToggle className="custom-toggle-class" />);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-toggle-class");
  });
});
