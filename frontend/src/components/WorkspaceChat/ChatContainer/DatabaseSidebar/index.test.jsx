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
      vi.fn((url) => {
        if (String(url).includes("/api/politician/parties")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ parties: ["AfD"] }),
          });
        }
        if (String(url).includes("/api/politician/states")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ states: ["Baden-Württemberg"] }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            politicians: [
              {
                id: "1",
                firstName: "Alice",
                lastName: "Weidel",
                fullName: "Alice Weidel",
                party: "AfD",
                state: "Baden-Württemberg",
              },
              {
                id: "2",
                firstName: "Tino",
                lastName: "Chrupalla",
                fullName: "Tino Chrupalla",
                party: "AfD",
                state: "Sachsen",
              },
            ],
            total: 2,
          }),
        });
      }),
    );

    render(<DatabaseSidebar workspace={{ slug: "test-ws" }} />, {
      wrapper: Wrapper,
    });
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
