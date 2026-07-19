// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";
import {
  DOC_ENTRIES,
  getDocBySlug,
  getDocContent,
  resolveDocLink,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  entryMatchesAudience,
  getGroupedDocs,
  getOrderedDocs,
  getAdjacentDocs,
  docsHref,
  parseDocsAudience,
} from "./docsManifest";
import { CATEGORY_ICONS } from "./DocsLanding";

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

  it("loads incident-response content", () => {
    expect(getDocContent("incident-response.md")).toBeTruthy();
  });

  it("tags every entry with an audience", () => {
    for (const entry of DOC_ENTRIES) {
      expect(["user", "developer", "both"]).toContain(entry.audience);
    }
  });

  it("filters grouped docs by audience", () => {
    const userSlugs = getOrderedDocs("user").map((e) => e.slug);
    const devSlugs = getOrderedDocs("developer").map((e) => e.slug);

    expect(userSlugs).toContain("user-guide");
    expect(userSlugs).not.toContain("api");
    expect(userSlugs).toContain("security"); // both
    expect(devSlugs).toContain("api");
    expect(devSlugs).not.toContain("user-guide");
    expect(devSlugs).toContain("incident-response");
  });

  it("matches audience helpers", () => {
    const guide = getDocBySlug("user-guide")!;
    const api = getDocBySlug("api")!;
    const security = getDocBySlug("security")!;
    expect(entryMatchesAudience(guide, "user")).toBe(true);
    expect(entryMatchesAudience(guide, "developer")).toBe(false);
    expect(entryMatchesAudience(api, "developer")).toBe(true);
    expect(entryMatchesAudience(security, "user")).toBe(true);
    expect(entryMatchesAudience(security, "developer")).toBe(true);
  });

  it("keeps adjacent docs within audience", () => {
    const userOrdered = getOrderedDocs("user");
    expect(userOrdered.length).toBeGreaterThan(0);
    const first = userOrdered[0];
    const { next } = getAdjacentDocs(first.slug, "user");
    if (next) {
      expect(entryMatchesAudience(next, "user")).toBe(true);
    }
  });

  it("builds audience-aware hrefs", () => {
    expect(docsHref(null, "user")).toBe("/docs?audience=user");
    expect(docsHref("api", "developer")).toBe("/docs/api?audience=developer");
  });

  it("parses audience query aliases", () => {
    expect(parseDocsAudience("user")).toBe("user");
    expect(parseDocsAudience("dev")).toBe("developer");
    expect(parseDocsAudience("ops")).toBe("developer");
    expect(parseDocsAudience("nope")).toBeNull();
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

  it("resolves lowercase markdown links (case-insensitive aliases)", () => {
    expect(resolveDocLink("security.md")).toEqual({
      url: "/docs/security",
      external: false,
    });
    expect(resolveDocLink("operations.md")).toEqual({
      url: "/docs/operations",
      external: false,
    });
    expect(resolveDocLink("api.md")).toEqual({
      url: "/docs/api",
      external: false,
    });
    expect(resolveDocLink("user-guide.md")).toEqual({
      url: "/docs/user-guide",
      external: false,
    });
  });

  it("has a rendered icon for every doc category", () => {
    for (const category of CATEGORY_ORDER) {
      expect(CATEGORY_ICONS[category]).toBeDefined();
    }
  });

  it("does not leave empty groups when filtering", () => {
    const userGroups = getGroupedDocs("user");
    expect(userGroups.every((g) => g.entries.length > 0)).toBe(true);
    // User mode should not surface pure deployment categories only full of dev pages
    const userCategories = userGroups.map((g) => g.category);
    expect(userCategories).not.toContain("deployment");
    expect(userCategories).not.toContain("api");
  });
});
