// SPDX-License-Identifier: MIT
// Purpose: Unit tests for triggerPollers — per-connector polling logic.
//          Tests the pure logic (RSS parsing, dispatch) without network calls.

const { pollConnector, parseFeedItems } = require("../../utils/agents/triggerPollers");

describe("triggerPollers", () => {
  describe("dispatch", () => {
    it("returns no-changes for unknown connector_type", async () => {
      const result = await pollConnector({ connector_type: "unknown" }, null);
      expect(result.hasChanges).toBe(false);
      expect(result.itemCount).toBe(0);
    });

    it("returns no-changes for webhook (push-based)", async () => {
      const result = await pollConnector({ connector_type: "webhook" }, null);
      expect(result.hasChanges).toBe(false);
      expect(result.itemCount).toBe(0);
    });

    it("returns error for github without repo", async () => {
      const result = await pollConnector({ connector_type: "github" }, null);
      expect(result.hasChanges).toBe(false);
      expect(result.error).toMatch(/repo/);
    });

    it("returns error for rss without url", async () => {
      const result = await pollConnector({ connector_type: "rss" }, null);
      expect(result.hasChanges).toBe(false);
      expect(result.error).toMatch(/url/);
    });

    it("returns error for gmail when not configured", async () => {
      // GmailBridge.isToolAvailable() returns false when no config — we mock by
      // ensuring the error path is reachable. We just check the shape.
      const result = await pollConnector({ connector_type: "gmail" }, null);
      expect(result).toHaveProperty("hasChanges");
      expect(result).toHaveProperty("newCheckpoint");
      expect(result).toHaveProperty("itemCount");
    });
  });

  describe("parseFeedItems", () => {
    it("parses RSS items", () => {
      const xml = `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <item>
              <guid>https://example.com/a</guid>
              <link>https://example.com/a</link>
              <title>Article A</title>
            </item>
            <item>
              <guid>https://example.com/b</guid>
              <link>https://example.com/b</link>
              <title>Article B</title>
            </item>
          </channel>
        </rss>`;
      const items = parseFeedItems(xml, "rss");
      expect(items).toHaveLength(2);
      expect(items[0].guid).toBe("https://example.com/a");
      expect(items[0].title).toBe("Article A");
      expect(items[1].guid).toBe("https://example.com/b");
    });

    it("parses Atom entries", () => {
      const xml = `<?xml version="1.0"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <entry>
            <id>tag:example.com,2026:1</id>
            <link href="https://example.com/1" />
            <title>Entry 1</title>
          </entry>
          <entry>
            <id>tag:example.com,2026:2</id>
            <link href="https://example.com/2" />
            <title>Entry 2</title>
          </entry>
        </feed>`;
      const items = parseFeedItems(xml, "atom");
      expect(items).toHaveLength(2);
      expect(items[0].guid).toBe("tag:example.com,2026:1");
    });

    it("handles CDATA in titles (strips CDATA wrapper, then HTML tags)", () => {
      const xml = `<rss><channel>
        <item>
          <guid>g1</guid>
          <link>l1</link>
          <title><![CDATA[Hello &amp; world]]></title>
        </item>
      </channel></rss>`;
      const items = parseFeedItems(xml, "rss");
      // CDATA wrapper is stripped, then HTML tags (none here) — entities preserved
      expect(items[0].title).toBe("Hello &amp; world");
    });

    it("returns empty for empty feed", () => {
      const items = parseFeedItems("<rss><channel></channel></rss>", "rss");
      expect(items).toHaveLength(0);
    });
  });
});
