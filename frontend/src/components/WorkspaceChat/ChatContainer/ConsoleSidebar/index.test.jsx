// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConsoleSidebar, { dispatchLog } from "./index";
vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

// jsdom does not implement scrollIntoView
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}

const mockCloseSidebar = vi.fn();
const mockClearConsoleLogs = vi.fn();
const mockUseConsoleSidebar = vi.fn();

vi.mock("../ChatSidebar", () => ({
  default: ({ isOpen, children }) =>
    isOpen ? <div data-testid="chat-sidebar">{children}</div> : null,
  useConsoleSidebar: () => mockUseConsoleSidebar(),
}));

vi.mock("@phosphor-icons/react/dist/csr/X", () => ({
  default: (props) => <svg data-testid="x-icon" {...props} />,
  X: (props) => <svg data-testid="x-icon" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/Terminal", () => ({
  default: (props) => <svg data-testid="terminal-icon" {...props} />,
  Terminal: (props) => <svg data-testid="terminal-icon" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/Bug", () => ({
  default: (props) => <svg data-testid="bug-icon" {...props} />,
  Bug: (props) => <svg data-testid="bug-icon" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/Trash", () => ({
  default: (props) => <svg data-testid="trash-icon" {...props} />,
  Trash: (props) => <svg data-testid="trash-icon" {...props} />,
}));

describe("ConsoleSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseConsoleSidebar.mockReturnValue({
      sidebarOpen: true,
      closeSidebar: mockCloseSidebar,
      consoleLogs: [],
      clearConsoleLogs: mockClearConsoleLogs,
    });
  });

  it("renders nothing when sidebar is closed", () => {
    mockUseConsoleSidebar.mockReturnValue({
      sidebarOpen: false,
      closeSidebar: mockCloseSidebar,
      consoleLogs: [],
      clearConsoleLogs: mockClearConsoleLogs,
    });
    const { container } = render(<ConsoleSidebar />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders when sidebar is open", () => {
    render(<ConsoleSidebar />);
    expect(screen.getByTestId("chat-sidebar")).toBeInTheDocument();
  });

  it("renders the title and close button", () => {
    render(<ConsoleSidebar />);
    expect(screen.getByText(/Console & Terminal/)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Console & Terminal schließen/i),
    ).toBeInTheDocument();
  });

  it("close button has type=button", () => {
    render(<ConsoleSidebar />);
    const closeBtn = screen.getByLabelText(/Console & Terminal schließen/i);
    expect(closeBtn).toHaveAttribute("type", "button");
  });

  it("clicking close button calls closeSidebar", () => {
    render(<ConsoleSidebar />);
    fireEvent.click(screen.getByLabelText(/Console & Terminal schließen/i));
    expect(mockCloseSidebar).toHaveBeenCalledTimes(1);
  });

  it("renders Logs and Terminal tab buttons", () => {
    render(<ConsoleSidebar />);
    expect(screen.getAllByText("Logs").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Terminal").length).toBeGreaterThan(0);
  });

  it("logs tab is selected by default", () => {
    render(<ConsoleSidebar />);
    const logsTab = screen.getByRole("tab", { name: /Logs/i });
    expect(logsTab).toHaveAttribute("aria-selected", "true");
  });

  it("clicking Terminal tab switches active tab", () => {
    render(<ConsoleSidebar />);
    const terminalTab = screen.getByRole("tab", { name: /Terminal/i });
    fireEvent.click(terminalTab);
    expect(terminalTab).toHaveAttribute("aria-selected", "true");
  });

  it("renders Bug and Terminal icons in tabs", () => {
    render(<ConsoleSidebar />);
    expect(screen.getAllByTestId("bug-icon").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("terminal-icon").length).toBeGreaterThan(0);
  });

  it("shows no logs message initially", () => {
    render(<ConsoleSidebar />);
    expect(screen.getByText(/No logs yet/)).toBeInTheDocument();
  });
});

describe("dispatchLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches a custom event on window", () => {
    const listener = vi.fn();
    window.addEventListener("opensin:log", listener);
    dispatchLog("info", "test message");
    expect(listener).toHaveBeenCalled();
    const event = listener.mock.calls[0][0];
    expect(event.detail.message).toBe("test message");
    expect(event.detail.level).toBe("info");
    window.removeEventListener("opensin:log", listener);
  });
});
