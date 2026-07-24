// SPDX-License-Identifier: MIT
jest.mock("dotenv", () => ({ config: jest.fn() }), { virtual: true });
jest.mock("../../../utils/runtimeSettings", () => {
  return class RuntimeSettings {
    get() { return false; }
    set() {}
  };
});

const { validURL, validateURL, validYoutubeVideoUrl } = require("../../../utils/url");

describe("validURL", () => {
  test("returns true for valid https URL", () => {
    expect(validURL("https://example.com")).toBe(true);
  });

  test("returns true for valid http URL", () => {
    expect(validURL("http://example.com")).toBe(true);
  });

  test("returns true for URL with path", () => {
    expect(validURL("https://example.com/path/to/page")).toBe(true);
  });

  test("returns true for URL with query string", () => {
    expect(validURL("https://example.com?foo=bar")).toBe(true);
  });

  test("returns true for URL with port", () => {
    expect(validURL("https://example.com:8080")).toBe(true);
  });

  test("returns false for ftp:// protocol", () => {
    expect(validURL("ftp://example.com")).toBe(false);
  });

  test("returns false for file:// protocol", () => {
    expect(validURL("file:///etc/passwd")).toBe(false);
  });

  test("returns false for javascript: protocol", () => {
    expect(validURL("javascript:alert(1)")).toBe(false);
  });

  test("returns false for invalid URL", () => {
    expect(validURL("not a url")).toBe(false);
  });

  test("returns false for empty string", () => {
    expect(validURL("")).toBe(false);
  });

  test("returns false for 192.168.x.x IP", () => {
    expect(validURL("http://192.168.1.1")).toBe(false);
  });

  test("returns false for 10.x.x.x IP", () => {
    expect(validURL("http://10.0.0.1")).toBe(false);
  });

  test("returns false for 172.16-31.x.x IP", () => {
    expect(validURL("http://172.16.0.1")).toBe(false);
  });

  test("returns false for 169.254.x.x link-local IP", () => {
    expect(validURL("http://169.254.169.254")).toBe(false);
  });
});

describe("validateURL", () => {
  test("adds https:// to URL without protocol", () => {
    expect(validateURL("example.com")).toBe("https://example.com");
  });

  test("preserves https:// in URL with protocol", () => {
    expect(validateURL("https://example.com")).toBe("https://example.com");
  });

  test("preserves http:// in URL with protocol", () => {
    expect(validateURL("http://example.com")).toBe("http://example.com");
  });

  test("removes trailing slash", () => {
    expect(validateURL("https://example.com/")).toBe("https://example.com");
  });

  test("trims whitespace", () => {
    expect(validateURL("  example.com  ")).toBe("https://example.com");
  });

  test("returns original string for invalid URL", () => {
    expect(validateURL("not://valid url")).toBe("not://valid url");
  });

  test("returns empty string for non-string input", () => {
    expect(validateURL(null)).toBe("");
    expect(validateURL(undefined)).toBe("");
    expect(validateURL(123)).toBe("");
  });
});

describe("validYoutubeVideoUrl", () => {
  test("returns true for standard watch URL", () => {
    expect(validYoutubeVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
  });

  test("returns true for youtu.be short URL", () => {
    expect(validYoutubeVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
  });

  test("returns true for embed URL", () => {
    expect(validYoutubeVideoUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(true);
  });

  test("returns true for shorts URL", () => {
    expect(validYoutubeVideoUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(true);
  });

  test("returns true for m.youtube.com URL", () => {
    expect(validYoutubeVideoUrl("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
  });

  test("returns true for music.youtube.com URL", () => {
    expect(validYoutubeVideoUrl("https://music.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
  });

  test("returns true for live URL", () => {
    expect(validYoutubeVideoUrl("https://www.youtube.com/live/dQw4w9WgXcQ")).toBe(true);
  });

  test("returns false for non-YouTube URL", () => {
    expect(validYoutubeVideoUrl("https://example.com/video/123")).toBe(false);
  });

  test("returns false for empty string", () => {
    expect(validYoutubeVideoUrl("")).toBe(false);
  });

  test("returns false for null", () => {
    expect(validYoutubeVideoUrl(null)).toBe(false);
  });

  test("returns false for undefined", () => {
    expect(validYoutubeVideoUrl(undefined)).toBe(false);
  });

  test("returns false for non-string", () => {
    expect(validYoutubeVideoUrl(123)).toBe(false);
  });

  test("returns video ID when returnVideoId is true", () => {
    expect(validYoutubeVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ", true)).toBe("dQw4w9WgXcQ");
  });

  test("returns null when returnVideoId is true and URL is invalid", () => {
    expect(validYoutubeVideoUrl("https://example.com", true)).toBeNull();
  });
});
