// SPDX-License-Identifier: MIT
/* eslint-disable i18next/no-literal-string */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import UserMenu from "./index";

vi.mock("./UserButton", () => ({
  default: () => <div data-testid="user-button">UserButton</div>,
}));

describe("UserMenu", () => {
  it("renders children", () => {
    render(
      <UserMenu>
        <div data-testid="child-item">Child</div>
      </UserMenu>,
    );
    expect(screen.getByTestId("child-item")).toBeInTheDocument();
    expect(screen.getByText("Child")).toBeInTheDocument();
  });

  it("renders the UserButton component", () => {
    render(<UserMenu />);
    expect(screen.getByTestId("user-button")).toBeInTheDocument();
  });

  it("renders both UserButton and children together", () => {
    render(
      <UserMenu>
        <span data-testid="extra">Extra</span>
      </UserMenu>,
    );
    expect(screen.getByTestId("user-button")).toBeInTheDocument();
    expect(screen.getByTestId("extra")).toBeInTheDocument();
  });

  it("renders without children", () => {
    const { container } = render(<UserMenu />);
    expect(screen.getByTestId("user-button")).toBeInTheDocument();
    expect(container.querySelector("div")).toBeInTheDocument();
  });
});
