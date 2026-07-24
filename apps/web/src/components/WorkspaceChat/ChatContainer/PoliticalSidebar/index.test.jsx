// SPDX-License-Identifier: MIT
/**
 * Tests for the PoliticalSidebar component.
 * Covers render, loading, error (with retry), empty, and populated states.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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

const defaultPoliticalData = {
  drucksachen: [],
  rssItems: [],
  loadingDrucksachen: false,
  loadingRss: false,
  errorDrucksachen: null,
  errorRss: null,
  refreshDrucksachen: vi.fn(),
  refreshRss: vi.fn(),
  refreshAll: vi.fn(),
};

let politicalData = { ...defaultPoliticalData };

vi.mock("@/hooks/usePoliticalData", () => ({
  usePoliticalData: () => politicalData,
}));

const Wrapper = ({ children }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
);

function resetPoliticalData() {
  politicalData = { ...defaultPoliticalData };
  politicalData.refreshDrucksachen = vi.fn();
  politicalData.refreshRss = vi.fn();
  politicalData.refreshAll = vi.fn();
}

describe("PoliticalSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPoliticalData();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    expect(() =>
      render(<PoliticalSidebar />, { wrapper: Wrapper }),
    ).not.toThrow();
  });

  it("displays loading skeletons when drucksachen are loading", () => {
    politicalData.loadingDrucksachen = true;
    render(<PoliticalSidebar />, { wrapper: Wrapper });
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("displays loading skeletons when RSS is loading", () => {
    politicalData.loadingRss = true;
    render(<PoliticalSidebar />, { wrapper: Wrapper });
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("displays error with retry button when drucksachen fetch fails", async () => {
    politicalData.errorDrucksachen = "DIP API unavailable";
    politicalData.loadingDrucksachen = false;
    render(<PoliticalSidebar />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/DIP API unavailable/i)).toBeInTheDocument();
    });

    const retryBtns = screen.getAllByRole("button", {
      name: /try again|erneut/i,
    });
    expect(retryBtns.length).toBeGreaterThan(0);
    fireEvent.click(retryBtns[0]);
    expect(politicalData.refreshDrucksachen).toHaveBeenCalled();
  });

  it("displays error with retry button when RSS fetch fails", async () => {
    politicalData.errorRss = "RSS feed down";
    politicalData.loadingRss = false;
    render(<PoliticalSidebar />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/RSS feed down/i)).toBeInTheDocument();
    });

    const retryBtns = screen.getAllByRole("button", {
      name: /try again|erneut/i,
    });
    expect(retryBtns.length).toBeGreaterThan(0);
    fireEvent.click(retryBtns[0]);
    expect(politicalData.refreshRss).toHaveBeenCalled();
  });

  it("displays empty messages when no data is available", () => {
    politicalData.loadingDrucksachen = false;
    politicalData.loadingRss = false;
    politicalData.errorDrucksachen = null;
    politicalData.errorRss = null;
    politicalData.drucksachen = [];
    politicalData.rssItems = [];
    render(<PoliticalSidebar />, { wrapper: Wrapper });
    // sidebar.political.empty → "No documents found."
    // sidebar.political.rss_empty → "No press releases found."
    expect(screen.getByText(/No documents found/i)).toBeInTheDocument();
    expect(screen.getByText(/No press releases found/i)).toBeInTheDocument();
  });

  it("renders drucksachen list when populated", async () => {
    politicalData.loadingDrucksachen = false;
    politicalData.errorDrucksachen = null;
    politicalData.drucksachen = [
      {
        id: "d1",
        titel: "Klimaschutzgesetz Änderung",
        drucksache_url: "https://dip.bundestag.de/d1",
      },
      {
        id: "d2",
        titel: "Haushalt 2026",
        drucksache_url: "https://dip.bundestag.de/d2",
      },
    ];
    render(<PoliticalSidebar />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(
        screen.getByText("Klimaschutzgesetz Änderung"),
      ).toBeInTheDocument();
      expect(screen.getByText("Haushalt 2026")).toBeInTheDocument();
    });
  });

  it("renders RSS items when populated", async () => {
    politicalData.loadingRss = false;
    politicalData.errorRss = null;
    politicalData.rssItems = [
      {
        title: "AfD fordert Referendum",
        link: "https://example.com/1",
        guid: "g1",
      },
      {
        title: "Neue Studie zur Migrationspolitik",
        link: "https://example.com/2",
        guid: "g2",
      },
    ];
    render(<PoliticalSidebar />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("AfD fordert Referendum")).toBeInTheDocument();
      expect(
        screen.getByText("Neue Studie zur Migrationspolitik"),
      ).toBeInTheDocument();
    });
  });

  it("calls refreshAll when header refresh button is clicked", () => {
    politicalData.loadingDrucksachen = false;
    politicalData.loadingRss = false;
    render(<PoliticalSidebar />, { wrapper: Wrapper });

    const refreshBtn = screen.getByLabelText(/refresh|aktualisieren/i);
    fireEvent.click(refreshBtn);
    expect(politicalData.refreshAll).toHaveBeenCalled();
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

  it("does not crash on unmount (abort-safe)", () => {
    politicalData.loadingDrucksachen = true;
    const { unmount } = render(<PoliticalSidebar />, { wrapper: Wrapper });
    expect(() => unmount()).not.toThrow();
  });
});
