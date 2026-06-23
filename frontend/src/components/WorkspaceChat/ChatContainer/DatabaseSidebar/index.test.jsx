// SPDX-License-Identifier: MIT
/**
 * Tests for the DatabaseSidebar component.
 * Covers render, loading, error (with retry), empty, and populated states.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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

const defaultPoliticiansState = {
  politicians: [],
  loading: false,
  error: null,
  refresh: vi.fn(),
  filters: {
    query: "",
    setQuery: vi.fn(),
    party: "",
    setParty: vi.fn(),
    state: "",
    setState: vi.fn(),
  },
};

let politiciansState = { ...defaultPoliticiansState };

vi.mock("@/hooks/usePoliticians", () => ({
  usePoliticians: () => politiciansState,
}));

vi.mock("@/hooks/useDocuments", () => ({
  __esModule: true,
  default: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/models/politician", () => ({
  __esModule: true,
  default: {
    addToWorkspace: vi.fn().mockResolvedValue({ success: true }),
    searchSpeeches: vi.fn().mockResolvedValue({ results: [], error: null }),
  },
}));

const Wrapper = ({ children }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
);

function resetPoliticianState() {
  politiciansState = { ...defaultPoliticiansState };
  politiciansState.refresh = vi.fn();
  politiciansState.filters = {
    query: "",
    setQuery: vi.fn(),
    party: "",
    setParty: vi.fn(),
    state: "",
    setState: vi.fn(),
  };
}

describe("DatabaseSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPoliticianState();

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
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders without crashing", () => {
    expect(() =>
      render(<DatabaseSidebar />, { wrapper: Wrapper }),
    ).not.toThrow();
  });

  it("displays loading skeletons when politicians are loading", () => {
    politiciansState.loading = true;
    politiciansState.politicians = [];
    render(<DatabaseSidebar />, { wrapper: Wrapper });
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("displays error message with retry button when fetch fails", async () => {
    politiciansState.error = "Network error";
    politiciansState.loading = false;
    render(<DatabaseSidebar />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole("button", { name: /try again|erneut/i });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(politiciansState.refresh).toHaveBeenCalled();
  });

  it("displays empty message when no politicians found", () => {
    politiciansState.loading = false;
    politiciansState.error = null;
    politiciansState.politicians = [];
    render(<DatabaseSidebar />, { wrapper: Wrapper });
    // sidebar.database.empty → "No data loaded."
    expect(
      screen.getByText(/No data loaded|Keine Politiker/i),
    ).toBeInTheDocument();
  });

  it("renders politician list when populated", async () => {
    politiciansState.loading = false;
    politiciansState.error = null;
    politiciansState.politicians = [
      {
        id: "1",
        first_name: "Alice",
        last_name: "Weidel",
        label: "Alice Weidel",
        party: { label: "AfD" },
        state: "Baden-Württemberg",
      },
      {
        id: "2",
        first_name: "Tino",
        last_name: "Chrupalla",
        label: "Tino Chrupalla",
        party: { label: "AfD" },
        state: "Sachsen",
      },
    ];
    render(<DatabaseSidebar workspace={{ slug: "test-ws" }} />, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(screen.getByText("Alice Weidel")).toBeInTheDocument();
      expect(screen.getByText("Tino Chrupalla")).toBeInTheDocument();
    });
  });

  it("survives 500 errors without crashing", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, status: 500 })),
    );
    expect(() =>
      render(<DatabaseSidebar />, { wrapper: Wrapper }),
    ).not.toThrow();
  });

  it("does not crash on unmount (abort-safe)", () => {
    politiciansState.loading = true;
    const { unmount } = render(<DatabaseSidebar />, { wrapper: Wrapper });
    expect(() => unmount()).not.toThrow();
  });
});
