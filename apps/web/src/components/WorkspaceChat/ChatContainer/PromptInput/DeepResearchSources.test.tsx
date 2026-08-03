// SPDX-License-Identifier: MIT
import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      options?.count ? `${key}:${options.count}` : key,
  }),
}));

import DeepResearchSources, {
  DEEP_RESEARCH_SOURCES_EVENT,
  getDeepResearchSourceIds,
} from "./DeepResearchSources";

const storage = window.localStorage as unknown as {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
};

describe("DeepResearchSources storage", () => {
  beforeEach(() => {
    storage.getItem.mockReturnValue(null);
  });

  it("defaults to web search for absent, empty, malformed, or unknown data", () => {
    expect(getDeepResearchSourceIds()).toEqual(["web-search"]);

    storage.getItem.mockReturnValue("[]");
    expect(getDeepResearchSourceIds()).toEqual(["web-search"]);

    storage.getItem.mockReturnValue("not-json");
    expect(getDeepResearchSourceIds()).toEqual(["web-search"]);

    storage.getItem.mockReturnValue(JSON.stringify({ id: "web" }));
    expect(getDeepResearchSourceIds()).toEqual(["web-search"]);

    storage.getItem.mockReturnValue(JSON.stringify(["unknown"]));
    expect(getDeepResearchSourceIds()).toEqual(["web-search"]);
  });

  it("migrates the legacy web alias and preserves known connector ids", () => {
    storage.getItem.mockReturnValue(
      JSON.stringify(["web", "gmail", "google-drive", "unknown"]),
    );
    expect(getDeepResearchSourceIds()).toEqual([
      "web-search",
      "gmail",
      "google-drive",
    ]);
  });

  it("falls back when storage access throws", () => {
    storage.getItem.mockImplementationOnce(() => {
      throw new Error("blocked");
    });
    expect(getDeepResearchSourceIds()).toEqual(["web-search"]);
  });
});

describe("DeepResearchSources component", () => {
  beforeEach(() => {
    storage.getItem.mockReturnValue(null);
    Object.defineProperty(window, "innerWidth", {
      value: 1024,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 768,
      configurable: true,
    });
  });

  it("renders nothing when hidden", () => {
    const { container } = render(<DeepResearchSources visible={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("migrates storage and shows a one-source summary", () => {
    storage.getItem.mockReturnValue(JSON.stringify(["web"]));
    render(<DeepResearchSources />);

    expect(
      screen.getByRole("button", { name: "deepResearchSources.title" }),
    ).toHaveTextContent("deepResearchSources.summaryOne");
    expect(storage.setItem).toHaveBeenCalledWith(
      "opensin_deep_research_sources",
      JSON.stringify(["web-search"]),
    );
  });

  it("shows a multi-source summary for stored known connectors", () => {
    storage.getItem.mockReturnValue(JSON.stringify(["gmail", "google-drive"]));
    render(<DeepResearchSources />);
    expect(
      screen.getByRole("button", { name: "deepResearchSources.title" }),
    ).toHaveTextContent("deepResearchSources.summaryMany:2");
  });

  it("opens the menu, exposes ready and disabled connectors, and keeps one ready source", async () => {
    render(<DeepResearchSources />);
    fireEvent.click(
      screen.getByRole("button", { name: "deepResearchSources.title" }),
    );

    const menu = await screen.findByRole("menu");
    expect(menu).toBeInTheDocument();
    const web = screen.getByRole("menuitemcheckbox", {
      name: "deepResearchSources.connectors.webSearch",
    });
    const gmail = screen.getByRole("menuitemcheckbox", {
      name: /deepResearchSources\.connectors\.gmail/,
    });
    expect(web).toHaveAttribute("aria-checked", "true");
    expect(gmail).toBeDisabled();

    fireEvent.click(web);
    expect(web).toHaveAttribute("aria-checked", "true");
  });

  it("adds the ready connector, persists, and emits the selection event", async () => {
    storage.getItem.mockReturnValue(JSON.stringify(["gmail"]));
    const listener = vi.fn();
    window.addEventListener(DEEP_RESEARCH_SOURCES_EVENT, listener);
    render(<DeepResearchSources />);
    fireEvent.click(
      screen.getByRole("button", { name: "deepResearchSources.title" }),
    );

    const web = await screen.findByRole("menuitemcheckbox", {
      name: "deepResearchSources.connectors.webSearch",
    });
    expect(web).toHaveAttribute("aria-checked", "false");
    fireEvent.click(web);

    await waitFor(() => expect(web).toHaveAttribute("aria-checked", "true"));
    expect(storage.setItem).toHaveBeenLastCalledWith(
      "opensin_deep_research_sources",
      JSON.stringify(["gmail", "web-search"]),
    );
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { sources: ["gmail", "web-search"] },
      }),
    );
    window.removeEventListener(DEEP_RESEARCH_SOURCES_EVENT, listener);
  });

  it("ignores persistence failures", () => {
    storage.setItem.mockImplementationOnce(() => {
      throw new Error("quota");
    });
    expect(() => render(<DeepResearchSources />)).not.toThrow();
  });

  it("closes on outside click and Escape but stays open for inside clicks", async () => {
    render(<DeepResearchSources />);
    const trigger = screen.getByRole("button", {
      name: "deepResearchSources.title",
    });
    fireEvent.click(trigger);
    const menu = await screen.findByRole("menu");

    fireEvent.mouseDown(menu);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
    );

    fireEvent.click(trigger);
    await screen.findByRole("menu");
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
    );
  });

  it.each([
    [
      { top: 100, bottom: 120, left: 20 },
      900,
      1024,
      { top: "126px", left: "20px", maxHeight: "420px" },
    ],
    [
      { top: 700, bottom: 720, left: 950 },
      800,
      1000,
      { bottom: "106px", left: "708px", maxHeight: "420px" },
    ],
    [
      { top: 250, bottom: 270, left: -50 },
      500,
      300,
      { bottom: "256px", left: "12px", maxHeight: "232px" },
    ],
  ])(
    "positions and clamps the menu within the viewport",
    async (rect, height, width, expected) => {
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
        ...rect,
        width: 30,
        height: 20,
        right: rect.left + 30,
        x: rect.left,
        y: rect.top,
        toJSON: () => ({}),
      } as DOMRect);
      Object.defineProperty(window, "innerHeight", {
        value: height,
        configurable: true,
      });
      Object.defineProperty(window, "innerWidth", {
        value: width,
        configurable: true,
      });

      render(<DeepResearchSources />);
      fireEvent.click(
        screen.getByRole("button", { name: "deepResearchSources.title" }),
      );
      const menu = await screen.findByRole("menu");
      await waitFor(() => expect(menu).toHaveStyle(expected));

      act(() => {
        window.dispatchEvent(new Event("resize"));
        window.dispatchEvent(new Event("scroll"));
      });
      expect(menu).toBeInTheDocument();
    },
  );
});
