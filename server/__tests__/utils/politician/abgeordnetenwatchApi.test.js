// SPDX-License-Identifier: MIT
const { AbgeordnetenwatchApi } = require("../../../utils/politician/abgeordnetenwatchApi");

describe("AbgeordnetenwatchApi", () => {
  let api;
  beforeEach(() => {
    api = new AbgeordnetenwatchApi();
  });
  afterEach(() => {
    if (global.fetch && global.fetch.mockRestore) global.fetch.mockRestore();
  });

  describe("pagination (#fetchAllPages via fetchAllPoliticians)", () => {
    it("concatenates results across paginated responses", async () => {
      const responses = [
        { data: [{ id: 1 }, { id: 2 }], meta: { next: "https://aw/next-1" } },
        { data: [{ id: 3 }], meta: { next: null } },
      ];
      let call = 0;
      jest.spyOn(global, "fetch").mockImplementation(async () => ({
        ok: true,
        json: async () => responses[call++],
      }));

      const all = await api.fetchAllPoliticians();
      expect(all.map((x) => x.id)).toEqual([1, 2, 3]);
    });

    it("stops when a page returns non-ok", async () => {
      jest.spyOn(global, "fetch").mockResolvedValue({ ok: false, status: 500 });
      const all = await api.fetchAllPoliticians();
      expect(all).toEqual([]);
    });

    it("handles a missing data key gracefully", async () => {
      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ meta: { next: null } }),
      });
      const all = await api.fetchAllPoliticians();
      expect(all).toEqual([]);
    });
  });

  describe("searchPoliticians", () => {
    it("URL-encodes the query and returns the data array", async () => {
      const spy = jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ id: 9, lastName: "Müller" }], meta: { next: null } }),
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
