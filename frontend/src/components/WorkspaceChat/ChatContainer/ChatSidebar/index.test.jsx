// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  ChatSidebarProvider,
  useChatSidebar,
  useDatabaseSidebar,
  usePreviewSidebar,
  usePoliticalSidebar,
} from "./index";

function wrapper({ children }) {
  return <ChatSidebarProvider>{children}</ChatSidebarProvider>;
}

describe("ChatSidebarProvider", () => {
  it("starts with all sidebars closed", () => {
    const { result } = renderHook(() => useChatSidebar(), { wrapper });
    expect(result.current.activeSidebar).toBeNull();
    expect(result.current.sidebarData).toBeNull();
  });

  it("openSidebar sets the active sidebar", () => {
    const { result } = renderHook(() => useChatSidebar(), { wrapper });
    act(() => result.current.openSidebar("preview", { id: 1 }));
    expect(result.current.activeSidebar).toBe("preview");
    expect(result.current.sidebarData).toEqual({ id: 1 });
  });

  it("toggleSidebar opens if closed, closes if open", () => {
    const { result } = renderHook(() => useChatSidebar(), { wrapper });
    act(() => result.current.toggleSidebar("console"));
    expect(result.current.activeSidebar).toBe("console");
    act(() => result.current.toggleSidebar("console"));
    expect(result.current.activeSidebar).toBeNull();
  });

  it("closeSidebar resets both state slots", () => {
    const { result } = renderHook(() => useChatSidebar(), { wrapper });
    act(() => result.current.openSidebar("database", [1, 2, 3]));
    act(() => result.current.closeSidebar());
    expect(result.current.activeSidebar).toBeNull();
    expect(result.current.sidebarData).toBeNull();
  });

  it("exposes preview data via usePreviewSidebar", () => {
    const { result } = renderHook(
      () => {
        const ctx = useChatSidebar();
        const preview = usePreviewSidebar();
        return { ctx, preview };
      },
      { wrapper },
    );
    act(() =>
      result.current.ctx.openPreview({ content: "<p>x</p>", title: "Doc" }),
    );
    expect(result.current.preview.previewData.title).toBe("Doc");
    expect(result.current.preview.sidebarOpen).toBe(true);
  });
});

describe("specialized sidebar hooks", () => {
  it("useDatabaseSidebar exposes only database state", () => {
    const { result } = renderHook(
      () => {
        const ctx = useChatSidebar();
        const db = useDatabaseSidebar();
        return { ctx, db };
      },
      { wrapper },
    );
    act(() => result.current.ctx.openSidebar("database"));
    expect(result.current.db.sidebarOpen).toBe(true);
  });

  it("usePoliticalSidebar.isOpen reflects political state", () => {
    const { result } = renderHook(
      () => {
        const ctx = useChatSidebar();
        const pol = usePoliticalSidebar();
        return { ctx, pol };
      },
      { wrapper },
    );
    act(() => result.current.ctx.openSidebar("political"));
    expect(result.current.pol.sidebarOpen).toBe(true);
  });
});
