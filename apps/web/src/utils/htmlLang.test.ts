// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock i18next before importing the module under test
vi.mock("@/i18n", () => ({
  default: {
    language: "en",
    t: vi.fn((key) => key),
    on: vi.fn(),
    off: vi.fn(),
  },
}));

vi.mock("dayjs", () => ({
  default: {
    locale: vi.fn(),
  },
}));

vi.mock("dayjs/locale/de", () => ({}));

import { syncHtmlLang, syncDocumentTitle } from "./htmlLang";
import i18next from "@/i18n";

describe("htmlLang utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.setAttribute("lang", "");
    document.documentElement.setAttribute("dir", "");
    document.title = "";
  });

  describe("syncHtmlLang", () => {
    it("sets lang attribute to the provided language", () => {
      syncHtmlLang("de");
      expect(document.documentElement.getAttribute("lang")).toBe("de");
    });

    it("sets dir to ltr for non-RTL languages", () => {
      syncHtmlLang("en");
      expect(document.documentElement.getAttribute("dir")).toBe("ltr");
    });

    it("sets dir to rtl for RTL languages like Arabic", () => {
      syncHtmlLang("ar");
      expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    });

    it("sets dir to rtl for Hebrew", () => {
      syncHtmlLang("he");
      expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    });

    it("normalizes locale codes by taking the first segment", () => {
      syncHtmlLang("en-US");
      expect(document.documentElement.getAttribute("lang")).toBe("en");
    });

    it("falls back to i18next.language when no argument provided", () => {
      syncHtmlLang(undefined);
      expect(document.documentElement.getAttribute("lang")).toBe("en");
    });

    it("falls back to 'en' when no language is available", () => {
      vi.mocked(i18next.language, true);
      const originalLang = i18next.language;
      Object.defineProperty(i18next, "language", {
        value: undefined,
        configurable: true,
      });
      syncHtmlLang(undefined);
      expect(document.documentElement.getAttribute("lang")).toBe("en");
      Object.defineProperty(i18next, "language", {
        value: originalLang,
        configurable: true,
      });
    });
  });

  describe("syncDocumentTitle", () => {
    it("sets document title from translation", () => {
      i18next.t = vi.fn((key) => {
        if (key === "page.title") return "OpenSIN Chat";
        if (key === "page.description") return "A chat app";
        return key;
      }) as any;
      syncDocumentTitle();
      expect(document.title).toBe("OpenSIN Chat");
    });

    it("falls back to default title when translation is empty", () => {
      i18next.t = vi.fn((key) => {
        if (key === "page.title") return "";
        return "";
      }) as any;
      syncDocumentTitle();
      expect(document.title).toBe("OpenSIN Chat");
    });

    it("falls back to default title when translation returns the key", () => {
      i18next.t = vi.fn((key) => key) as any;
      syncDocumentTitle();
      expect(document.title).toBe("OpenSIN Chat");
    });

    it("sets meta description when provided", () => {
      i18next.t = vi.fn((key) => {
        if (key === "page.title") return "Title";
        if (key === "page.description") return "My description";
        return key;
      }) as any;
      syncDocumentTitle();
      const meta = document.querySelector('meta[name="description"]');
      expect(meta).not.toBeNull();
      expect(meta?.getAttribute("content")).toBe("My description");
    });
  });
});
