// SPDX-License-Identifier: MIT
const {
  constituencyNumberToState,
  extractConstituencyNumber,
  extractStateFromAwRawData,
  extractProfileUrlFromAwRawData,
  extractStateFromBundestagRawData,
  extractPartyFromBundestagRawData,
} = require("../../../utils/politician/extractors");

describe("politician/extractors constituencyNumberToState", () => {
  it.each([
    [1, "Schleswig-Holstein"],
    [11, "Schleswig-Holstein"],
    [15, "Mecklenburg-Vorpommern"],
    [20, "Hamburg"],
    [40, "Niedersachsen"],
    [54, "Bremen"],
    [80, "Berlin"],
    [100, "Nordrhein-Westfalen"],
    [160, "Sachsen"],
    [220, "Bayern"],
    [270, "Baden-Württemberg"],
    [298, "Saarland"],
  ])("maps constituency %i to %s", (num, expected) => {
    expect(constituencyNumberToState(num)).toBe(expected);
  });

  it("accepts numeric strings", () => {
    expect(constituencyNumberToState("100")).toBe("Nordrhein-Westfalen");
  });

  it("returns null for out-of-range or invalid numbers", () => {
    expect(constituencyNumberToState(0)).toBe(null);
    expect(constituencyNumberToState(999)).toBe(null);
    expect(constituencyNumberToState("abc")).toBe(null);
  });
});

describe("politician/extractors extractConstituencyNumber", () => {
  it("extracts a leading number from a label", () => {
    expect(extractConstituencyNumber("100 - Aachen I")).toBe(100);
  });

  it("returns null for labels without a leading number", () => {
    expect(extractConstituencyNumber("Aachen")).toBe(null);
    expect(extractConstituencyNumber("")).toBe(null);
    expect(extractConstituencyNumber(null)).toBe(null);
  });
});

describe("politician/extractors extractStateFromAwRawData", () => {
  it("prefers the Landesliste label", () => {
    const raw = {
      electoral_data: {
        electoral_list: { label: "Landesliste Bayern (CSU)" },
      },
    };
    expect(extractStateFromAwRawData(raw)).toBe("Bayern");
  });

  it("falls back to the constituency number", () => {
    const raw = {
      electoral_data: {
        constituency: { label: "100 - Aachen I" },
      },
    };
    expect(extractStateFromAwRawData(raw)).toBe("Nordrhein-Westfalen");
  });

  it("parses JSON string input", () => {
    const raw = JSON.stringify({
      electoral_data: { electoral_list: { label: "Landesliste Hessen (SPD)" } },
    });
    expect(extractStateFromAwRawData(raw)).toBe("Hessen");
  });

  it("returns null for malformed input", () => {
    expect(extractStateFromAwRawData("not json")).toBe(null);
    expect(extractStateFromAwRawData({})).toBe(null);
  });
});

describe("politician/extractors extractProfileUrlFromAwRawData", () => {
  it("extracts the public profile url", () => {
    const raw = {
      politician: { abgeordnetenwatch_url: "https://example.com/p/1" },
    };
    expect(extractProfileUrlFromAwRawData(raw)).toBe("https://example.com/p/1");
  });

  it("returns null when absent or malformed", () => {
    expect(extractProfileUrlFromAwRawData({})).toBe(null);
    expect(extractProfileUrlFromAwRawData("bad json")).toBe(null);
  });
});

describe("politician/extractors Bundestag (DIP) extractors", () => {
  it("extracts state from person_roles", () => {
    const raw = {
      person_roles: [{ bundesland: "Sachsen " }],
    };
    expect(extractStateFromBundestagRawData(raw)).toBe("Sachsen");
  });

  it("extracts state from a top-level bundesland field", () => {
    expect(extractStateFromBundestagRawData({ bundesland: "Berlin" })).toBe(
      "Berlin",
    );
  });

  it("extracts party/faction from person_roles", () => {
    const raw = { person_roles: [{ fraktion: "CDU/CSU " }] };
    expect(extractPartyFromBundestagRawData(raw)).toBe("CDU/CSU");
  });

  it("returns null for malformed Bundestag input", () => {
    expect(extractStateFromBundestagRawData("nope")).toBe(null);
    expect(extractPartyFromBundestagRawData({})).toBe(null);
  });
});
