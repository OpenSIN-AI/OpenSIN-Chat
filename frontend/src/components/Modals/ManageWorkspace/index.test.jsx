// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ManageWorkspaceModal, { useManageWorkspaceModal } from "./index";
vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("react-router-dom", () => ({
  useParams: () => ({ slug: "test-workspace" }),
}));


vi.mock("react-device-detect", () => ({
  isMobileOnly: false,
}));

vi.mock("../../../hooks/useUser", () => ({
  default: vi.fn(),
}));

vi.mock("../../../hooks/useSystemSettings", () => ({
  default: vi.fn(),
}));

vi.mock("../../../hooks/useWorkspaceBySlug", () => ({
  default: vi.fn(),
}));

vi.mock("@/EmbeddingProgressContext", () => ({
  EmbeddingProgressProvider: ({ children }) => <>{children}</>,
}));

vi.mock("./Documents", () => ({
  default: () => <div data-testid="documents-tab">Documents</div>,
}));

vi.mock("./DataConnectors", () => ({
  default: () => <div data-testid="dataconnectors-tab">DataConnectors</div>,
}));

vi.mock("@phosphor-icons/react", () => ({
  X: (props) => <svg data-testid="x-icon" {...props} />,
}));

import useUser from "../../../hooks/useUser";
import useSystemSettings from "../../../hooks/useSystemSettings";
import useWorkspace from "../../../hooks/useWorkspaceBySlug";

describe("ManageWorkspaceModal", () => {
  const hideModal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useUser.mockReturnValue({ user: { role: "admin" } });
    useSystemSettings.mockReturnValue({ settings: {} });
    useWorkspace.mockReturnValue({
      workspace: { id: 1, name: "Test Workspace", slug: "test-workspace" },
    });
  });

  it("renders nothing when workspace is null", () => {
    useWorkspace.mockReturnValue({ workspace: null });
    const { container } = render(<ManageWorkspaceModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders desktop view by default", () => {
    render(<ManageWorkspaceModal hideModal={hideModal} />);
    expect(screen.getByTestId("documents-tab")).toBeInTheDocument();
  });

  it("renders the X close icon", () => {
    render(<ManageWorkspaceModal hideModal={hideModal} />);
    expect(screen.getByTestId("x-icon")).toBeInTheDocument();
  });

  it("close button has aria-label and type=button", () => {
    render(<ManageWorkspaceModal hideModal={hideModal} />);
    const closeBtn = screen.getByLabelText("Close manage workspace dialog");
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn).toHaveAttribute("type", "button");
  });

  it("clicking the close button calls hideModal", () => {
    render(<ManageWorkspaceModal hideModal={hideModal} />);
    fireEvent.click(screen.getByLabelText("Close manage workspace dialog"));
    expect(hideModal).toHaveBeenCalledTimes(1);
  });

  it("switches to data connectors tab on click", () => {
    render(<ManageWorkspaceModal hideModal={hideModal} />);
    fireEvent.click(screen.getByLabelText("Show data connectors tab"));
    expect(screen.getByTestId("dataconnectors-tab")).toBeInTheDocument();
  });

  it("does not render tab switcher for default role users", () => {
    useUser.mockReturnValue({ user: { role: "default" } });
    render(<ManageWorkspaceModal hideModal={hideModal} />);
    expect(
      screen.queryByLabelText("Show documents tab"),
    ).not.toBeInTheDocument();
  });
});

describe("useManageWorkspaceModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns showing=false initially and toggle functions", () => {
    useUser.mockReturnValue({ user: { role: "admin" } });
    function TestComponent() {
      const m = useManageWorkspaceModal();
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

  it("showModal sets showing to true for non-default role", () => {
    useUser.mockReturnValue({ user: { role: "admin" } });
    function TestComponent() {
      const m = useManageWorkspaceModal();
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

  it("showModal does nothing for default role", () => {
    useUser.mockReturnValue({ user: { role: "default" } });
    function TestComponent() {
      const m = useManageWorkspaceModal();
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
    expect(screen.getByTestId("showing").textContent).toBe("false");
  });
});
