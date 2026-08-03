// SPDX-License-Identifier: MIT
import React, { createRef } from "react";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDeepResearchSourceIds } = vi.hoisted(() => ({
  getDeepResearchSourceIds: vi.fn(() => ["web-search"]),
}));
vi.mock("./DeepResearchSources", () => ({
  DEEP_RESEARCH_SOURCES_EVENT: "deep-research-sources-change",
  getDeepResearchSourceIds,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      options?.count ? `${key}:${options.count}` : key,
  }),
}));

import AgentModeButton, {
  AGENT_MODE_EVENT,
  AGENT_MODES,
  applyAgentModePrefix,
  buildAgentModePrefix,
  getAgentModeById,
  parseAgentMode,
  useAgentMode,
} from "./AgentModeButton";

const storage = window.localStorage as unknown as {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
};

describe("AgentModeButton helpers", () => {
  beforeEach(() => {
    storage.getItem.mockReturnValue(null);
    getDeepResearchSourceIds.mockReturnValue(["web-search"]);
  });

  it("builds mode prefixes with explicit, stored, and fallback sources", () => {
    expect(buildAgentModePrefix("report")).toBe("@agent [report]");
    expect(buildAgentModePrefix("deep-research", ["web-search", "gmail"])).toBe(
      "@agent [deep-research]\n[sources:web-search,gmail]",
    );
    expect(buildAgentModePrefix("deep-research")).toBe(
      "@agent [deep-research]\n[sources:web-search]",
    );
    getDeepResearchSourceIds.mockReturnValue([]);
    expect(buildAgentModePrefix("deep-research", [])).toContain(
      "[sources:web-search]",
    );
  });

  it("replaces old prefixes and can remove agent mode cleanly", () => {
    expect(applyAgentModePrefix("hello", "report")).toBe(
      "@agent [report] hello",
    );
    expect(
      applyAgentModePrefix(
        "@agent [deep-research]\n[sources:web-search] old",
        "report",
      ),
    ).toBe("@agent [report] old");
    expect(applyAgentModePrefix("@agent plain", null)).toBe("plain");
    expect(applyAgentModePrefix("", "report")).toBe("@agent [report]");
    expect(applyAgentModePrefix("@agent [report]", null)).toBe("");
  });

  it("looks up and parses known modes without accepting unknown ones", () => {
    expect(getAgentModeById("report")?.id).toBe("report");
    expect(getAgentModeById("missing")).toBeNull();
    expect(parseAgentMode("")).toEqual({ mode: null, cleanMessage: "" });
    expect(parseAgentMode("@agent [REPORT] write this")).toMatchObject({
      mode: { id: "report" },
      cleanMessage: "@agent write this",
    });
    expect(parseAgentMode("@agent [unknown] leave it")).toEqual({
      mode: null,
      cleanMessage: "@agent [unknown] leave it",
    });
    expect(parseAgentMode("ordinary")).toEqual({
      mode: null,
      cleanMessage: "ordinary",
    });
  });
});

describe("useAgentMode", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    storage.getItem.mockReturnValue(null);
    getDeepResearchSourceIds.mockReturnValue(["web-search", "gmail"]);
  });

  it("loads enabled persisted modes and rejects unknown or disabled modes", () => {
    storage.getItem.mockReturnValue("report");
    const enabled = renderHook(() => useAgentMode());
    expect(enabled.result.current.activeMode?.id).toBe("report");
    enabled.unmount();

    storage.getItem.mockReturnValue("missing");
    const missing = renderHook(() => useAgentMode());
    expect(missing.result.current.activeMode).toBeNull();
    missing.unmount();

    storage.getItem.mockReturnValue("image-gen");
    const disabled = renderHook(() => useAgentMode());
    expect(disabled.result.current.activeMode).toBeNull();
    disabled.unmount();
  });

  it("handles storage read failures", () => {
    storage.getItem.mockImplementationOnce(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => useAgentMode());
    expect(result.current.activeMode).toBeNull();
  });

  it("responds to external mode changes and persists the result", () => {
    const { result } = renderHook(() => useAgentMode());
    act(() => {
      window.dispatchEvent(
        new CustomEvent(AGENT_MODE_EVENT, { detail: { mode: "report" } }),
      );
    });
    expect(result.current.activeMode?.id).toBe("report");
    expect(storage.setItem).toHaveBeenCalledWith(
      "opensin_agent_mode",
      "report",
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent(AGENT_MODE_EVENT, { detail: { mode: "missing" } }),
      );
    });
    expect(result.current.activeMode).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith("opensin_agent_mode");
  });

  it("selects enabled modes, rewrites the prompt, dispatches, and restores focus", () => {
    const { result } = renderHook(() => useAgentMode());
    const sendCommand = vi.fn();
    const focus = vi.fn();
    const textareaRef = { current: { focus } } as any;
    const listener = vi.fn();
    window.addEventListener(AGENT_MODE_EVENT, listener);

    act(() => {
      result.current.selectMode(
        AGENT_MODES[0],
        sendCommand,
        textareaRef,
        "question",
      );
      vi.advanceTimersByTime(50);
    });

    expect(result.current.activeMode?.id).toBe("deep-research");
    expect(sendCommand).toHaveBeenCalledWith({
      text: "@agent [deep-research]\n[sources:web-search,gmail] question",
      writeMode: "replace",
    });
    expect(storage.setItem).toHaveBeenCalled();
    expect(listener).toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();
    window.removeEventListener(AGENT_MODE_EVENT, listener);
  });

  it("ignores disabled modes and supports selection without command or ref", () => {
    const { result } = renderHook(() => useAgentMode());
    act(() => result.current.selectMode(AGENT_MODES[1], vi.fn(), null, "x"));
    expect(result.current.activeMode).toBeNull();

    act(() => result.current.selectMode(AGENT_MODES[2], null, null, ""));
    expect(result.current.activeMode?.id).toBe("report");
  });

  it("clears modes with and without prompt rewriting", () => {
    const { result } = renderHook(() => useAgentMode());
    const sendCommand = vi.fn();
    const focus = vi.fn();
    const textareaRef = { current: { focus } } as any;

    act(() => result.current.selectMode(AGENT_MODES[2], null, null, ""));
    act(() => {
      result.current.clearMode(
        sendCommand,
        textareaRef,
        "@agent [report] body",
      );
      vi.advanceTimersByTime(50);
    });
    expect(result.current.activeMode).toBeNull();
    expect(sendCommand).toHaveBeenCalledWith({
      text: "body",
      writeMode: "replace",
    });
    expect(focus).toHaveBeenCalled();

    act(() => result.current.clearMode(sendCommand, null, ""));
    expect(sendCommand).toHaveBeenCalledTimes(1);
  });

  it("closes an open dropdown for outside clicks and Escape but not inside clicks", () => {
    const { result } = renderHook(() => useAgentMode());
    const button = document.createElement("button");
    const dropdown = document.createElement("div");
    const inside = document.createElement("span");
    dropdown.appendChild(inside);
    result.current.buttonRef.current = button;
    result.current.dropdownRef.current = dropdown;

    act(() => result.current.setShowDropdown(true));
    act(() =>
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })),
    );
    expect(result.current.showDropdown).toBe(false);

    act(() => result.current.setShowDropdown(true));
    act(() =>
      inside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })),
    );
    expect(result.current.showDropdown).toBe(true);

    act(() =>
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
    );
    expect(result.current.showDropdown).toBe(false);
  });

  it("rewrites deep-research sources from event detail or storage fallback", () => {
    const listener = vi.fn();
    window.addEventListener("agent-mode-rewrite-prefix", listener);
    const hook = renderHook(() => useAgentMode());

    act(() => {
      window.dispatchEvent(
        new CustomEvent("deep-research-sources-change", {
          detail: { sources: ["web-search", "gmail"] },
        }),
      );
    });
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        detail: { modeId: "deep-research", sources: ["web-search", "gmail"] },
      }),
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent("deep-research-sources-change", { detail: {} }),
      );
    });
    expect(getDeepResearchSourceIds).toHaveBeenCalled();
    hook.unmount();
    window.removeEventListener("agent-mode-rewrite-prefix", listener);
  });
});

describe("AgentModeButton component", () => {
  const baseProps = () => ({
    sendCommand: vi.fn(),
    promptInput: "hello",
    textareaRef: createRef<HTMLTextAreaElement>(),
    activeMode: null,
    showDropdown: false,
    setShowDropdown: vi.fn(),
    buttonRef: createRef<HTMLElement>(),
    dropdownRef: createRef<HTMLDivElement>(),
    selectMode: vi.fn(),
    clearMode: vi.fn(),
  });

  it("renders nothing when hidden", () => {
    const { container } = render(
      <AgentModeButton {...baseProps()} visible={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("toggles from click and keyboard activation", () => {
    const props = baseProps();
    render(<AgentModeButton {...props} />);
    const button = screen.getByRole("button", {
      name: "chat_window.start_agent_session",
    });
    fireEvent.click(button);
    expect(props.setShowDropdown).toHaveBeenCalledWith(true);
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyDown(button, { key: " " });
    fireEvent.keyDown(button, { key: "Escape" });
    expect(props.setShowDropdown).toHaveBeenCalledTimes(3);
  });

  it("renders active mode, clears it, and selects enabled menu items", () => {
    const props = {
      ...baseProps(),
      activeMode: AGENT_MODES[2],
      showDropdown: true,
      buttonRef: null,
    };
    render(<AgentModeButton {...props} />);

    fireEvent.click(
      screen.getByRole("button", { name: "agentMode.removeMode" }),
    );
    expect(props.clearMode).toHaveBeenCalledWith(
      props.sendCommand,
      props.textareaRef,
      "hello",
    );

    fireEvent.click(
      screen.getByRole("button", { name: "agentMode.deepResearch" }),
    );
    expect(props.selectMode).toHaveBeenCalledWith(
      AGENT_MODES[0],
      props.sendCommand,
      props.textareaRef,
      "hello",
    );
    expect(screen.getByRole("dialog")).toHaveStyle({ top: "0px", left: "0px" });
  });

  it("closes through the portal backdrop and keeps dialog mouse handling local", () => {
    const props = { ...baseProps(), showDropdown: true };
    render(<AgentModeButton {...props} />);
    const backdrop = document.querySelector(".fixed.inset-0") as HTMLElement;
    fireEvent.mouseDown(backdrop);
    expect(props.setShowDropdown).toHaveBeenCalledWith(false);

    const dialog = screen.getByRole("dialog");
    const preventDefault = vi.fn();
    fireEvent.mouseDown(dialog, { preventDefault });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it.each([
    [{ top: 100, bottom: 120, left: 25 }, 900, { top: "126px", left: "25px" }],
    [
      { top: 700, bottom: 720, left: 35 },
      800,
      { bottom: "106px", left: "35px" },
    ],
    [{ top: 250, bottom: 270, left: 45 }, 500, { top: "276px", left: "45px" }],
  ])(
    "positions the dropdown for available viewport space",
    (rect, innerHeight, expected) => {
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
        ...rect,
        width: 20,
        height: 20,
        right: rect.left + 20,
        x: rect.left,
        y: rect.top,
        toJSON: () => ({}),
      } as DOMRect);
      Object.defineProperty(window, "innerHeight", {
        value: innerHeight,
        configurable: true,
      });
      const props = { ...baseProps(), showDropdown: false };
      const view = render(<AgentModeButton {...props} />);
      view.rerender(<AgentModeButton {...props} showDropdown={true} />);
      expect(screen.getByRole("dialog")).toHaveStyle(expected);
    },
  );
});
