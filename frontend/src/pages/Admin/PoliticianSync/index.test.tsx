// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PoliticianSyncDashboard from "./index";

vi.mock("@/hooks/usePoliticianSync", () => ({
  default: vi.fn(),
}));

vi.mock("@/components/SettingsSidebar", () => ({
  default: () => <div data-testid="settings-sidebar" />,
}));

vi.mock("react-loading-skeleton", () => ({
  default: () => <div data-testid="skeleton" />,
}));

vi.mock("@phosphor-icons/react", () => ({
  ArrowsClockwise: () => <svg data-testid="arrows-clockwise-icon" />,
  CheckCircle: () => <svg data-testid="check-circle-icon" />,
  WarningCircle: () => <svg data-testid="warning-circle-icon" />,
  XCircle: () => <svg data-testid="x-circle-icon" />,
  TrendUp: () => <svg data-testid="trend-up-icon" />,
}));

vi.mock("@/components/lib/CTAButton", () => ({
  default: ({ children, onClick }) => (
    <button type="button" onClick={onClick} data-testid="cta-button">
      {children}
    </button>
  ),
}));

vi.mock("@/utils/toast", () => ({
  default: vi.fn(),
}));

vi.mock("react-device-detect", () => ({
  isMobile: false,
}));

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

import usePoliticianSync from "@/hooks/usePoliticianSync";
import showToast from "@/utils/toast";

const baseStats = {
  politicians: 733,
  speeches: 42,
  votes: 123,
};

const baseSyncStatus = {
  lastSync: new Date().toISOString(),
  isHealthy: true,
  sources: [
    {
      source: "bundestag",
      status: "completed",
      lastAttempt: new Date().toISOString(),
      lastSuccess: new Date().toISOString(),
      itemsProcessed: 999,
      itemsFailed: 0,
      error: null,
      isHealthy: true,
    },
  ],
  retryQueue: [],
};

describe("PoliticianSyncDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders loading skeletons while data is loading", () => {
    vi.mocked(usePoliticianSync).mockReturnValue({
      stats: null,
      syncStatus: null,
      isLoading: true,
      error: null,
      mutate: vi.fn(),
    });
    render(<PoliticianSyncDashboard />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("renders stats and source status when loaded", () => {
    vi.mocked(usePoliticianSync).mockReturnValue({
      stats: baseStats,
      syncStatus: baseSyncStatus,
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });
    render(<PoliticianSyncDashboard />);
    expect(screen.getByText("Politician Database Sync")).toBeInTheDocument();
    expect(screen.getByText("733")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("123")).toBeInTheDocument();
    expect(screen.getByText("bundestag")).toBeInTheDocument();
  });

  it("shows unhealthy badge when sync status is not healthy", () => {
    vi.mocked(usePoliticianSync).mockReturnValue({
      stats: baseStats,
      syncStatus: { ...baseSyncStatus, isHealthy: false },
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });
    render(<PoliticianSyncDashboard />);
    expect(screen.getByText("Unhealthy")).toBeInTheDocument();
  });

  it("renders error message when loading fails", () => {
    vi.mocked(usePoliticianSync).mockReturnValue({
      stats: null,
      syncStatus: null,
      isLoading: false,
      error: new Error("Network error"),
      mutate: vi.fn(),
    });
    render(<PoliticianSyncDashboard />);
    expect(screen.getByText(/Failed to load sync status/)).toBeInTheDocument();
  });

  it("triggers manual sync and calls mutate on success", async () => {
    const mutate = vi.fn();
    vi.mocked(usePoliticianSync).mockReturnValue({
      stats: baseStats,
      syncStatus: baseSyncStatus,
      isLoading: false,
      error: null,
      mutate,
    });
    render(<PoliticianSyncDashboard />);

    fireEvent.click(screen.getByTestId("cta-button"));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        "Sync triggered successfully",
        "success",
      );
    });
    expect(mutate).toHaveBeenCalled();
  });

  it("shows error toast when manual sync fails", async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );
    const mutate = vi.fn();
    vi.mocked(usePoliticianSync).mockReturnValue({
      stats: baseStats,
      syncStatus: baseSyncStatus,
      isLoading: false,
      error: null,
      mutate,
    });
    render(<PoliticianSyncDashboard />);

    fireEvent.click(screen.getByTestId("cta-button"));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("Failed to trigger sync"),
        "error",
      );
    });
  });
});
