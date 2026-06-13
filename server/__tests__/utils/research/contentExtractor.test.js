// SPDX-License-Identifier: MIT
const { ContentExtractor } = require("../../../utils/research/contentExtractor");

function mockFetchResponse({ ok = true, contentType = "text/html", body = "" }) {
  const encoder = new TextEncoder();
  const data = encoder.encode(body);
  let chunkIndex = 0;
  return {
    ok,
    headers: {
      get: (name) => {
        if (name.toLowerCase() === "content-type") return contentType;
        return null;
      },
    },
    body: {
      getReader: () => ({
        read: async () => {
          if (chunkIndex === 0) {
            chunkIndex++;
            return { done: false, value: data };
          }
          return { done: true };
        },
        cancel: jest.fn(),
        releaseLock: jest.fn(),
      }),
    },
  };
}

function mockFetchOnce({ ok = true, contentType = "text/html", body = "" }) {
  return jest.spyOn(global, "fetch").mockResolvedValue(mockFetchResponse({ ok, contentType, body }));
}

describe("ContentExtractor.extract", () => {
  afterEach(() => {
    if (global.fetch.mockRestore) global.fetch.mockRestore();
  });

  it("strips scripts, styles, nav, footer, header and tags from HTML", async () => {
    const html = `
      <html><head><style>.x{color:red}</style></head>
      <body>
        <header>SITE HEADER</header>
        <nav>NAVIGATION</nav>
        <script>console.log("tracking")</script>
        <h1>Überschrift</h1>
        <p>Erster Absatz mit &amp; Sonderzeichen.</p>
        <footer>SITE FOOTER</footer>
      </body></html>`;
    mockFetchOnce({ contentType: "text/html", body: html });

    const text = await ContentExtractor.extract("https://example.org");
    expect(text).toContain("Überschrift");
    expect(text).toContain("Erster Absatz mit & Sonderzeichen.");
    expect(text).not.toContain("tracking");
    expect(text).not.toContain("SITE HEADER");
    expect(text).not.toContain("NAVIGATION");
    expect(text).not.toContain("SITE FOOTER");
    expect(text).not.toMatch(/<[^>]+>/);
  });

  it("decodes common HTML entities", async () => {
    const html = "<p>1 &lt; 2 &gt; 0 &quot;q&quot; it&#39;s &nbsp;done</p>";
    mockFetchOnce({ contentType: "text/html", body: html });
    const text = await ContentExtractor.extract("https://example.org");
    expect(text).toContain("1 < 2 > 0");
    expect(text).toContain('"q"');
    expect(text).toContain("it's");
  });

  it("pretty-prints and truncates JSON responses", async () => {
    const obj = { a: 1, b: "zwei" };
    mockFetchOnce({ contentType: "application/json", body: JSON.stringify(obj) });
    const text = await ContentExtractor.extract("https://api.example.org");
    expect(text).toContain('"a": 1');
    expect(text).toContain('"b": "zwei"');
  });

  it("returns plain text directly", async () => {
    mockFetchOnce({ contentType: "text/plain", body: "Nur Text" });
    const text = await ContentExtractor.extract("https://example.org/file.txt");
    expect(text).toBe("Nur Text");
  });

  it("caps output at 10000 characters", async () => {
    const big = "<p>" + "a".repeat(20000) + "</p>";
    mockFetchOnce({ contentType: "text/html", body: big });
    const text = await ContentExtractor.extract("https://example.org");
    expect(text.length).toBeLessThanOrEqual(10000);
  });

  it("returns null for an unsupported content type", async () => {
    mockFetchOnce({ contentType: "image/png", body: "" });
    const text = await ContentExtractor.extract("https://example.org/image.png");
    expect(text).toBeNull();
  });

  it("returns null on a non-ok response", async () => {
    mockFetchOnce({ ok: false, contentType: "text/html", body: "" });
    const text = await ContentExtractor.extract("https://example.org");
    expect(text).toBeNull();
  });

  it("returns null and does not throw when fetch rejects", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("timeout"));
    const text = await ContentExtractor.extract("https://example.org");
    expect(text).toBeNull();
  });
});
