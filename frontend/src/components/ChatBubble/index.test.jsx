// SPDX-License-Identifier: MIT
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ChatBubble from "./index";

// UserIcon relies on the Pfp context/provider which is irrelevant to the
// sanitization behavior under test, so we stub it out.
vi.mock("../UserIcon", () => ({
  default: () => null,
}));

afterEach(cleanup);

describe("ChatBubble", () => {
  it("renders user markdown content", () => {
    render(<ChatBubble type="user" message="**hallo**" />);
    expect(screen.getByText("hallo")).toBeInTheDocument();
  });

  it("strips dangerous HTML (XSS)", () => {
    const { container } = render(
      <ChatBubble type="system" message={'<img src=x onerror="alert(1)">'} />,
    );
    expect(container.querySelector("img[onerror]")).toBeNull();
  });
});
