// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import UserIcon from "./index";

vi.mock("../../hooks/usePfp", () => ({
  default: () => ({ pfp: null }),
}));

vi.mock("./user.svg", () => ({ default: "user-default.svg" }));
vi.mock("./workspace.svg", () => ({ default: "workspace-default.svg" }));

describe("UserIcon", () => {
  it("renders a user profile image when role is user and no custom pfp", () => {
    const { container } = render(<UserIcon role="user" />);
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("alt", "User profile picture");
  });

  it("renders a workspace profile image when role is not user", () => {
    const { container } = render(<UserIcon role="system" />);
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("alt", "system profile picture");
  });

  it("renders the wrapper div with correct dimensions", () => {
    const { container } = render(<UserIcon role="user" />);
    const wrapper = container.querySelector("div");
    expect(wrapper).toHaveClass("rounded-full");
  });
});
