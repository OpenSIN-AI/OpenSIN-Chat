// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { SWRConfig } from "swr";
import PoliticalSidebar from "./index";
vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});


vi.mock("../ChatSidebar", async () => {
  const actual = await vi.importActual("../ChatSidebar");
  return {
    ...actual,
    usePoliticalSidebar: () => ({
      sidebarOpen: true,
      closeSidebar: vi.fn(),
    }),
  };
});

const Wrapper = ({ children }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
);

describe("PoliticalSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    expect(() =>
      render(<PoliticalSidebar />, { wrapper: Wrapper }),
    ).not.toThrow();
  });

  it("survives 500 errors without crashing", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, status: 500 })),
    );
    expect(() =>
      render(<PoliticalSidebar />, { wrapper: Wrapper }),
    ).not.toThrow();
    vi.unstubAllGlobals();
  });
});
