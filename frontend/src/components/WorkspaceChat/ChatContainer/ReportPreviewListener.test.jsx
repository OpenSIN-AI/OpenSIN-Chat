// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { REPORT_PREVIEW_EVENT } from "@/utils/chat/agent";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

const mockOpenPreview = vi.fn();

vi.mock("./ChatSidebar", () => ({
  ChatSidebarProvider: ({ children }) => children,
  useChatSidebar: () => ({ openPreview: mockOpenPreview }),
}));

import ReportPreviewListener from "./ReportPreviewListener";

function dispatchReportPreview(detail) {
  window.dispatchEvent(new CustomEvent(REPORT_PREVIEW_EVENT, { detail }));
}

describe("ReportPreviewListener", () => {
  beforeEach(() => {
    mockOpenPreview.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ruft openPreview auf wenn ein reportPreview-Event empfangen wird", () => {
    render(<ReportPreviewListener />);
    dispatchReportPreview({
      title: "Monatsbericht",
      type: "pdf",
      downloadUrl: "/api/reports/123.pdf",
      versions: [],
    });
    expect(mockOpenPreview).toHaveBeenCalledTimes(1);
    const arg = mockOpenPreview.mock.calls[0][0];
    expect(arg.title).toBe("Monatsbericht");
    expect(arg.type).toBe("pdf");
    expect(arg.content).toBeNull();
  });

  it("ignoriert Events ohne detail", () => {
    render(<ReportPreviewListener />);
    window.dispatchEvent(
      new CustomEvent(REPORT_PREVIEW_EVENT, { detail: null }),
    );
    expect(mockOpenPreview).not.toHaveBeenCalled();
  });

  it("verwendet Standardwerte wenn title oder type fehlen", () => {
    render(<ReportPreviewListener />);
    dispatchReportPreview({ downloadUrl: "/api/reports/456.pdf" });
    expect(mockOpenPreview).toHaveBeenCalledTimes(1);
    const arg = mockOpenPreview.mock.calls[0][0];
    expect(arg.title).toBe("Report");
    expect(arg.type).toBe("pdf");
  });

  it("mappt versions und löst downloadUrls auf", () => {
    render(<ReportPreviewListener />);
    dispatchReportPreview({
      title: "Report",
      type: "pdf",
      downloadUrl: "/api/reports/r1.pdf",
      versions: [
        { name: "v1", downloadUrl: "/api/reports/r1-v1.pdf" },
        { name: "v2", downloadUrl: "/api/reports/r1-v2.pdf" },
      ],
    });
    const arg = mockOpenPreview.mock.calls[0][0];
    expect(arg.versions).toHaveLength(2);
    expect(arg.versions[0].name).toBe("v1");
    expect(arg.versions[0].downloadUrl).toBe("/api/reports/r1-v1.pdf");
  });

  it("setzt downloadUrl auf null wenn keine URL vorhanden", () => {
    render(<ReportPreviewListener />);
    dispatchReportPreview({
      title: "No URL Report",
      type: "html",
    });
    const arg = mockOpenPreview.mock.calls[0][0];
    expect(arg.downloadUrl).toBeNull();
  });

  it("entfernt den Event-Listener beim Unmount", () => {
    const { unmount } = render(<ReportPreviewListener />);
    unmount();
    dispatchReportPreview({
      title: "After unmount",
      type: "pdf",
      downloadUrl: "/api/reports/999.pdf",
    });
    expect(mockOpenPreview).not.toHaveBeenCalled();
  });

  it("gibt null zurück (rendert kein DOM)", () => {
    const { container } = render(<ReportPreviewListener />);
    expect(container.firstChild).toBeNull();
  });
});
