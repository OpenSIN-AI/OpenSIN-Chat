// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  renderHook,
  act,
  render,
  screen,
  fireEvent,
} from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

function withRouter(initialPath = "/") {
  return function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[initialPath]}>
        <SidebarToggleProvider>{children}</SidebarToggleProvider>
      </MemoryRouter>
    );
  };
}
import {
  useSidebarToggle,
  ToggleSidebarButton,
  SidebarToggleProvider,
  SIDEBAR_TOGGLE_EVENT,
} from "./index";

describe("useSidebarToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  it("returns showSidebar as true by default", () => {
    const { result } = renderHook(() => useSidebarToggle(), {
      wrapper: withRouter(window.location.pathname),
    });
    expect(result.current.showSidebar).toBe(true);
  });

  it("returns showSidebar as false when localStorage has 'closed'", () => {
    localStorage.getItem.mockReturnValueOnce("closed");
    const { result } = renderHook(() => useSidebarToggle(), {
      wrapper: withRouter(window.location.pathname),
    });
    expect(result.current.showSidebar).toBe(false);
  });

  it("returns canToggleSidebar as true for home path", () => {
    window.history.pushState({}, "", "/");
    const { result } = renderHook(() => useSidebarToggle(), {
      wrapper: withRouter(window.location.pathname),
    });
    expect(result.current.canToggleSidebar).toBe(true);
  });

  it("returns canToggleSidebar as true for workspace path", () => {
    window.history.pushState({}, "", "/workspace/my-workspace");
    const { result } = renderHook(() => useSidebarToggle(), {
      wrapper: withRouter(window.location.pathname),
    });
    expect(result.current.canToggleSidebar).toBe(true);
  });

  it("returns canToggleSidebar as true for workspace thread path", () => {
    window.history.pushState({}, "", "/workspace/my-workspace/t/thread-123");
    const { result } = renderHook(() => useSidebarToggle(), {
      wrapper: withRouter(window.location.pathname),
    });
    expect(result.current.canToggleSidebar).toBe(true);
  });

  it("returns canToggleSidebar as false for other paths", () => {
    window.history.pushState({}, "", "/settings");
    const { result } = renderHook(() => useSidebarToggle(), {
      wrapper: withRouter(window.location.pathname),
    });
    expect(result.current.canToggleSidebar).toBe(false);
  });

  it("reacts to react-router location changes via useLocation", () => {
    let navigate;
    function Probe() {
      const { canToggleSidebar } = useSidebarToggle();
      return (
        <div data-testid="can-toggle" data-value={String(canToggleSidebar)} />
      );
    }
    function Harness() {
      navigate = useNavigate();
      return <Probe />;
    }
    render(
      <MemoryRouter initialEntries={["/"]}>
        <SidebarToggleProvider>
          <Harness />
        </SidebarToggleProvider>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("can-toggle").getAttribute("data-value")).toBe(
      "true",
    );

    act(() => navigate("/workspace/demo-ws"));
    expect(screen.getByTestId("can-toggle").getAttribute("data-value")).toBe(
      "true",
    );

    act(() => navigate("/workspace/demo-ws/t/thread-42"));
    expect(screen.getByTestId("can-toggle").getAttribute("data-value")).toBe(
      "true",
    );

    act(() => navigate("/settings"));
    expect(screen.getByTestId("can-toggle").getAttribute("data-value")).toBe(
      "false",
    );
  });

  it("setShowSidebar updates state", () => {
    const { result } = renderHook(() => useSidebarToggle(), {
      wrapper: withRouter(window.location.pathname),
    });
    act(() => {
      result.current.setShowSidebar(false);
    });
    expect(result.current.showSidebar).toBe(false);
  });

  it("dispatches sidebar-toggle event on state change", () => {
    const handler = vi.fn();
    window.addEventListener(SIDEBAR_TOGGLE_EVENT, handler);
    const { result } = renderHook(() => useSidebarToggle(), {
      wrapper: withRouter(window.location.pathname),
    });
    act(() => {
      result.current.setShowSidebar(false);
    });
    expect(handler).toHaveBeenCalled();
    window.removeEventListener(SIDEBAR_TOGGLE_EVENT, handler);
  });
});

describe("ToggleSidebarButton", () => {
  it("renders button with aria-label for visible sidebar", () => {
    const setShowSidebar = vi.fn();
    render(
      <ToggleSidebarButton
        showSidebar={true}
        setShowSidebar={setShowSidebar}
      />,
    );
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toContain("Hide sidebar");
  });

  it("renders button with aria-label for hidden sidebar", () => {
    const setShowSidebar = vi.fn();
    render(
      <ToggleSidebarButton
        showSidebar={false}
        setShowSidebar={setShowSidebar}
      />,
    );
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toContain("Show sidebar");
  });

  it("calls setShowSidebar on click", () => {
    const setShowSidebar = vi.fn();
    render(
      <ToggleSidebarButton
        showSidebar={true}
        setShowSidebar={setShowSidebar}
      />,
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(setShowSidebar).toHaveBeenCalled();
  });
});
