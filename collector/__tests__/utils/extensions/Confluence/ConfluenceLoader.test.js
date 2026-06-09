// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

function resolveConfluenceBaseUrl(url, cloud) {
  try {
    const u = new URL(url);
    if (cloud) return u.origin;
    const p = u.pathname.replace(/\/+$/, "");
    return p ? u.origin + p : u.origin;
  } catch { return url; }
}

describe("resolveConfluenceBaseUrl", () => {
  test("cloud: strips path and returns origin only", () => {
    expect(resolveConfluenceBaseUrl("https://example.atlassian.net/wiki/spaces/SP", true))
      .toBe("https://example.atlassian.net");
  });

  test("self-hosted: preserves context path, strips trailing slash", () => {
    expect(resolveConfluenceBaseUrl("https://my.domain.com/confluence/", false))
      .toBe("https://my.domain.com/confluence");
  });

  test("self-hosted: returns origin when no context path", () => {
    expect(resolveConfluenceBaseUrl("https://my.domain.com/", false))
      .toBe("https://my.domain.com");
  });

  test("cloud: handles root URL", () => {
    expect(resolveConfluenceBaseUrl("https://example.atlassian.net/", true))
      .toBe("https://example.atlassian.net");
  });

  test("self-hosted: handles multi-segment path", () => {
    expect(resolveConfluenceBaseUrl("https://corp.com/a/b/confluence/", false))
      .toBe("https://corp.com/a/b/confluence");
  });
});

describe("Confluence URL patterns", () => {
  test("cloud API URL includes /wiki prefix", () => {
    const base = resolveConfluenceBaseUrl("https://example.atlassian.net/wiki", true);
    expect(base + "/wiki/rest/api/content").toContain("/wiki/rest/api");
  });

  test("self-hosted API URL uses context path", () => {
    const base = resolveConfluenceBaseUrl("https://my.domain.com/confluence/", false);
    expect(base + "/rest/api/content").toContain("/confluence/rest/api");
  });
});
