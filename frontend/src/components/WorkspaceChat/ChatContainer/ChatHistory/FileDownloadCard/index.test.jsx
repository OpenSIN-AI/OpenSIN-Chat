// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FileDownloadCard from "./index";

vi.mock("file-saver", () => ({ saveAs: vi.fn() }));
vi.mock("@/models/files", () => ({ default: { download: vi.fn() } }));
vi.mock("@/utils/numbers", () => ({
  humanFileSize: vi.fn((bytes) => (bytes != null ? `${bytes} B` : "0 B")),
}));
vi.mock("@phosphor-icons/react", () => ({
  DownloadSimple: () => <svg data-testid="download-icon" />,
  CircleNotch: () => <svg data-testid="circle-notch-icon" />,
  Eye: () => <svg data-testid="eye-icon" />,
  Image: () => <svg data-testid="image-icon" />,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, fallback) => {
      const map = {
        "preview.generated_image": "Generated image",
        "preview.loading": "Loading preview...",
        "preview.load_error": "Preview could not be loaded.",
        "preview.menu.download": "Download",
        "preview.menu.open_new_tab": "Open in new tab",
        "preview.menu.add_to_sources": "Add to sources",
        "preview.open_externally": "Open in new tab",
        "preview.iframe_title": "Preview",
        "preview.empty": "No content to preview.",
        "preview.title": "Preview",
        "preview.unknown_file": "Unknown file",
        "preview.open": "Preview",
        "preview.download": "Download",
        "preview.downloading": "Downloading...",
      };
      return map[key] || fallback || key;
    },
  }),
}));

// Capture the openPreview mock so individual tests can assert against it.
const openPreviewMock = vi.fn();
vi.mock("../../ChatSidebar", () => ({
  useChatSidebar: () => ({ openPreview: openPreviewMock }),
}));
vi.mock("@/utils/request", () => ({
  baseHeaders: () => ({ Authorization: "Bearer test-token" }),
}));
vi.mock("@/utils/constants", () => ({
  API_BASE: "http://localhost:3001/api",
}));

// Mock fetch globally for ImagePreviewBanner
const mockFetch = vi.fn();
global.fetch = mockFetch;
global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = vi.fn();

import { saveAs } from "file-saver";
import StorageFiles from "@/models/files";

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
    const blob = new Blob(["imgdata"], { type: "image/png" });
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
    });
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
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
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
    // Mock fetch to NEVER resolve — keeps the banner in loading state
    mockFetch.mockReturnValue(new Promise(() => {}));
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
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
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
    const blob = new Blob(["data"], { type: "image/png" });
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
    });
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
