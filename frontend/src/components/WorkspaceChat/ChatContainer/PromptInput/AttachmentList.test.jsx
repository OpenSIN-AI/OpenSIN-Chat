// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttachmentList from "./AttachmentList";
import { openImageLightbox } from "@/components/ImageLightbox";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@phosphor-icons/react/dist/csr/CircleNotch", () => ({ default: (props) => <span {...props}>Spinner</span>, CircleNotch: (props) => <span {...props}>Spinner</span> }));
vi.mock("@phosphor-icons/react/dist/csr/WarningOctagon", () => ({ default: (props) => <span {...props}>Warning</span>, WarningOctagon: (props) => <span {...props}>Warning</span> }));
vi.mock("@phosphor-icons/react/dist/csr/X", () => ({ default: (props) => <svg data-testid="remove-icon" {...props} />, X: (props) => <svg data-testid="remove-icon" {...props} /> }));
vi.mock("@phosphor-icons/react/dist/csr/FilePdf", () => ({ default: (props) => <span {...props}>PdfIcon</span>, FilePdf: (props) => <span {...props}>PdfIcon</span> }));
vi.mock("@phosphor-icons/react/dist/csr/FileCsv", () => ({ default: (props) => <span {...props}>CsvIcon</span>, FileCsv: (props) => <span {...props}>CsvIcon</span> }));
vi.mock("@phosphor-icons/react/dist/csr/FileHtml", () => ({ default: (props) => <span {...props}>HtmlIcon</span>, FileHtml: (props) => <span {...props}>HtmlIcon</span> }));
vi.mock("@phosphor-icons/react/dist/csr/FileCode", () => ({ default: (props) => <span {...props}>CodeIcon</span>, FileCode: (props) => <span {...props}>CodeIcon</span> }));
vi.mock("@phosphor-icons/react/dist/csr/FileImage", () => ({ default: (props) => <span {...props}>ImageIcon</span>, FileImage: (props) => <span {...props}>ImageIcon</span> }));
vi.mock("@phosphor-icons/react/dist/csr/FileText", () => ({ default: (props) => <span {...props}>TextIcon</span>, FileText: (props) => <span {...props}>TextIcon</span> }));
vi.mock("@phosphor-icons/react/dist/csr/FileDoc", () => ({ default: (props) => <span {...props}>DocIcon</span>, FileDoc: (props) => <span {...props}>DocIcon</span> }));

vi.mock("@/components/ImageLightbox", () => ({
  openImageLightbox: vi.fn(),
}));

describe("AttachmentList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    const leftover = document.getElementById("dnd-chat-file-uploader");
    if (leftover) leftover.remove();
  });

  function makeAttachment(overrides = {}) {
    return {
      uid: Math.random().toString(36).slice(2),
      file: { name: "document.pdf" },
      status: "embedded",
      error: null,
      document: null,
      type: "document",
      contentString: null,
      ...overrides,
    };
  }

  it("renders nothing when there are no attachments", () => {
    const { container } = render(<AttachmentList attachments={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("forwards attachments to the attachment manager", () => {
    const attachments = [makeAttachment(), makeAttachment()];
    const { container } = render(<AttachmentList attachments={attachments} />);
    expect(container.querySelectorAll(".group")).toHaveLength(2);
  });

  it("renders the file name for each attachment", () => {
    const attachments = [
      makeAttachment({ file: { name: "report.pdf" } }),
      makeAttachment({ file: { name: "data.csv" } }),
    ];
    render(<AttachmentList attachments={attachments} />);
    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText("data.csv")).toBeInTheDocument();
  });

  it("renders an uploading spinner for attachments in progress", () => {
    const attachments = [makeAttachment({ status: "in_progress" })];
    render(<AttachmentList attachments={attachments} />);
    expect(screen.getByText("Spinner")).toBeInTheDocument();
    expect(screen.getByText("Uploading...")).toBeInTheDocument();
  });

  it("renders an error state for failed attachments", () => {
    const attachments = [
      makeAttachment({ status: "failed", error: "Upload failed" }),
    ];
    render(<AttachmentList attachments={attachments} />);
    expect(screen.getByText("Warning")).toBeInTheDocument();
    expect(screen.getByText("Upload failed")).toBeInTheDocument();
  });

  it("renders an image preview for image attachments with a content string", () => {
    const attachments = [
      makeAttachment({
        type: "attachment",
        contentString: "data:image/png;base64,abc",
        file: { name: "image.png" },
      }),
    ];
    render(<AttachmentList attachments={attachments} />);
    const img = screen.getByAltText("Preview of image.png");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "data:image/png;base64,abc");
  });

  it("opens the image lightbox when clicking an image attachment", async () => {
    const user = userEvent.setup();
    const attachments = [
      makeAttachment({
        type: "attachment",
        contentString: "data:image/png;base64,abc",
        file: { name: "image.png" },
      }),
    ];
    render(<AttachmentList attachments={attachments} />);
    await user.click(screen.getByAltText("Preview of image.png"));
    expect(openImageLightbox).toHaveBeenCalledWith(
      [{ contentString: "data:image/png;base64,abc", name: "image.png" }],
      0,
    );
  });

  it("dispatches a remove event when the remove button is clicked", () => {
    const listener = vi.fn();
    window.addEventListener("ATTACHMENT_REMOVE", listener);

    const attachments = [makeAttachment({ uid: "abc-123", document: "doc-1" })];
    render(<AttachmentList attachments={attachments} />);

    const removeButton = screen.getByTestId("remove-icon").closest("button");
    removeButton.click();
    expect(listener).toHaveBeenCalledTimes(1);

    const event = listener.mock.calls[0][0];
    expect(event.detail).toEqual({ uid: "abc-123", document: "doc-1" });

    window.removeEventListener("ATTACHMENT_REMOVE", listener);
  });

  it("picks the correct icon based on file extension", () => {
    const attachments = [
      makeAttachment({ file: { name: "report.pdf" } }),
      makeAttachment({ file: { name: "data.csv" } }),
      makeAttachment({ file: { name: "page.html" } }),
      makeAttachment({ file: { name: "script.js" } }),
      makeAttachment({ file: { name: "photo.jpg" } }),
      makeAttachment({ file: { name: "unknown.xyz" } }),
    ];
    render(<AttachmentList attachments={attachments} />);
    expect(screen.getByText("PdfIcon")).toBeInTheDocument();
    expect(screen.getByText("CsvIcon")).toBeInTheDocument();
    expect(screen.getByText("HtmlIcon")).toBeInTheDocument();
    expect(screen.getByText("CodeIcon")).toBeInTheDocument();
    expect(screen.getByText("ImageIcon")).toBeInTheDocument();
    expect(screen.getByText("TextIcon")).toBeInTheDocument();
  });

  it("renders the status text for embedded documents", () => {
    const attachments = [makeAttachment({ status: "embedded" })];
    render(<AttachmentList attachments={attachments} />);
    expect(screen.getByText("File embedded!")).toBeInTheDocument();
  });

  it("renders the status text for context documents", () => {
    const attachments = [makeAttachment({ status: "pending" })];
    render(<AttachmentList attachments={attachments} />);
    expect(screen.getByText("Added as context!")).toBeInTheDocument();
  });
});
