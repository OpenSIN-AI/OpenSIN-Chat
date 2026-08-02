// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

jest.mock("uuid", () => ({
  v4: jest.fn(() => "00000000-0000-4000-8000-000000000000"),
}));

jest.mock("../../../utils/url", () => ({
  assertSafeURL: jest.fn(),
}));

jest.mock("../../../utils/browserPool", () => ({
  browserPool: {},
}));

jest.mock("../../../utils/files", () => ({
  writeToServerDocuments: jest.fn(),
  documentsFolder: "/tmp",
}));

jest.mock("../../../utils/tokenizer", () => ({
  tokenizeString: jest.fn(() => 0),
}));

const { assertSafeURL } = require("../../../utils/url");
const {
  continueSafeRequest,
  navigateSafely,
} = require("../../../utils/extensions/WebsiteDepth");

describe("WebsiteDepth SSRF guards", () => {
  beforeEach(() => jest.clearAllMocks());

  it("aborts unsafe subresource requests", async () => {
    assertSafeURL.mockResolvedValue(false);
    const request = {
      url: jest.fn(() => "http://169.254.169.254/latest/meta-data"),
      abort: jest.fn(async () => undefined),
      continue: jest.fn(async () => undefined),
    };

    await expect(continueSafeRequest(request)).resolves.toBe(false);
    expect(request.abort).toHaveBeenCalledWith("blockedbyclient");
    expect(request.continue).not.toHaveBeenCalled();
  });

  it("continues public subresource requests", async () => {
    assertSafeURL.mockResolvedValue(true);
    const request = {
      url: jest.fn(() => "https://example.com/app.js"),
      abort: jest.fn(async () => undefined),
      continue: jest.fn(async () => undefined),
    };

    await expect(continueSafeRequest(request)).resolves.toBe(true);
    expect(request.continue).toHaveBeenCalledTimes(1);
    expect(request.abort).not.toHaveBeenCalled();
  });

  it("rejects unsafe top-level navigation before page.goto", async () => {
    assertSafeURL.mockResolvedValue(false);
    const page = {
      setRequestInterception: jest.fn(),
      on: jest.fn(),
      goto: jest.fn(),
    };

    await expect(
      navigateSafely(page, "http://127.0.0.1/admin", {}),
    ).rejects.toThrow("URL resolves to a blocked network.");
    expect(page.goto).not.toHaveBeenCalled();
  });
});
