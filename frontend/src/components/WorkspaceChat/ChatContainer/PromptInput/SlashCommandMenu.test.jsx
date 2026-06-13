// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSlashCommand } from "./SlashCommandMenu";

describe("useSlashCommand", () => {
  it("toggles tools when / is pressed with empty input", () => {
    const setShowTools = vi.fn((fn) => fn(false));
    const autoOpenedToolsRef = { current: false };
    const { result } = renderHook(() =>
      useSlashCommand({
        promptInput: "",
        setShowTools,
        autoOpenedToolsRef,
      }),
    );

    const event = { key: "/", ctrlKey: false, metaKey: false };
    expect(result.current.handleSlashCommand(event)).toBe(true);
    expect(setShowTools).toHaveBeenCalled();
    expect(autoOpenedToolsRef.current).toBe(true);
  });

  it("does nothing when input is not empty", () => {
    const setShowTools = vi.fn();
    const autoOpenedToolsRef = { current: false };
    const { result } = renderHook(() =>
      useSlashCommand({
        promptInput: "hello",
        setShowTools,
        autoOpenedToolsRef,
      }),
    );

    const event = { key: "/", ctrlKey: false, metaKey: false };
    expect(result.current.handleSlashCommand(event)).toBe(false);
    expect(setShowTools).not.toHaveBeenCalled();
  });

  it("does nothing when a modifier key is held", () => {
    const setShowTools = vi.fn();
    const autoOpenedToolsRef = { current: false };
    const { result } = renderHook(() =>
      useSlashCommand({
        promptInput: "",
        setShowTools,
        autoOpenedToolsRef,
      }),
    );

    expect(result.current.handleSlashCommand({ key: "/", ctrlKey: true })).toBe(false);
    expect(result.current.handleSlashCommand({ key: "/", metaKey: true })).toBe(false);
  });
});
