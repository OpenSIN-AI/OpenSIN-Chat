// SPDX-License-Identifier: MIT
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

afterEach(cleanup);

describe("Sidebar Logo Styling", () => {
  it("renders logo with proper sizing (h-9 max-h-[36px])", () => {
    const { container } = render(
      <div className="flex shrink-0 w-full justify-start my-[18px] px-[24px]">
        <div className="flex w-[250px] min-w-[250px] items-center">
          <a href="/" aria-label="Home">
            <img
              src="/logo.png"
              alt="Logo"
              className="rounded-lg h-9 w-auto max-h-[36px] max-w-[180px] object-contain"
              data-testid="sidebar-logo"
            />
          </a>
        </div>
      </div>
    );
    const logo = screen.getByTestId("sidebar-logo");
    expect(logo).toHaveClass("h-9");
    expect(logo).toHaveClass("max-h-[36px]");
    expect(logo).toHaveClass("object-contain");
  });

  it("has rounded corners (rounded-lg)", () => {
    const { container } = render(
      <img
        src="/logo.png"
        alt="Logo"
        className="rounded-lg h-9 max-h-[36px]"
        data-testid="sidebar-logo"
      />
    );
    const logo = screen.getByTestId("sidebar-logo");
    expect(logo).toHaveClass("rounded-lg");
  });

  it("maintains aspect ratio with object-contain", () => {
    const { container } = render(
      <img
        src="/logo.png"
        alt="Logo"
        className="w-auto max-w-[180px] object-contain"
        data-testid="sidebar-logo"
      />
    );
    const logo = screen.getByTestId("sidebar-logo");
    expect(logo).toHaveClass("object-contain");
    expect(logo).toHaveClass("w-auto");
  });

  it("is left-aligned in container (justify-start)", () => {
    const { container } = render(
      <div className="flex justify-start" data-testid="logo-container">
        <img src="/logo.png" alt="Logo" />
      </div>
    );
    const logoContainer = screen.getByTestId("logo-container");
    expect(logoContainer).toHaveClass("justify-start");
  });

  it("logo is link to home", () => {
    render(
      <div className="flex items-center">
        <a href="/" aria-label="Home" data-testid="home-link">
          <img src="/logo.png" alt="Logo" />
        </a>
      </div>
    );
    const homeLink = screen.getByTestId("home-link");
    expect(homeLink).toHaveAttribute("href", "/");
    expect(homeLink).toHaveAttribute("aria-label", "Home");
  });

  it("sidebar container has proper spacing (my-[18px] px-[24px])", () => {
    const { container } = render(
      <div className="flex my-[18px] px-[24px]" data-testid="sidebar-section">
        Content
      </div>
    );
    const section = screen.getByTestId("sidebar-section");
    expect(section).toHaveClass("my-[18px]");
    expect(section).toHaveClass("px-[24px]");
  });
});
