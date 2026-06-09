// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RecoveryCodeModal from "./index";

vi.mock("file-saver", () => ({
  saveAs: vi.fn(),
}));

vi.mock("@/utils/toast", () => ({
  default: vi.fn(),
}));

vi.mock("@/components/ModalWrapper", () => ({
  default: ({ children }) => <div data-testid="modal-wrapper">{children}</div>,
}));

vi.mock("@phosphor-icons/react", () => ({
  DownloadSimple: (props) => <svg data-testid="download-icon" {...props} />,
  Key: (props) => <svg data-testid="key-icon" {...props} />,
}));

describe("RecoveryCodeModal", () => {
  const recoveryCodes = ["code-one-1234", "code-two-5678", "code-three-9012"];
  const onDownloadComplete = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without errors", () => {
    render(
      <RecoveryCodeModal
        recoveryCodes={recoveryCodes}
        onDownloadComplete={onDownloadComplete}
        onClose={onClose}
      />,
    );
    expect(screen.getByTestId("modal-wrapper")).toBeInTheDocument();
  });

  it("renders the key icon in the header", () => {
    render(
      <RecoveryCodeModal
        recoveryCodes={recoveryCodes}
        onDownloadComplete={onDownloadComplete}
        onClose={onClose}
      />,
    );
    expect(screen.getByTestId("key-icon")).toBeInTheDocument();
  });

  it("renders all recovery codes", () => {
    render(
      <RecoveryCodeModal
        recoveryCodes={recoveryCodes}
        onDownloadComplete={onDownloadComplete}
        onClose={onClose}
      />,
    );
    recoveryCodes.forEach((code) => {
      expect(screen.getByText(code)).toBeInTheDocument();
    });
  });

  it("renders the Recovery Codes heading", () => {
    render(
      <RecoveryCodeModal
        recoveryCodes={recoveryCodes}
        onDownloadComplete={onDownloadComplete}
        onClose={onClose}
      />,
    );
    expect(screen.getByText("Recovery Codes")).toBeInTheDocument();
  });

  it("renders the Download button with aria-label", () => {
    render(
      <RecoveryCodeModal
        recoveryCodes={recoveryCodes}
        onDownloadComplete={onDownloadComplete}
        onClose={onClose}
      />,
    );
    const downloadBtn = screen.getByLabelText("Download recovery codes");
    expect(downloadBtn).toBeInTheDocument();
    expect(downloadBtn).toHaveAttribute("type", "button");
  });

  it("triggers download on Download button click", async () => {
    const { saveAs } = await import("file-saver");
    render(
      <RecoveryCodeModal
        recoveryCodes={recoveryCodes}
        onDownloadComplete={onDownloadComplete}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByLabelText("Download recovery codes"));
    expect(saveAs).toHaveBeenCalled();
  });

  it("switches to Close label after download", () => {
    render(
      <RecoveryCodeModal
        recoveryCodes={recoveryCodes}
        onDownloadComplete={onDownloadComplete}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByLabelText("Download recovery codes"));
    expect(screen.getByLabelText("Close recovery codes")).toBeInTheDocument();
  });

  it("calls onDownloadComplete and onClose when Close clicked after download", () => {
    render(
      <RecoveryCodeModal
        recoveryCodes={recoveryCodes}
        onDownloadComplete={onDownloadComplete}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByLabelText("Download recovery codes"));
    fireEvent.click(screen.getByLabelText("Close recovery codes"));
    expect(onDownloadComplete).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has aria-label on the copy button (recovery code list)", () => {
    render(
      <RecoveryCodeModal
        recoveryCodes={recoveryCodes}
        onDownloadComplete={onDownloadComplete}
        onClose={onClose}
      />,
    );
    expect(
      screen.getByLabelText("Copy recovery codes to clipboard"),
    ).toBeInTheDocument();
  });
});
