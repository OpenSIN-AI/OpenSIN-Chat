// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";
import {
  DOC_ENTRIES,
  getDocBySlug,
  getDocContent,
  resolveDocLink,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
} from "./docsManifest";

describe("docsManifest", () => {
  it("includes security and operations entries", () => {
    const slugs = DOC_ENTRIES.map((entry) => entry.slug);
    expect(slugs).toContain("security");
    expect(slugs).toContain("operations");
  });

  it("categorizes security and operations under operations", () => {
    const security = DOC_ENTRIES.find((entry) => entry.slug === "security");
    const operations = DOC_ENTRIES.find((entry) => entry.slug === "operations");
    expect(security?.category).toBe("operations");
    expect(operations?.category).toBe("operations");
  });

  it("has a localized operations category label", () => {
    expect(CATEGORY_LABELS.operations).toBe("Sicherheit & Betrieb");
    expect(CATEGORY_ORDER).toContain("operations");
  });

  it("resolves security and operations slugs", () => {
    expect(getDocBySlug("security")?.title).toBe("Sicherheits-Handbuch");
    expect(getDocBySlug("operations")?.title).toBe("Operations-Runbook");
  });

  it("loads the raw markdown content for security and operations", () => {
    expect(getDocContent("security.md")).toContain("Sicherheits-Handbuch");
    expect(getDocContent("operations.md")).toContain("Operations-Runbook");
  });

  it("resolves relative markdown links to security and operations", () => {
    expect(resolveDocLink("SECURITY.md")).toEqual({
      url: "/docs/security",
      external: false,
    });
    expect(resolveDocLink("OPERATIONS.md")).toEqual({
      url: "/docs/operations",
      external: false,
    });
  });
});
