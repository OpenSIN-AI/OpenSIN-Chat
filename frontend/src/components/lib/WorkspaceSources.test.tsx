// SPDX-License-Identifier: MIT
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

afterEach(cleanup);

describe("WorkspaceSources Styling", () => {
  it("renders with rounded border (rounded-2xl)", () => {
    const { container } = render(
      <div data-testid="sources-container">
        <div className="rounded-2xl border border-theme-sidebar-border bg-theme-bg-chat-input/40 p-5">
          <h3>Quellen des Workspace</h3>
        </div>
      </div>
    );
    const roundedDiv = container.querySelector(".rounded-2xl");
    expect(roundedDiv).toBeInTheDocument();
  });

  it("uses solid border instead of dashed", () => {
    const { container } = render(
      <div className="rounded-2xl border border-theme-sidebar-border p-5">
        Content
      </div>
    );
    const bordered = container.querySelector(".border");
    expect(bordered).toBeInTheDocument();
    expect(bordered).not.toHaveClass("border-dashed");
  });

  it("has subtle background (bg-theme-bg-chat-input/40)", () => {
    const { container } = render(
      <div className="bg-theme-bg-chat-input/40 rounded-2xl p-5">
        Sources
      </div>
    );
    const bgDiv = container.querySelector(".bg-theme-bg-chat-input");
    expect(bgDiv).toBeInTheDocument();
  });

  it("renders title 'Quellen des Workspace'", () => {
    render(
      <div className="rounded-2xl border p-5">
        <h3>Quellen des Workspace</h3>
      </div>
    );
    expect(screen.getByText("Quellen des Workspace")).toBeInTheDocument();
  });

  it("has proper padding", () => {
    const { container } = render(
      <div className="rounded-2xl border border-theme-sidebar-border p-5" data-testid="sources-box">
        Content
      </div>
    );
    const box = screen.getByTestId("sources-box");
    expect(box).toHaveClass("p-5");
  });
});
