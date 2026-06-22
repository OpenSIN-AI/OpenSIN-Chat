// SPDX-License-Identifier: MIT
const { AbgeordnetenwatchApi } = require("../../../utils/politician/abgeordnetenwatchApi");

/**
 * Build a candidacy_mandate record as returned by
 * /candidacies-mandates?parliament_period=132 (21. WP).
 */
function mandate({ polId, label, mdbId = null, fraction = "AfD", start = "2021-10-26" }) {
  return {
    id: 1000 + polId,
    entity_type: "candidacy_mandate",
    type: "mandate",
    id_external_administration: mdbId,
    politician: {
      id: polId,
      label,
      api_url: `https://www.abgeordnetenwatch.de/api/v2/politicians/${polId}`,
    },
    start_date: start,
    end_date: null,
    electoral_data: { constituency: { label: "Bodenseekreis" } },
    fraction_membership: [
      { fraction: { label: `${fraction} (Bundestag 2021 - 2025)` }, valid_from: start },
    ],
  };
}

/** Wrap data rows in the AW range-pagination envelope (meta.result). */
function page(data, total) {
  return {
    meta: { result: { count: data.length, total, range_start: 0, range_end: 100 } },
    data,
  };
}

describe("AbgeordnetenwatchApi (21. WP / parliament_period=132)", () => {
  let api;
  beforeEach(() => {
    api = new AbgeordnetenwatchApi();
  });
  afterEach(() => {
    if (global.fetch && global.fetch.mockRestore) global.fetch.mockRestore();
  });

  describe("configuration", () => {
    it("defaults parliament_period to 132 (21. WP)", () => {
      expect(api.parliamentPeriod).toBe(132);
    });

    it("targets the candidacies-mandates endpoint with parliament_period", async () => {
      const spy = jest
        .spyOn(global, "fetch")
        .mockResolvedValue({ ok: true, json: async () => page([], 0) });
      await api.fetchAllPoliticians();
      const calledUrl = spy.mock.calls[0][0];
      expect(calledUrl).toContain("/candidacies-mandates");
      expect(calledUrl).toContain("parliament_period=132");
    });
  });

  describe("detail sync helpers (Issue #255)", () => {
    it("fetchAllMandates targets candidacies-mandates with current_on=all", async () => {
      const spy = jest
        .spyOn(global, "fetch")
        .mockResolvedValue({ ok: true, json: async () => page([], 0) });
      await api.fetchAllMandates();
      const calledUrl = spy.mock.calls[0][0];
      expect(calledUrl).toContain("/candidacies-mandates");
      expect(calledUrl).toContain("parliament_period=132");
      expect(calledUrl).toContain("current_on=all");
    });

    it("getVotesByMandate targets the votes endpoint with a mandate filter", async () => {
      const spy = jest
        .spyOn(global, "fetch")
        .mockResolvedValue({ ok: true, json: async () => page([], 0) });
      await api.getVotesByMandate(12345);
      const calledUrl = spy.mock.calls[0][0];
      expect(calledUrl).toContain("/votes");
      expect(calledUrl).toContain("mandate=12345");
    });

    it("fetchAllCommittees targets the committees endpoint with field_legislature", async () => {
      const spy = jest
        .spyOn(global, "fetch")
        .mockResolvedValue({ ok: true, json: async () => page([], 0) });
      await api.fetchAllCommittees();
      const calledUrl = spy.mock.calls[0][0];
      expect(calledUrl).toContain("/committees");
      expect(calledUrl).toContain("field_legislature=132");
    });

    it("getCommitteeMembershipsByCommittee targets committee-memberships with a committee filter", async () => {
      const spy = jest
        .spyOn(global, "fetch")
        .mockResolvedValue({ ok: true, json: async () => page([], 0) });
      await api.getCommitteeMembershipsByCommittee(5647);
      const calledUrl = spy.mock.calls[0][0];
      expect(calledUrl).toContain("/committee-memberships");
      expect(calledUrl).toContain("committee=5647");
    });
  });

  describe("range-based pagination (#fetchAllRanged)", () => {
    it("concatenates mandates across paginated responses", async () => {
      const responses = [
        page([mandate({ polId: 1, label: "Alice Weidel" }), mandate({ polId: 2, label: "Max Mustermann" })], 3),
        page([mandate({ polId: 3, label: "Tino Chrupalla" })], 3),
      ];
      let call = 0;
      jest.spyOn(global, "fetch").mockImplementation(async () => ({
        ok: true,
        json: async () => responses[call++],
      }));

      const all = await api.fetchAllPoliticians();
      expect(all.map((p) => p.id).sort()).toEqual([1, 2, 3]);
    });

    it("stops when a page returns non-ok", async () => {
      jest.spyOn(global, "fetch").mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve("") });
      const all = await api.fetchAllPoliticians();
      expect(all).toEqual([]);
    });

    it("handles a missing data key gracefully", async () => {
      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ meta: { result: { total: 0 } } }),
      });
      const all = await api.fetchAllPoliticians();
      expect(all).toEqual([]);
    });
  });

  describe("field mapping & de-duplication", () => {
    it("maps verified new fields and parses names from the label", async () => {
      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () =>
          page([mandate({ polId: 7, label: "Alice Weidel", mdbId: "11004183", fraction: "AfD" })], 1),
      });

      const [p] = await api.fetchAllPoliticians();
      expect(p.first_name).toBe("Alice");
      expect(p.last_name).toBe("Weidel");
      expect(p.firstName).toBe("Alice"); // legacy alias
      expect(p.lastName).toBe("Weidel");
      expect(p.externalId).toBe("aw-7");
      expect(p.source).toBe("abgeordnetenwatch");
      expect(p.party).toBe("AfD");
      expect(p.faction).toBe("AfD");
      expect(p.ext_id_bundestagsverwaltung).toBe("11004183");
      expect(p.constituency).toBe("Bodenseekreis");
      expect(p.year_of_birth).toBeNull(); // only populated when enriched
      expect(typeof p.rawData).toBe("string");
    });

    it("de-duplicates multiple mandates of the same politician (keeps latest)", async () => {
      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () =>
          page(
            [
              mandate({ polId: 5, label: "Erwin Rueddel", start: "2021-10-26" }),
              mandate({ polId: 5, label: "Erwin Rueddel", start: "2025-02-07" }),
            ],
            2,
          ),
      });

      const all = await api.fetchAllPoliticians();
      expect(all).toHaveLength(1);
      expect(all[0].mandateStart).toBe("2025-02-07");
    });
  });

  describe("enrichment (fetchPoliticianDetails)", () => {
    it("populates year_of_birth, gender and party from the politician entity", async () => {
      const mandatesPage = page([mandate({ polId: 9, label: "Ursula Groden-Kranich" })], 1);
      const entity = {
        data: {
          id: 9,
          first_name: "Ursula",
          last_name: "Groden-Kranich",
          year_of_birth: 1965,
          sex: "f",
          party: { label: "CDU" },
          ext_id_bundestagsverwaltung: "11004280",
        },
      };
      let call = 0;
      jest.spyOn(global, "fetch").mockImplementation(async () => ({
        ok: true,
        json: async () => (call++ === 0 ? mandatesPage : entity),
      }));

      const [p] = await api.fetchAllPoliticians({ enrich: true });
      expect(p.year_of_birth).toBe(1965);
      expect(p.birthDate).toBe("1965-01-01");
      expect(p.gender).toBe("female");
      expect(p.party).toBe("CDU");
      expect(p.ext_id_bundestagsverwaltung).toBe("11004280");
    });
  });

  describe("searchPoliticians", () => {
    it("URL-encodes the query and returns the data array", async () => {
      const spy = jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ id: 9, last_name: "Müller" }] }),
      });

      const res = await api.searchPoliticians("Max Müller");
      expect(res).toHaveLength(1);
      const calledUrl = spy.mock.calls[0][0];
      expect(calledUrl).toContain("search=Max%20M%C3%BCller");
    });
  });

  describe("caching", () => {
    it("serves repeated single-resource requests from cache", async () => {
      const spy = jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 5 } }),
      });

      await api.getPolitician(5);
      await api.getPolitician(5);
      expect(spy).toHaveBeenCalledTimes(1);

      api.clearCache();
      await api.getPolitician(5);
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });
});
