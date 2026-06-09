// SPDX-License-Identifier: MIT
jest.mock("dotenv", () => ({ config: jest.fn() }), { virtual: true });
jest.mock("slugify", () => {
  const fn = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  fn.extend = jest.fn();
  return { default: fn, __esModule: true };
}, { virtual: true });

const { ACCEPTED_MIMES, SUPPORTED_FILETYPE_CONVERTERS } = require("../../../utils/constants");

describe("ACCEPTED_MIMES", () => {
  test("maps application/pdf to .pdf", () => {
    expect(ACCEPTED_MIMES["application/pdf"]).toEqual([".pdf"]);
  });

  test("maps text/plain to .txt", () => {
    expect(ACCEPTED_MIMES["text/plain"]).toEqual(expect.arrayContaining([".txt"]));
  });

  test("maps word doc MIME to .docx", () => {
    expect(ACCEPTED_MIMES["application/vnd.openxmlformats-officedocument.wordprocessingml.document"])
      .toEqual([".docx"]);
  });

  test("maps text/csv to .csv", () => {
    expect(ACCEPTED_MIMES["text/csv"]).toEqual(expect.arrayContaining([".csv"]));
  });

  test("maps text/html to .html", () => {
    expect(ACCEPTED_MIMES["text/html"]).toEqual(expect.arrayContaining([".html"]));
  });

  test("has entries for audio types", () => {
    expect(Object.keys(ACCEPTED_MIMES).some((k) => k.startsWith("audio/"))).toBe(true);
  });

  test("has entries for image types", () => {
    expect(Object.keys(ACCEPTED_MIMES).some((k) => k.startsWith("image/"))).toBe(true);
  });
});

describe("SUPPORTED_FILETYPE_CONVERTERS", () => {
  test("contains pdf converter", () => {
    expect(".pdf" in SUPPORTED_FILETYPE_CONVERTERS).toBe(true);
  });

  test("contains txt converter", () => {
    expect(".txt" in SUPPORTED_FILETYPE_CONVERTERS).toBe(true);
  });

  test("contains docx converter", () => {
    expect(".docx" in SUPPORTED_FILETYPE_CONVERTERS).toBe(true);
  });

  test("contains csv converter", () => {
    expect(".csv" in SUPPORTED_FILETYPE_CONVERTERS).toBe(true);
  });

  test("contains html converter", () => {
    expect(".html" in SUPPORTED_FILETYPE_CONVERTERS).toBe(true);
  });

  test("contains audio extensions", () => {
    expect(".mp3" in SUPPORTED_FILETYPE_CONVERTERS).toBe(true);
    expect(".wav" in SUPPORTED_FILETYPE_CONVERTERS).toBe(true);
  });

  test("contains image extensions", () => {
    expect(".png" in SUPPORTED_FILETYPE_CONVERTERS).toBe(true);
    expect(".jpg" in SUPPORTED_FILETYPE_CONVERTERS).toBe(true);
  });

  test("converter paths are strings", () => {
    Object.values(SUPPORTED_FILETYPE_CONVERTERS).forEach((v) => {
      expect(typeof v).toBe("string");
    });
  });
});
