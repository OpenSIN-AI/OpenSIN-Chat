// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import UserIcon from "./index";

const mockUsePfp = vi.fn(() => ({ pfp: null }));

vi.mock("../../hooks/usePfp", () => ({
  default: () => mockUsePfp(),
}));

vi.mock("./user.svg", () => ({
  default: "user-default.svg",
}));

vi.mock("./workspace.svg", () => ({
  default: "workspace-default.svg",
}));

describe("UserIcon", () => {
  it("renders without crashing", () => {
    const { container } = render(<UserIcon role="user" />);
    expect(container).toBeTruthy();
  });

  it("shows user default pfp when role is user and no custom pfp", () => {
    mockUsePfp.mockReturnValue({ pfp: null });
    render(<UserIcon role="user" />);
    const img = screen.getByAltText("User profile picture");
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toBe("user-default.svg");
  });

  it("shows workspace default pfp when role is not user", () => {
    mockUsePfp.mockReturnValue({ pfp: null });
    render(<UserIcon role="assistant" />);
    const img = screen.getByAltText("system profile picture");
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toBe("workspace-default.svg");
  });

  it("shows custom pfp when role is user and pfp is set", () => {
    mockUsePfp.mockReturnValue({ pfp: "https://example.com/avatar.png" });
    render(<UserIcon role="user" />);
    const img = screen.getByAltText("User profile picture");
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toBe("https://example.com/avatar.png");
  });
});
