// SPDX-License-Identifier: MIT
const { BundestagApi } = require("../../../utils/politician/bundestagApi");

describe("BundestagApi", () => {
  let api;

  beforeEach(() => {
    api = new BundestagApi();
  });

  describe("configuration (21. WP)", () => {
    it("defaults the Wahlperiode to 21", () => {
      expect(api.wahlperiode).toBe(21);
    });

    it("requests the term-specific formular endpoint for WP 21", async () => {
      const spy = jest
        .spyOn(global, "fetch")
        .mockResolvedValue({ ok: true, json: async () => [] });
      await api.fetchAllMembers();
      expect(spy.mock.calls[0][0]).toContain("Abgeordnete21_WP.formular");
      // Regression: must target the 21. WP endpoint, never the dead 20. WP one.
      expect(spy.mock.calls[0][0]).not.toContain("Abgeordnete20");
      spy.mockRestore();
    });
  });

  describe("DIP API fallback", () => {
    it("falls back to the DIP API when formular is empty and a key is set", async () => {
      const dipApi = new BundestagApi({ dipApiKey: "test-key" });
      jest.spyOn(global, "fetch").mockImplementation(async (url) => {
        if (url.includes(".formular"))
          return { ok: true, json: async () => [] };
        // DIP person endpoint
        return {
          ok: true,
          json: async () => ({
            documents: [
              {
                id: "11004183",
                vorname: "Alice",
                nachname: "Weidel",
                person_roles: [
                  { fraktion: "AfD", bundesland: "Baden-Württemberg" },
                ],
              },
            ],
            cursor: null,
          }),
        };
      });

      const members = await dipApi.fetchAllMembers();
      expect(members).toHaveLength(1);
      expect(members[0].lastName).toBe("Weidel");
      expect(members[0].externalId).toBe("11004183");
      expect(members[0].source).toBe("bundestag");
      expect(members[0].party).toBe("AfD");
      expect(members[0].faction).toBe("AfD");
      expect(members[0].state).toBe("Baden-Württemberg");
      global.fetch.mockRestore();
    });

    it("returns an empty array when no Bundestag source yields data", async () => {
      jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => [] });
      const members = await api.fetchAllMembers(); // no DIP key configured
      expect(members).toEqual([]);
      global.fetch.mockRestore();
    });
  });

  describe("#normalizeMember (via fetchAllMembers)", () => {
    function normalize(raw) {
      // The normalizer is private; exercise it through a stubbed fetch.
      return raw;
    }

    it("normalizes a raw API record into the internal shape", async () => {
      const raw = {
        id: "12345",
        akadGrad: "Dr.",
        vorname: "Max",
        nachname: "Mustermann",
        parteiKurz: "AfD",
        fraktion: "AfD",
        anrede: "Herr",
        geburtsdatum: "1970-01-01",
        geburtsort: "Berlin",
        beruf: "Jurist",
        wahlkreis: "Berlin-Mitte",
        bundesland: "Berlin",
        homepage: "https://example.org",
        twitter: "@max",
      };

      jest
        .spyOn(global, "fetch")
        .mockResolvedValue({
          ok: true,
          json: async () => [raw],
        });

      const members = await api.fetchAllMembers();
      expect(members).toHaveLength(1);
      const m = members[0];
      expect(m.fullName).toBe("Max Mustermann");
      expect(m.firstName).toBe("Max");
      expect(m.lastName).toBe("Mustermann");
      expect(m.party).toBe("AfD");
      expect(m.faction).toBe("AfD");
      expect(m.gender).toBe("male");
      expect(m.source).toBe("bundestag");
      expect(m.externalId).toBe("12345");
      expect(m.socialMedia.twitter).toBe("@max");
      expect(typeof m.rawData).toBe("string");

      global.fetch.mockRestore();
    });

    it("parses gender from salutation correctly", async () => {
      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => [
          { id: "1", vorname: "A", nachname: "B", anrede: "Frau" },
          { id: "2", vorname: "C", nachname: "D", anrede: "Herr" },
          { id: "3", vorname: "E", nachname: "F", anrede: "Divers" },
        ],
      });

      const members = await api.fetchAllMembers();
      expect(members[0].gender).toBe("female");
      expect(members[1].gender).toBe("male");
      expect(members[2].gender).toBeNull();

      global.fetch.mockRestore();
    });

    it("returns an empty array when the API response is not an array", async () => {
      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ error: "nope" }),
      });

      const members = await api.fetchAllMembers();
      expect(members).toEqual([]);

      global.fetch.mockRestore();
    });

    it("returns an empty array and does not throw when fetch rejects", async () => {
      jest.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));
      const members = await api.fetchAllMembers();
      expect(members).toEqual([]);
      global.fetch.mockRestore();
    });
  });

  describe("searchMembers", () => {
    beforeEach(() => {
      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => [
          { id: "1", vorname: "Alice", nachname: "Müller", parteiKurz: "AfD" },
          { id: "2", vorname: "Bob", nachname: "Schmidt", parteiKurz: "AfD" },
        ],
      });
    });

    afterEach(() => global.fetch.mockRestore());

    it("returns all members when query is empty", async () => {
      const res = await api.searchMembers("");
      expect(res).toHaveLength(2);
    });

    it("filters by last name (case-insensitive)", async () => {
      const res = await api.searchMembers("müller");
      expect(res).toHaveLength(1);
      expect(res[0].lastName).toBe("Müller");
    });

    it("filters by full name substring", async () => {
      const res = await api.searchMembers("bob sch");
      expect(res).toHaveLength(1);
      expect(res[0].firstName).toBe("Bob");
    });

    it("returns an empty array for a non-matching query", async () => {
      const res = await api.searchMembers("nonexistent");
      expect(res).toEqual([]);
    });
  });

  describe("getMember", () => {
    it("returns the matching member by externalId", async () => {
      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => [
          { id: "1", vorname: "Alice", nachname: "Müller" },
          { id: "2", vorname: "Bob", nachname: "Schmidt" },
        ],
      });
      const m = await api.getMember("2");
      expect(m).not.toBeNull();
      expect(m.firstName).toBe("Bob");
      global.fetch.mockRestore();
    });

    it("returns null when no member matches", async () => {
      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => [{ id: "1", vorname: "Alice", nachname: "Müller" }],
      });
      const m = await api.getMember("999");
      expect(m).toBeNull();
      global.fetch.mockRestore();
    });
  });

  describe("caching", () => {
    it("caches results and only fetches once across calls", async () => {
      const spy = jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => [{ id: "1", vorname: "A", nachname: "B" }],
      });

      await api.fetchAllMembers();
      await api.fetchAllMembers();
      expect(spy).toHaveBeenCalledTimes(1);

      api.clearCache();
      await api.fetchAllMembers();
      expect(spy).toHaveBeenCalledTimes(2);

      spy.mockRestore();
    });
  });
});
