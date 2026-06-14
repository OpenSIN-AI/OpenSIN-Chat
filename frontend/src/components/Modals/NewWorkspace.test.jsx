// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NewWorkspaceModal, { useNewWorkspaceModal } from "./NewWorkspace";
vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@/components/ModalWrapper", () => ({
  default: ({ children }) => <div data-testid="modal-wrapper">{children}</div>,
}));

vi.mock("@phosphor-icons/react", () => ({
  X: (props) => <svg data-testid="x-icon" {...props} />,
}));

vi.mock("@/models/workspace", () => ({
  default: {
    new: vi.fn(),
  },
}));

vi.mock("@/utils/paths", () => ({
  default: {
    workspace: { chat: (slug) => `/workspace/${slug}` },
  },
}));

describe("NewWorkspaceModal", () => {
  const hideModal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without errors", () => {
    render(<NewWorkspaceModal hideModal={hideModal} />);
    expect(screen.getByTestId("modal-wrapper")).toBeInTheDocument();
  });

  it("renders the X close icon", () => {
    render(<NewWorkspaceModal hideModal={hideModal} />);
    expect(screen.getByTestId("x-icon")).toBeInTheDocument();
  });

  it("close button has aria-label and type=button", () => {
    render(<NewWorkspaceModal hideModal={hideModal} />);
    const closeBtn = screen.getByLabelText("Close new workspace dialog");
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn).toHaveAttribute("type", "button");
  });

  it("clicking close button calls hideModal", () => {
    render(<NewWorkspaceModal hideModal={hideModal} />);
    fireEvent.click(screen.getByLabelText("Close new workspace dialog"));
    expect(hideModal).toHaveBeenCalledTimes(1);
  });

  it("renders the Save button with type=submit", () => {
    render(<NewWorkspaceModal hideModal={hideModal} />);
    const saveBtn = screen.getByText("Save");
    expect(saveBtn).toHaveAttribute("type", "submit");
  });

  it("renders the name input with id", () => {
    render(<NewWorkspaceModal hideModal={hideModal} />);
    const input = screen.getByLabelText("Workspace Name");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "text");
  });
});

describe("useNewWorkspaceModal", () => {
  it("returns showing=false initially", () => {
    function TestComponent() {
      const m = useNewWorkspaceModal();
      return (
        <div>
          <span data-testid="showing">{String(m.showing)}</span>
          <button type="button" onClick={m.showModal} data-testid="show">
            show
          </button>
          <button type="button" onClick={m.hideModal} data-testid="hide">
            hide
          </button>
        </div>
      );
    }
    render(<TestComponent />);
    expect(screen.getByTestId("showing").textContent).toBe("false");
  });

  it("showModal sets showing to true", () => {
    function TestComponent() {
      const m = useNewWorkspaceModal();
      return (
        <div>
          <span data-testid="showing">{String(m.showing)}</span>
          <button type="button" onClick={m.showModal} data-testid="show">
            show
          </button>
        </div>
      );
    }
    render(<TestComponent />);
    fireEvent.click(screen.getByTestId("show"));
    expect(screen.getByTestId("showing").textContent).toBe("true");
  });

  it("hideModal sets showing to false", () => {
    function TestComponent() {
      const m = useNewWorkspaceModal();
      return (
        <div>
          <span data-testid="showing">{String(m.showing)}</span>
          <button type="button" onClick={m.hideModal} data-testid="hide">
            hide
          </button>
        </div>
      );
    }
    render(<TestComponent />);
    fireEvent.click(screen.getByTestId("hide"));
    expect(screen.getByTestId("showing").textContent).toBe("false");
  });
});
