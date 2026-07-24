// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ChatSidebar from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@/hooks/useIsMobileLayout", () => ({
  useIsMobileLayout: vi.fn(),
}));

import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";

describe("ChatSidebar shell (mobile layout)", () => {
  beforeEach(() => {
    vi.mocked(useIsMobileLayout).mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fills parent width on mobile when open (no zero-width collapse)", () => {
    const { container } = render(
      <ChatSidebar isOpen>
        <div data-testid="panel-body">PDF content</div>
      </ChatSidebar>,
    );
    expect(screen.getByTestId("panel-body")).toBeInTheDocument();
    const shell = container.firstElementChild;
    expect(shell).toBeTruthy();
    expect(shell.style.width).toBe("100%");
    expect(shell.className).toMatch(/w-full/);
    expect(shell.className).toMatch(/flex-1/);
  });

  it("uses pixel width on desktop when open", async () => {
    vi.mocked(useIsMobileLayout).mockReturnValue(false);
    const { container } = render(
      <ChatSidebar isOpen defaultWidth={400} minWidth={240}>
        <div data-testid="panel-body">Desktop content</div>
      </ChatSidebar>,
    );
    // desktop open animation sets visible on next tick
    await vi.waitFor(() => {
      const shell = container.firstElementChild;
      expect(shell?.style.width).toMatch(/px$/);
      expect(shell?.style.width).not.toBe("0px");
    });
    expect(screen.getByTestId("panel-body")).toBeInTheDocument();
  });
});
