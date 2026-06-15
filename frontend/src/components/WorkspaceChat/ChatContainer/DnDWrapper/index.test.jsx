// SPDX-License-Identifier: MIT
// Tests for DnDFileUploaderProvider and DnDFileUploaderWrapper
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useContext } from "react";
import { MemoryRouter } from "react-router-dom";
import {
  DnDFileUploaderProvider,
  DndUploaderContext,
  REMOVE_ATTACHMENT_EVENT,
  CLEAR_ATTACHMENTS_EVENT,
} from "./index";
import DnDFileUploaderWrapper from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

// ---- module mocks ----
vi.mock("react-dropzone", () => ({
  useDropzone: () => ({
    getRootProps: () => ({ "data-testid": "dropzone" }),
    getInputProps: () => ({}),
    isDragActive: false,
  }),
}));

vi.mock("./dnd-icon.png", () => ({ default: "/dnd-icon.png" }));

vi.mock("@/models/workspace", () => ({
  default: {
    uploadFile: vi.fn().mockResolvedValue({ error: null }),
    rejectFile: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/hooks/useDocument", () => ({
  default: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/hooks/useDocumentProcessorOnline", () => ({
  default: () => ({ isOnline: true }),
}));

vi.mock("@/utils/toast", () => ({
  default: vi.fn(),
}));

vi.mock("./FileUploadWarningModal", () => ({
  default: ({ onClose, onConfirm }) => (
    <div data-testid="warning-modal">
      <button onClick={onClose}>Cancel</button>
      <button onClick={onConfirm}>Confirm</button>
    </div>
  ),
}));

// ---- helpers ----
const workspace = { id: 1, slug: "my-ws" };

const ContextConsumer = () => {
  const ctx = useContext(DndUploaderContext);
  return (
    <div>
      <span data-testid="file-count">{ctx?.files?.length ?? 0}</span>
      <span data-testid="is-embedding">
        {String(ctx?.isEmbedding ?? false)}
      </span>
      <span data-testid="dragging">{String(ctx?.dragging ?? false)}</span>
    </div>
  );
};

const Wrapper = ({ children }) => <MemoryRouter>{children}</MemoryRouter>;

describe("DnDFileUploaderProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children without crashing", () => {
    render(
      <DnDFileUploaderProvider workspace={workspace}>
        <div data-testid="child">Hello</div>
      </DnDFileUploaderProvider>,
      { wrapper: Wrapper },
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("provides context with initial empty file list", () => {
    render(
      <DnDFileUploaderProvider workspace={workspace}>
        <ContextConsumer />
      </DnDFileUploaderProvider>,
      { wrapper: Wrapper },
    );
    expect(screen.getByTestId("file-count").textContent).toBe("0");
  });

  it("provides context with isEmbedding=false initially", () => {
    render(
      <DnDFileUploaderProvider workspace={workspace}>
        <ContextConsumer />
      </DnDFileUploaderProvider>,
      { wrapper: Wrapper },
    );
    expect(screen.getByTestId("is-embedding").textContent).toBe("false");
  });

  it("dispatching CLEAR_ATTACHMENTS_EVENT empties the file list", async () => {
    render(
      <DnDFileUploaderProvider workspace={workspace}>
        <ContextConsumer />
      </DnDFileUploaderProvider>,
      { wrapper: Wrapper },
    );

    await act(async () => {
      window.dispatchEvent(new Event(CLEAR_ATTACHMENTS_EVENT));
    });

    expect(screen.getByTestId("file-count").textContent).toBe("0");
  });

  it("dispatching REMOVE_ATTACHMENT_EVENT does not crash", async () => {
    render(
      <DnDFileUploaderProvider workspace={workspace}>
        <ContextConsumer />
      </DnDFileUploaderProvider>,
      { wrapper: Wrapper },
    );

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(REMOVE_ATTACHMENT_EVENT, {
          detail: { uid: "nonexistent" },
        }),
      );
    });

    expect(screen.getByTestId("file-count").textContent).toBe("0");
  });

  it("renders dropzone area", () => {
    // The dropzone div is rendered by DnDFileUploaderWrapper (not the provider directly)
    render(
      <DnDFileUploaderProvider workspace={workspace}>
        <DnDFileUploaderWrapper>
          <span data-testid="wrapped-child">child</span>
        </DnDFileUploaderWrapper>
      </DnDFileUploaderProvider>,
      { wrapper: Wrapper },
    );
    expect(screen.getByTestId("dropzone")).toBeInTheDocument();
  });

  it("renders children inside the dropzone context", () => {
    render(
      <DnDFileUploaderProvider workspace={workspace}>
        <span data-testid="inner-child">inner</span>
      </DnDFileUploaderProvider>,
      { wrapper: Wrapper },
    );
    expect(screen.getByTestId("inner-child")).toBeInTheDocument();
  });

  it("cleans up event listeners on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(
      <DnDFileUploaderProvider workspace={workspace}>
        <div />
      </DnDFileUploaderProvider>,
      { wrapper: Wrapper },
    );
    unmount();
    expect(removeSpy).toHaveBeenCalledWith(
      REMOVE_ATTACHMENT_EVENT,
      expect.any(Function),
    );
    expect(removeSpy).toHaveBeenCalledWith(
      CLEAR_ATTACHMENTS_EVENT,
      expect.any(Function),
    );
  });
});
