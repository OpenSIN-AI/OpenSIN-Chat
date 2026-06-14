// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import DatabaseSidebar from "./index";
vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("../ChatSidebar", async () => {
  const actual = await vi.importActual("../ChatSidebar");
  return {
    ...actual,
    useDatabaseSidebar: () => ({
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

describe("DatabaseSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    expect(() =>
      render(<DatabaseSidebar />, { wrapper: Wrapper }),
    ).not.toThrow();
  });

  it("displays a list of politicians when fetch succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              { id: "1", first_name: "Alice", last_name: "Weidel" },
              { id: "2", first_name: "Tino", last_name: "Chrupalla" },
            ],
          }),
        }),
      ),
    );

    render(<DatabaseSidebar />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText("Alice Weidel")).toBeInTheDocument();
      expect(screen.getByText("Tino Chrupalla")).toBeInTheDocument();
    });
    vi.unstubAllGlobals();
  });

  it("survives 500 errors without crashing", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, status: 500 })),
    );
    expect(() =>
      render(<DatabaseSidebar />, { wrapper: Wrapper }),
    ).not.toThrow();
    vi.unstubAllGlobals();
  });
});
