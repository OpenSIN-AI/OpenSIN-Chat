// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FileDownloadCard from "./index";

vi.mock("file-saver", () => ({
  saveAs: vi.fn(),
}));

vi.mock("@/models/files", () => ({
  default: {
    download: vi.fn(),
  },
}));

vi.mock("@/utils/numbers", () => ({
  humanFileSize: vi.fn((bytes, si, dp) => (bytes != null ? `${bytes} B` : "0 B")),
}));

vi.mock("@phosphor-icons/react", () => ({
  DownloadSimple: () => <svg data-testid="download-icon" />,
  CircleNotch: () => <svg data-testid="circle-notch-icon" />,
  Eye: () => <svg data-testid="eye-icon" />,
}));

vi.mock("../../ChatSidebar", () => ({
  useChatSidebar: () => ({ openPreview: vi.fn() }),
}));

import { saveAs } from "file-saver";
import StorageFiles from "@/models/files";

describe("FileDownloadCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders filename", () => {
    render(
      <FileDownloadCard
        props={{ content: { filename: "report.pdf", storageFilename: "abc.pdf", fileSize: 1024 } }}
      />
    );
    expect(screen.getByText("report.pdf")).toBeInTheDocument();
  });

  it("renders Unknown file when no filename", () => {
    render(
      <FileDownloadCard
        props={{ content: { storageFilename: "abc.pdf" } }}
      />
    );
    expect(screen.getByText("Unknown file")).toBeInTheDocument();
  });

  it("renders PDF badge for pdf files", () => {
    render(
      <FileDownloadCard
        props={{ content: { filename: "report.pdf", storageFilename: "abc.pdf" } }}
      />
    );
    expect(screen.getByText("PDF")).toBeInTheDocument();
  });

  it("renders DOC badge for docx files", () => {
    render(
      <FileDownloadCard
        props={{ content: { filename: "document.docx", storageFilename: "abc.docx" } }}
      />
    );
    expect(screen.getByText("DOC")).toBeInTheDocument();
  });

  it("renders XLS badge for xlsx files", () => {
    render(
      <FileDownloadCard
        props={{ content: { filename: "sheet.xlsx", storageFilename: "abc.xlsx" } }}
      />
    );
    expect(screen.getByText("XLS")).toBeInTheDocument();
  });

  it("renders PPT badge for pptx files", () => {
    render(
      <FileDownloadCard
        props={{ content: { filename: "slides.pptx", storageFilename: "abc.pptx" } }}
      />
    );
    expect(screen.getByText("PPT")).toBeInTheDocument();
  });

  it("renders CSV badge for csv files", () => {
    render(
      <FileDownloadCard
        props={{ content: { filename: "data.csv", storageFilename: "abc.csv" } }}
      />
    );
    expect(screen.getByText("CSV")).toBeInTheDocument();
  });

  it("renders extension badge for unknown file types", () => {
    render(
      <FileDownloadCard
        props={{ content: { filename: "archive.zip", storageFilename: "abc.zip" } }}
      />
    );
    expect(screen.getByText("ZIP")).toBeInTheDocument();
  });

  it("renders Download button", () => {
    render(
      <FileDownloadCard
        props={{ content: { filename: "report.pdf", storageFilename: "abc.pdf" } }}
      />
    );
    expect(screen.getByText("Download")).toBeInTheDocument();
    expect(screen.getByTestId("download-icon")).toBeInTheDocument();
  });

  it("calls download and saveAs on Download click", async () => {
    const blob = new Blob(["data"], { type: "application/pdf" });
    StorageFiles.download.mockResolvedValue(blob);
    render(
      <FileDownloadCard
        props={{ content: { filename: "report.pdf", storageFilename: "abc.pdf" } }}
      />
    );
    fireEvent.click(screen.getByText("Download"));
    await vi.waitFor(() => {
      expect(StorageFiles.download).toHaveBeenCalledWith("abc.pdf");
      expect(saveAs).toHaveBeenCalledWith(blob, "report.pdf");
    });
  });

  it("does not download when no storageFilename", () => {
    render(
      <FileDownloadCard
        props={{ content: { filename: "report.pdf" } }}
      />
    );
    fireEvent.click(screen.getByText("Download"));
    expect(StorageFiles.download).not.toHaveBeenCalled();
  });

  it("renders Vorschau button when storageFilename exists", () => {
    render(
      <FileDownloadCard
        props={{ content: { filename: "report.pdf", storageFilename: "abc.pdf" } }}
      />
    );
    expect(screen.getByText("Vorschau")).toBeInTheDocument();
    expect(screen.getByTestId("eye-icon")).toBeInTheDocument();
  });

  it("renders Vorschau button when downloadUrl exists", () => {
    render(
      <FileDownloadCard
        props={{ content: { filename: "report.pdf", downloadUrl: "https://example.com/file.pdf" } }}
      />
    );
    expect(screen.getByText("Vorschau")).toBeInTheDocument();
  });

  it("does not render Vorschau button when no storageFilename or downloadUrl", () => {
    render(
      <FileDownloadCard
        props={{ content: { filename: "report.pdf" } }}
      />
    );
    expect(screen.queryByText("Vorschau")).not.toBeInTheDocument();
  });

  it("shows Downloading... state while downloading", async () => {
    let resolveDownload;
    StorageFiles.download.mockReturnValue(
      new Promise((resolve) => { resolveDownload = resolve; })
    );
    render(
      <FileDownloadCard
        props={{ content: { filename: "report.pdf", storageFilename: "abc.pdf" } }}
      />
    );
    fireEvent.click(screen.getByText("Download"));
    expect(screen.getByText("Downloading...")).toBeInTheDocument();
    expect(screen.getByTestId("circle-notch-icon")).toBeInTheDocument();
    resolveDownload(new Blob(["data"]));
  });
});
