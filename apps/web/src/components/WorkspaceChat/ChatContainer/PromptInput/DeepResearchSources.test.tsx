// SPDX-License-Identifier: MIT
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      options?.count === undefined ? key : `${key}:${options.count}`,
  }),
}));

import DeepResearchSources, {
  DEEP_RESEARCH_SOURCES_EVENT,
  getDeepResearchSourceIds,
} from "./DeepResearchSources";

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1024,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 800,
  });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 40,
    y: 100,
    top: 100,
    bottom: 128,
    left: 40,
    right: 180,
    width: 140,
    height: 28,
    toJSON: () => ({}),
  } as DOMRect);
});

describe("getDeepResearchSourceIds", () => {
  it("normalizes defaults, aliases and unknown values", () => {
    const getItem = vi.mocked(window.localStorage.getItem);

    getItem.mockReturnValueOnce(null);
    expect(getDeepResearchSourceIds()).toEqual(["web-search"]);

    getItem.mockReturnValueOnce(JSON.stringify(["web", "gmail", "bad"]));
    expect(getDeepResearchSourceIds()).toEqual(["web-search", "gmail"]);

    getItem.mockReturnValueOnce(JSON.stringify([]));
    expect(getDeepResearchSourceIds()).toEqual(["web-search"]);

    getItem.mockReturnValueOnce(JSON.stringify({ nope: true }));
    expect(getDeepResearchSourceIds()).toEqual(["web-search"]);

    getItem.mockReturnValueOnce("not-json");
    expect(getDeepResearchSourceIds()).toEqual(["web-search"]);
  });
});

describe("DeepResearchSources", () => {
  it("does not render when hidden and shows a one-source summary by default", () => {
    const { rerender } = render(<DeepResearchSources visible={false} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    rerender(<DeepResearchSources />);
    expect(
      screen.getByRole("button", { name: "deepResearchSources.title" }),
    ).toHaveTextContent("deepResearchSources.summaryOne");
  });

  it("migrates stored aliases and renders a plural summary", () => {
    vi.mocked(window.localStorage.getItem).mockReturnValue(
      JSON.stringify(["web", "gmail"]),
    );
    render(<DeepResearchSources />);
    expect(
      screen.getByRole("button", { name: "deepResearchSources.title" }),
    ).toHaveTextContent("deepResearchSources.summaryMany:2");
  });

  it("opens below, exposes ready and disabled connectors, and keeps one ready source", async () => {
    const events: string[][] = [];
    const listener = (event: Event) =>
      events.push((event as CustomEvent<{ sources: string[] }>).detail.sources);
    window.addEventListener(DEEP_RESEARCH_SOURCES_EVENT, listener);
    render(<DeepResearchSources />);

    await userEvent.click(
      screen.getByRole("button", { name: "deepResearchSources.title" }),
    );
    const menu = await screen.findByRole("menu");
    expect(menu).toHaveStyle({ top: "134px", left: "40px" });

    const choices = screen.getAllByRole("menuitemcheckbox");
    expect(choices).toHaveLength(8);
    const web = screen.getByRole("menuitemcheckbox", {
      name: "deepResearchSources.connectors.webSearch",
    });
    expect(web).toHaveAttribute("aria-checked", "true");
    expect(web).not.toBeDisabled();
    expect(
      screen.getByRole("menuitemcheckbox", {
        name: /deepResearchSources\.connectors\.gmail/,
      }),
    ).toBeDisabled();

    await userEvent.click(web);
    expect(web).toHaveAttribute("aria-checked", "true");
    expect(events).toHaveLength(0);
    window.removeEventListener(DEEP_RESEARCH_SOURCES_EVENT, listener);
  });

  it("opens upward when space below is constrained and repositions on resize", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 900,
      y: 700,
      top: 700,
      bottom: 728,
      left: 900,
      right: 1020,
      width: 120,
      height: 28,
      toJSON: () => ({}),
    } as DOMRect);
    render(<DeepResearchSources />);

    await userEvent.click(
      screen.getByRole("button", { name: "deepResearchSources.title" }),
    );
    const menu = await screen.findByRole("menu");
    expect(menu.style.bottom).toBe("106px");
    expect(menu.style.left).toBe("732px");

    act(() => window.dispatchEvent(new Event("resize")));
    act(() => window.dispatchEvent(new Event("scroll")));
    expect(menu.style.maxHeight).toBe("420px");
  });

  it("closes on escape, outside click, and toggles from the trigger", async () => {
    render(<DeepResearchSources />);
    const trigger = screen.getByRole("button", {
      name: "deepResearchSources.title",
    });
    await userEvent.click(trigger);
    expect(await screen.findByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await userEvent.click(trigger);
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await userEvent.click(trigger);
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    await userEvent.click(trigger);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
