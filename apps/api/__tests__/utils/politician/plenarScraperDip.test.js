// SPDX-License-Identifier: MIT
/**
 * Tests for the DIP API fallback in PlenarScraper (Issue #52).
 * global.fetch is mocked so no real network access occurs.
 */

"use strict";

const { PlenarScraper } = require("../../../utils/politician/plenarScraper");

function mockJsonResponse(body, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

describe("PlenarScraper.fetchProtocolViaDip", () => {
  let scraper;
  let originalFetch;

  beforeEach(() => {
    scraper = new PlenarScraper();
    scraper.rateLimitDelayMs = 0; // avoid real delays in tests
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("parses speaker blocks from DIP document text", async () => {
    const text = [
      "Dr. Alice Weidel (AfD): Sehr geehrte Damen und Herren, dies ist eine ausführliche Rede über die Migrationspolitik der Bundesregierung und ihre Folgen.",
      "Max Mustermann (SPD): Vielen Dank, Frau Präsidentin. Ich möchte an dieser Stelle auf die wirtschaftlichen Auswirkungen eingehen und einige Punkte klarstellen.",
    ].join("\n\n");

    global.fetch = jest.fn().mockResolvedValue(
      mockJsonResponse({
        documents: [
          {
            id: "5-123",
            datum: "2026-05-01",
            text,
            fundstelle: { pdf_url: "https://dip.example/doc.pdf" },
          },
        ],
      }),
    );

    const speeches = await scraper.fetchProtocolViaDip(20, 123);
    expect(speeches.length).toBe(2);

    expect(speeches[0].speakerName).toBe("Dr. Alice Weidel");
    expect(speeches[0].speakerParty).toBe("AfD");
    expect(speeches[0].session).toBe(20);
    expect(speeches[0].sitting).toBe(123);
    expect(speeches[0].documentUrl).toBe("https://dip.example/doc.pdf");
    expect(speeches[0].date).toBe("2026-05-01");

    expect(speeches[1].speakerName).toBe("Max Mustermann");
    expect(speeches[1].speakerParty).toBe("SPD");
  });

  test("returns empty array when DIP returns no documents", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(mockJsonResponse({ documents: [] }));
    const speeches = await scraper.fetchProtocolViaDip(20, 999);
    expect(speeches).toEqual([]);
  });

  test("throws on non-ok DIP response so the caller can fall through", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(mockJsonResponse({}, false, 503));
    await expect(scraper.fetchProtocolViaDip(20, 1)).rejects.toThrow(
      /DIP API HTTP 503/,
    );
  });

  test("skips short interjections below the length threshold", async () => {
    const text = [
      "Heinz Klein (CDU): Zwischenruf!",
      "Dr. Alice Weidel (AfD): Dies ist ein vollständiger Redebeitrag, der deutlich länger ist als der Schwellenwert von vierzig Zeichen und daher erhalten bleibt.",
    ].join("\n\n");

    global.fetch = jest.fn().mockResolvedValue(
      mockJsonResponse({
        documents: [{ id: "x", datum: "2026-05-02", text, fundstelle: {} }],
      }),
    );

    const speeches = await scraper.fetchProtocolViaDip(20, 5);
    expect(speeches.length).toBe(1);
    expect(speeches[0].speakerName).toBe("Dr. Alice Weidel");
  });
});
