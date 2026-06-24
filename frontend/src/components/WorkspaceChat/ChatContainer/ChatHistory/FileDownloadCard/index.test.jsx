// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FileDownloadCard from "./index";
vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("file-saver", () => ({ saveAs: vi.fn() }));
vi.mock("@/models/files", () => ({ default: { download: vi.fn() } }));
vi.mock("@/utils/numbers", () => ({
  humanFileSize: vi.fn((bytes) => (bytes != null ? `${bytes} B` : "0 B")),
}));
vi.mock("@phosphor-icons/react/dist/csr/ArrowDown", () => ({
  default: (props) => <svg data-testid="phosphor-arrowdown-icon" {...props} />,
  ArrowDown: (props) => (
    <svg data-testid="phosphor-arrowdown-icon" {...props} />
  ),
}));
vi.mock("@phosphor-icons/react/dist/csr/DownloadSimple", () => ({
  default: (props) => <svg data-testid="download-icon" {...props} />,
  DownloadSimple: (props) => <svg data-testid="download-icon" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/CircleNotch", () => ({
  default: (props) => <svg data-testid="circle-notch-icon" {...props} />,
  CircleNotch: (props) => <svg data-testid="circle-notch-icon" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/Eye", () => ({
  default: (props) => <svg data-testid="eye-icon" {...props} />,
  Eye: (props) => <svg data-testid="eye-icon" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/Bookmark", () => ({
  default: (props) => <svg data-testid="bookmark-icon" {...props} />,
  Bookmark: (props) => <svg data-testid="bookmark-icon" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/ArrowSquareOut", () => ({
  default: (props) => <svg data-testid="arrow-square-out-icon" {...props} />,
  ArrowSquareOut: (props) => (
    <svg data-testid="arrow-square-out-icon" {...props} />
  ),
}));
vi.mock("@/models/workspace", () => ({
  default: {
    parseFile: vi.fn(() => Promise.resolve({ location: "test-location" })),
    embedParsedFile: vi.fn(() => Promise.resolve(true)),
  },
}));
vi.mock("@/utils/toast", () => ({
  default: vi.fn(),
}));
vi.mock("@/hooks/useAuthenticatedBlobUrl", () => {
  let mockResult = { blobUrl: null, loading: false, error: null };
  return {
    default: vi.fn(() => mockResult),
    __setMockResult: (r) => { mockResult = r; },
  };
});

// Capture the openPreview mock so individual tests can assert against it.
const openPreviewMock = vi.fn();
vi.mock("../../ChatSidebar", () => ({
  useChatSidebar: () => ({ openPreview: openPreviewMock }),
}));
vi.mock("@/utils/request", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    baseHeaders: () => ({ Authorization: "Bearer test-token" }),
  };
});
vi.mock("@/utils/constants", () => ({
  API_BASE: "http://localhost:3001/api",
  APPEARANCE_SETTINGS: "appearance-settings",
}));

// Mock fetch globally for ImagePreviewBanner
const mockFetch = vi.fn();
global.fetch = mockFetch;
global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = vi.fn();

import { saveAs } from "file-saver";
import StorageFiles from "@/models/files";
import useAuthenticatedBlobUrl from "@/hooks/useAuthenticatedBlobUrl";

// Helper to set the mock return value for the blob URL hook
function setBlobUrlMock(result) {
  useAuthenticatedBlobUrl.mockReturnValue(result);
}

describe("FileDownloadCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
  });

  // ── Badge tests ──────────────────────────────────────────────

  it("renders filename", () => {
    render(
      <FileDownloadCard
        props={{
          content: {
            filename: "report.pdf",
            storageFilename: "abc.pdf",
            fileSize: 1024,
          },
        }}
      />,
    );
    expect(screen.getByText("report.pdf")).toBeInTheDocument();
  });

  it("renders Unknown file when no filename", () => {
    render(
      <FileDownloadCard props={{ content: { storageFilename: "abc.pdf" } }} />,
    );
    expect(screen.getByText("Unknown file")).toBeInTheDocument();
  });

  it("renders PDF badge", () => {
    render(
      <FileDownloadCard
        props={{
          content: { filename: "report.pdf", storageFilename: "abc.pdf" },
        }}
      />,
    );
    expect(screen.getByText("PDF")).toBeInTheDocument();
  });

  it("renders DOC badge", () => {
    render(
      <FileDownloadCard
        props={{
          content: { filename: "document.docx", storageFilename: "abc.docx" },
        }}
      />,
    );
    expect(screen.getByText("DOC")).toBeInTheDocument();
  });

  it("renders XLS badge", () => {
    render(
      <FileDownloadCard
        props={{
          content: { filename: "sheet.xlsx", storageFilename: "abc.xlsx" },
        }}
      />,
    );
    expect(screen.getByText("XLS")).toBeInTheDocument();
  });

  it("renders PPT badge", () => {
    render(
      <FileDownloadCard
        props={{
          content: { filename: "slides.pptx", storageFilename: "abc.pptx" },
        }}
      />,
    );
    expect(screen.getByText("PPT")).toBeInTheDocument();
  });

  it("renders CSV badge", () => {
    render(
      <FileDownloadCard
        props={{
          content: { filename: "data.csv", storageFilename: "abc.csv" },
        }}
      />,
    );
    expect(screen.getByText("CSV")).toBeInTheDocument();
  });

  it("renders extension badge for unknown types", () => {
    render(
      <FileDownloadCard
        props={{
          content: { filename: "archive.zip", storageFilename: "abc.zip" },
        }}
      />,
    );
    expect(screen.getByText("ZIP")).toBeInTheDocument();
  });

  // ── Image badge and preview ──────────────────────────────────

  it("renders IMG badge for png files", () => {
    render(
      <FileDownloadCard
        props={{
          content: { filename: "photo.png", storageFilename: "image-abc.png" },
        }}
      />,
    );
    expect(screen.getByText("IMG")).toBeInTheDocument();
  });

  it("renders IMG badge for jpg files", () => {
    render(
      <FileDownloadCard
        props={{
          content: { filename: "photo.jpg", storageFilename: "image-abc.jpg" },
        }}
      />,
    );
    expect(screen.getByText("IMG")).toBeInTheDocument();
  });

  it("renders SVG badge for svg files", () => {
    render(
      <FileDownloadCard
        props={{
          content: { filename: "icon.svg", storageFilename: "image-abc.svg" },
        }}
      />,
    );
    expect(screen.getByText("SVG")).toBeInTheDocument();
  });

  it("shows inline image when fetch succeeds for png", async () => {
    setBlobUrlMock({ blobUrl: "blob:mock-url", loading: false, error: null });
    render(
      <FileDownloadCard
        props={{
          content: {
            filename: "photo.png",
            storageFilename: "image-abc.png",
            fileSize: 512,
          },
        }}
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole("img")).toBeInTheDocument();
    });
    expect(screen.getByRole("img").getAttribute("src")).toBe("blob:mock-url");
  });

  it("hides inline preview when fetch fails for image", async () => {
    setBlobUrlMock({ blobUrl: null, loading: false, error: "404" });
    render(
      <FileDownloadCard
        props={{
          content: { filename: "photo.png", storageFilename: "image-abc.png" },
        }}
      />,
    );
    await waitFor(() => {
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
  });

  it("does not render Open in new tab button for image files", () => {
    render(
      <FileDownloadCard
        props={{
          content: { filename: "photo.png", storageFilename: "image-abc.png" },
        }}
      />,
    );
    expect(screen.queryByText("Open in new tab")).not.toBeInTheDocument();
  });

  it("does not render Open in new tab button for svg files", () => {
    render(
      <FileDownloadCard
        props={{
          content: { filename: "icon.svg", storageFilename: "image-abc.svg" },
        }}
      />,
    );
    expect(screen.queryByText("Open in new tab")).not.toBeInTheDocument();
  });

  // ── Regression tests for v0.6.2 fixes ─────────────────────────

  it("AutoPreview (#55) does NOT open sidebar for image files (skips isImage)", async () => {
    const blob = new Blob(["img"], { type: "image/png" });
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
    });
    render(
      <FileDownloadCard
        autoPreview
        props={{
          content: { filename: "photo.png", storageFilename: "image-abc.png" },
        }}
      />,
    );
    // give the effect a tick
    await new Promise((r) => setTimeout(r, 50));
    expect(openPreviewMock).not.toHaveBeenCalled();
  });

  it("AutoPreview (#55) DOES open sidebar for non-image files (PDF)", async () => {
    render(
      <FileDownloadCard
        autoPreview
        props={{
          content: {
            filename: "report.pdf",
            storageFilename: "report-abc.pdf",
          },
        }}
      />,
    );
    await waitFor(() => {
      expect(openPreviewMock).toHaveBeenCalled();
    });
    const callArg = openPreviewMock.mock.calls[0][0];
    expect(callArg.type).toBe("pdf");
    expect(callArg.title).toBe("report.pdf");
  });

  it("renders skeleton spinner while image is loading (CLS prevention)", () => {
    setBlobUrlMock({ blobUrl: null, loading: true, error: null });
    const { container } = render(
      <FileDownloadCard
        props={{
          content: { filename: "photo.png", storageFilename: "image-abc.png" },
        }}
      />,
    );
    // Skeleton: animated div with h-[200px] container
    const skeleton = container.querySelector(".h-\\[200px\\]");
    expect(skeleton).toBeInTheDocument();
    const spinner = skeleton.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
    // No image should be rendered yet
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders nothing for ImagePreviewBanner when fetch fails (no fallback UI)", async () => {
    setBlobUrlMock({ blobUrl: null, loading: false, error: "500" });
    const { container } = render(
      <FileDownloadCard
        props={{
          content: { filename: "photo.png", storageFilename: "image-abc.png" },
        }}
      />,
    );
    await waitFor(() => {
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
    // Skeleton should be gone (no skeleton, no error message — silent fail)
    expect(container.querySelector(".h-\\[200px\\]")).not.toBeInTheDocument();
  });

  it("ImagePreviewBanner uses filename as alt text when filename is provided", async () => {
    setBlobUrlMock({ blobUrl: "blob:mock-url", loading: false, error: null });
    render(
      <FileDownloadCard
        props={{
          content: {
            filename: "mountain.png",
            storageFilename: "image-abc.png",
          },
        }}
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole("img")).toBeInTheDocument();
    });
    // alt is the filename (preferred over the translated fallback)
    const img = screen.getByRole("img");
    expect(img.getAttribute("alt")).toBe("mountain.png");
  });

  // ── Download button ──────────────────────────────────────────

  it("renders Download button", () => {
    render(
      <FileDownloadCard
        props={{
          content: { filename: "report.pdf", storageFilename: "abc.pdf" },
        }}
      />,
    );
    expect(screen.getByText("Download")).toBeInTheDocument();
  });

  it("calls download and saveAs on Download click", async () => {
    const blob = new Blob(["data"], { type: "application/pdf" });
    StorageFiles.download.mockResolvedValue(blob);
    render(
      <FileDownloadCard
        props={{
          content: { filename: "report.pdf", storageFilename: "abc.pdf" },
        }}
      />,
    );
    fireEvent.click(screen.getByText("Download"));
    await waitFor(() => {
      expect(StorageFiles.download).toHaveBeenCalledWith("abc.pdf");
      expect(saveAs).toHaveBeenCalledWith(blob, "report.pdf");
    });
  });

  it("does not download when no storageFilename", async () => {
    render(
      <FileDownloadCard props={{ content: { filename: "report.pdf" } }} />,
    );
    fireEvent.click(screen.getByText("Download"));
    await waitFor(() => {
      expect(StorageFiles.download).not.toHaveBeenCalled();
    });
  });
});
