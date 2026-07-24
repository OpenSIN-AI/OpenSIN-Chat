// SPDX-License-Identifier: MIT
/**
 * E2E happy-path test: agent → report → preview iframe.
 *
 * Tests the full event-driven flow:
 *   1. ReportPreviewListener catches the REPORT_PREVIEW_EVENT from the agent
 *   2. openPreview() is called with the correct data (title, type, URL)
 *   3. URL rewriting works (/api → API_BASE) for cross-origin deployments
 *   4. The PreviewSidebar would receive the data and open
 *
 * We mock the ChatSidebar context to capture openPreview calls rather than
 * importing the real PreviewSidebar (which has a deep import chain). This
 * isolates the event-flow logic while still testing the full listener →
 * context → preview data path.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { REPORT_PREVIEW_EVENT } from "@/utils/chat/agent";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

const mockOpenPreview = vi.fn();

vi.mock("./ChatSidebar", () => ({
  __esModule: true,
  ChatSidebarProvider: ({ children }) => children,
  useChatSidebar: () => ({
    openPreview: mockOpenPreview,
    openSidebar: vi.fn(),
  }),
  usePreviewSidebar: () => ({
    sidebarOpen: false,
    previewData: null,
    closeSidebar: vi.fn(),
  }),
  useFilesystemSidebar: () => ({ sidebarOpen: false, closeSidebar: vi.fn() }),
  useDatabaseSidebar: () => ({ sidebarOpen: false, closeSidebar: vi.fn() }),
  usePoliticalSidebar: () => ({ sidebarOpen: false, closeSidebar: vi.fn() }),
  useSourcesSidebar: () => ({ sidebarOpen: false, closeSidebar: vi.fn() }),
  useConsoleSidebar: () => ({ sidebarOpen: false, closeSidebar: vi.fn() }),
  useMemoriesSidebar: () => ({ sidebarOpen: false, closeSidebar: vi.fn() }),
  default: ({ children, isOpen }) => (isOpen ? children : null),
}));

import ReportPreviewListener from "./ReportPreviewListener";

function dispatchReportPreview(detail) {
  window.dispatchEvent(new CustomEvent(REPORT_PREVIEW_EVENT, { detail }));
}

describe("E2E: agent → report → preview flow", () => {
  beforeEach(() => {
    mockOpenPreview.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("opens preview with correct data when agent dispatches reportPreview event", () => {
    render(<ReportPreviewListener />);

    act(() => {
      dispatchReportPreview({
        title: "Monatsbericht",
        type: "pdf",
        downloadUrl: "/api/utils/reports/monthly-report.pdf",
        versions: [],
      });
    });

    expect(mockOpenPreview).toHaveBeenCalledTimes(1);
    const arg = mockOpenPreview.mock.calls[0][0];
    expect(arg.title).toBe("Monatsbericht");
    expect(arg.type).toBe("pdf");
    expect(arg.downloadUrl).toBe("/api/utils/reports/monthly-report.pdf");
    expect(arg.content).toBeNull();
  });

  it("passes through /api URLs unchanged when API_BASE is /api (same-origin)", () => {
    render(<ReportPreviewListener />);

    act(() => {
      dispatchReportPreview({
        title: "Report",
        type: "pdf",
        downloadUrl: "/api/utils/reports/test.pdf",
        versions: [],
      });
    });

    const arg = mockOpenPreview.mock.calls[0][0];
    // When API_BASE === "/api", the URL stays as-is
    expect(arg.downloadUrl).toBe("/api/utils/reports/test.pdf");
  });

  it("ignores events without detail (no crash, no sidebar change)", () => {
    render(<ReportPreviewListener />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(REPORT_PREVIEW_EVENT, { detail: null }),
      );
    });

    expect(mockOpenPreview).not.toHaveBeenCalled();
  });

  it("uses default title and type 'pdf' when detail is incomplete", () => {
    render(<ReportPreviewListener />);

    act(() => {
      dispatchReportPreview({
        downloadUrl: "/api/utils/reports/quick.pdf",
      });
    });

    expect(mockOpenPreview).toHaveBeenCalledTimes(1);
    const arg = mockOpenPreview.mock.calls[0][0];
    expect(arg.title).toBe("Report");
    expect(arg.type).toBe("pdf");
  });

  it("maps versions array and resolves each version's downloadUrl", () => {
    render(<ReportPreviewListener />);

    act(() => {
      dispatchReportPreview({
        title: "Multi-version Report",
        type: "pdf",
        downloadUrl: "/api/utils/reports/r1.pdf",
        versions: [
          { name: "v1", downloadUrl: "/api/utils/reports/r1-v1.pdf" },
          { name: "v2", downloadUrl: "/api/utils/reports/r1-v2.pdf" },
        ],
      });
    });

    const arg = mockOpenPreview.mock.calls[0][0];
    expect(arg.versions).toHaveLength(2);
    expect(arg.versions[0].name).toBe("v1");
    expect(arg.versions[0].downloadUrl).toBe("/api/utils/reports/r1-v1.pdf");
    expect(arg.versions[1].name).toBe("v2");
    expect(arg.versions[1].downloadUrl).toBe("/api/utils/reports/r1-v2.pdf");
  });

  it("sets downloadUrl to null when no URL provided", () => {
    render(<ReportPreviewListener />);

    act(() => {
      dispatchReportPreview({
        title: "No URL Report",
        type: "html",
      });
    });

    const arg = mockOpenPreview.mock.calls[0][0];
    expect(arg.downloadUrl).toBeNull();
  });

  it("removes event listener on unmount (no late triggers)", () => {
    const { unmount } = render(<ReportPreviewListener />);

    unmount();

    act(() => {
      dispatchReportPreview({
        title: "After unmount",
        type: "pdf",
        downloadUrl: "/api/utils/reports/late.pdf",
      });
    });

    expect(mockOpenPreview).not.toHaveBeenCalled();
  });

  it("handles multiple rapid events (each opens preview with latest data)", () => {
    render(<ReportPreviewListener />);

    act(() => {
      dispatchReportPreview({
        title: "First",
        type: "pdf",
        downloadUrl: "/api/utils/reports/first.pdf",
        versions: [],
      });
    });

    act(() => {
      dispatchReportPreview({
        title: "Second",
        type: "html",
        downloadUrl: "/api/utils/reports/second.pdf",
        versions: [],
      });
    });

    expect(mockOpenPreview).toHaveBeenCalledTimes(2);
    expect(mockOpenPreview.mock.calls[0][0].title).toBe("First");
    expect(mockOpenPreview.mock.calls[1][0].title).toBe("Second");
  });
});
