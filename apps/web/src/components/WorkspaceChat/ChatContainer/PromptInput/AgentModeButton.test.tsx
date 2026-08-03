// SPDX-License-Identifier: MIT
import React, { createRef } from "react";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/utils/features", () => ({
  FEATURES: { imageGeneration: true },
}));

const { logger } = vi.hoisted(() => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/utils/logger", () => ({ default: logger }));

import AgentModeButton, {
  AGENT_MODE_EVENT,
  AGENT_MODES,
  applyAgentModePrefix,
  buildAgentModePrefix,
  getAgentModeById,
  parseAgentMode,
  useAgentMode,
} from "./AgentModeButton";
import {
  DEEP_RESEARCH_SOURCES_EVENT,
  getDeepResearchSourceIds,
} from "./DeepResearchSources";

beforeEach(() => {
  localStorage.clear();
  vi.mocked(localStorage.getItem).mockReset().mockReturnValue(null);
  vi.mocked(localStorage.setItem).mockReset();
  vi.mocked(localStorage.removeItem).mockReset();
  logger.warn.mockClear();
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 800,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("agent mode helpers", () => {
  it("builds prefixes and normalizes existing prompt prefixes", () => {
    expect(buildAgentModePrefix("report")).toBe("@agent [report]");
    expect(buildAgentModePrefix("deep-research", ["gmail", "web-search"])).toBe(
      "@agent [deep-research]\n[sources:gmail,web-search]",
    );
    expect(buildAgentModePrefix("deep-research", [])).toContain(
      `[sources:${getDeepResearchSourceIds().join(",")}]`,
    );

    expect(applyAgentModePrefix("  hello  ", "report")).toBe(
      "@agent [report] hello",
    );
    expect(
      applyAgentModePrefix(
        "@agent [deep-research]\n[sources:web-search] existing",
        "image-gen",
      ),
    ).toBe("@agent [image-gen] existing");
    expect(applyAgentModePrefix("@agent existing", null)).toBe("existing");
    expect(applyAgentModePrefix("", "report")).toBe("@agent [report]");
  });

  it("finds and parses valid modes while preserving unknown messages", () => {
    expect(getAgentModeById("report")?.id).toBe("report");
    expect(getAgentModeById("missing")).toBeNull();
    expect(parseAgentMode("")).toEqual({ mode: null, cleanMessage: "" });
    expect(parseAgentMode("@agent [REPORT] make it concise")).toMatchObject({
      mode: { id: "report" },
      cleanMessage: "@agent make it concise",
    });
    expect(parseAgentMode("@agent [unknown] keep me")).toEqual({
      mode: null,
      cleanMessage: "@agent [unknown] keep me",
    });
    expect(parseAgentMode("normal message")).toEqual({
      mode: null,
      cleanMessage: "normal message",
    });
  });
});

describe("useAgentMode", () => {
  it("loads valid persisted modes and rejects missing or unreadable storage", () => {
    vi.mocked(localStorage.getItem).mockReturnValueOnce("report");
    const persisted = renderHook(() => useAgentMode());
    expect(persisted.result.current.activeMode?.id).toBe("report");
    persisted.unmount();

    vi.mocked(localStorage.getItem).mockReturnValueOnce("missing");
    const missing = renderHook(() => useAgentMode());
    expect(missing.result.current.activeMode).toBeNull();
    missing.unmount();

    vi.mocked(localStorage.getItem).mockImplementationOnce(() => {
      throw new Error("storage unavailable");
    });
    const failed = renderHook(() => useAgentMode());
    expect(failed.result.current.activeMode).toBeNull();
    failed.unmount();
  });

  it("logs non-fatal storage write and removal failures", () => {
    const { result } = renderHook(() => useAgentMode());
    vi.mocked(localStorage.setItem).mockImplementationOnce(() => {
      throw new Error("quota exceeded");
    });
    act(() => result.current.selectMode(AGENT_MODES[2], null, null, ""));
    expect(logger.warn).toHaveBeenCalledWith(
      "[AgentModeButton] non-fatal error:",
      "quota exceeded",
    );

    vi.mocked(localStorage.removeItem).mockImplementationOnce(() => {
      throw "remove failed";
    });
    act(() => result.current.clearMode(null, null, ""));
    expect(logger.warn).toHaveBeenLastCalledWith(
      "[AgentModeButton] non-fatal error:",
      "remove failed",
    );
  });

  it("reacts to external mode changes and persists them", () => {
    localStorage.setItem("opensin_agent_mode", "report");
    const { result, unmount } = renderHook(() => useAgentMode());

    act(() => {
      window.dispatchEvent(
        new CustomEvent(AGENT_MODE_EVENT, {
          detail: { mode: "deep-research" },
        }),
      );
    });
    expect(result.current.activeMode?.id).toBe("deep-research");

    act(() => {
      window.dispatchEvent(
        new CustomEvent(AGENT_MODE_EVENT, { detail: { mode: "missing" } }),
      );
    });
    expect(result.current.activeMode).toBeNull();
    unmount();
  });

  it("opens and closes from outside click and escape", () => {
    const { result } = renderHook(() => useAgentMode());
    const button = document.createElement("button");
    const dropdown = document.createElement("div");
    document.body.append(button, dropdown);
    act(() => {
      result.current.buttonRef.current = button;
      result.current.dropdownRef.current = dropdown;
      result.current.setShowDropdown(true);
    });
    expect(result.current.showDropdown).toBe(true);

    act(() =>
      dropdown.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })),
    );
    act(() =>
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "x" })),
    );
    expect(result.current.showDropdown).toBe(true);

    act(() =>
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })),
    );
    expect(result.current.showDropdown).toBe(false);

    act(() => result.current.setShowDropdown(true));
    act(() =>
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
    );
    expect(result.current.showDropdown).toBe(false);
    button.remove();
    dropdown.remove();
  });

  it("selects, clears and rewrites mode prefixes", () => {
    vi.useFakeTimers();
    localStorage.setItem(
      "opensin_deep_research_sources",
      JSON.stringify(["web-search"]),
    );
    const sendCommand = vi.fn();
    const focus = vi.fn();
    const textareaRef = {
      current: { focus } as unknown as HTMLTextAreaElement,
    };
    const modeEvents: Array<string | null> = [];
    const listener = (event: Event) =>
      modeEvents.push((event as CustomEvent).detail.mode);
    window.addEventListener(AGENT_MODE_EVENT, listener);

    const { result } = renderHook(() => useAgentMode());
    const disabledMode = { ...AGENT_MODES[0], id: "disabled", enabled: false };
    act(() =>
      result.current.selectMode(
        disabledMode,
        sendCommand,
        textareaRef,
        "ignored",
      ),
    );
    expect(sendCommand).not.toHaveBeenCalled();

    act(() =>
      result.current.selectMode(
        AGENT_MODES[0],
        sendCommand,
        textareaRef,
        "Research this",
      ),
    );
    expect(result.current.activeMode?.id).toBe("deep-research");
    expect(sendCommand).toHaveBeenLastCalledWith({
      text: "@agent [deep-research]\n[sources:web-search] Research this",
      writeMode: "replace",
    });
    expect(modeEvents).toContain("deep-research");

    act(() => result.current.selectMode(AGENT_MODES[2], sendCommand, null, ""));
    expect(sendCommand).toHaveBeenLastCalledWith({
      text: "@agent [report]",
      writeMode: "replace",
    });

    act(() => vi.runAllTimers());
    expect(focus).toHaveBeenCalled();

    act(() =>
      result.current.clearMode(
        sendCommand,
        textareaRef,
        "@agent [report] Draft",
      ),
    );
    expect(sendCommand).toHaveBeenLastCalledWith({
      text: "Draft",
      writeMode: "replace",
    });
    expect(result.current.activeMode).toBeNull();
    expect(modeEvents).toContain(null);

    act(() => result.current.clearMode(null, null, ""));
    window.removeEventListener(AGENT_MODE_EVENT, listener);
  });

  it("dispatches rewrite events for source changes", () => {
    const rewrites: Array<{ modeId: string; sources: string[] }> = [];
    const listener = (event: Event) =>
      rewrites.push((event as CustomEvent).detail);
    window.addEventListener("agent-mode-rewrite-prefix", listener);
    const { unmount } = renderHook(() => useAgentMode());

    act(() => {
      window.dispatchEvent(
        new CustomEvent(DEEP_RESEARCH_SOURCES_EVENT, {
          detail: { sources: ["web-search", "gmail"] },
        }),
      );
    });
    expect(rewrites).toEqual([
      { modeId: "deep-research", sources: ["web-search", "gmail"] },
    ]);

    act(() => {
      window.dispatchEvent(new CustomEvent(DEEP_RESEARCH_SOURCES_EVENT));
    });
    expect(rewrites.at(-1)?.sources).toEqual(["web-search"]);
    unmount();
    window.removeEventListener("agent-mode-rewrite-prefix", listener);
  });
});

describe("AgentModeButton", () => {
  const baseProps = () => ({
    sendCommand: vi.fn(),
    promptInput: "Prompt",
    textareaRef: createRef<HTMLTextAreaElement>(),
    activeMode: null,
    showDropdown: false,
    setShowDropdown: vi.fn(),
    buttonRef: createRef<HTMLElement>(),
    dropdownRef: createRef<HTMLDivElement>(),
    selectMode: vi.fn(),
    clearMode: vi.fn(),
  });

  it("hides when not visible and toggles with click or keyboard", async () => {
    const props = baseProps();
    const { rerender } = render(<AgentModeButton {...props} visible={false} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    rerender(<AgentModeButton {...props} visible />);
    const button = screen.getByRole("button", {
      name: "chat_window.start_agent_session",
    });
    await userEvent.click(button);
    expect(props.setShowDropdown).toHaveBeenCalledWith(true);
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyDown(button, { key: " " });
    fireEvent.keyDown(button, { key: "x" });
    expect(props.setShowDropdown).toHaveBeenCalledTimes(3);
  });

  it("renders an active mode, clears it and selects dropdown items", async () => {
    const props = baseProps();
    props.activeMode = AGENT_MODES[0];
    props.showDropdown = true;
    props.buttonRef = null;
    props.dropdownRef = null;
    render(<AgentModeButton {...props} />);

    expect(screen.getAllByText("agentMode.deepResearch")).toHaveLength(2);
    await userEvent.click(
      screen.getByRole("button", { name: "agentMode.removeMode" }),
    );
    expect(props.clearMode).toHaveBeenCalledWith(
      props.sendCommand,
      props.textareaRef,
      "Prompt",
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveStyle({ top: "0px", left: "0px" });
    const report = screen.getByRole("button", { name: "agentMode.reportGen" });
    await userEvent.click(report);
    expect(props.selectMode).toHaveBeenCalledWith(
      expect.objectContaining({ id: "report" }),
      props.sendCommand,
      props.textareaRef,
      "Prompt",
    );

    fireEvent.mouseDown(dialog);
    const backdrop = document.body.querySelector(".fixed.inset-0.z-40");
    fireEvent.mouseDown(backdrop as Element);
    expect(props.setShowDropdown).toHaveBeenCalledWith(false);
  });

  it.each([
    ["below", { top: 100, bottom: 120, left: 40 }, { top: "126px" }],
    ["above", { top: 500, bottom: 520, left: 40 }, { bottom: "306px" }],
    ["fallback", { top: 300, bottom: 500, left: 40 }, { top: "506px" }],
  ])("positions the menu %s", (_name, rect, expected) => {
    const props = baseProps();
    props.showDropdown = true;
    const node = document.createElement("button");
    node.getBoundingClientRect = () =>
      ({
        ...rect,
        width: 20,
        height: rect.bottom - rect.top,
        right: 60,
        x: 40,
        y: rect.top,
        toJSON: () => ({}),
      }) as DOMRect;
    props.buttonRef = { current: node };
    render(<AgentModeButton {...props} />);
    expect(screen.getByRole("dialog")).toHaveStyle(expected);
  });
});
