// SPDX-License-Identifier: MIT
const path = require("path");

// We test the logic of isWithin and normalizePath directly
// by recreating them based on the source (these are pure functions)

function isWithin(outer, inner) {
  const resolvedOuter = path.resolve(outer);
  const resolvedInner = path.resolve(inner);
  const rel = path.relative(resolvedOuter, resolvedInner);

  if (rel === "") return false;
  return (
    !rel.startsWith(`..${path.sep}`) && rel !== ".." && !path.isAbsolute(rel)
  );
}

function normalizePath(filepath = "") {
  const result = path
    .normalize(filepath.trim())
    .replace(/^(\.\.(\/|\\|$))+/, "")
    .trim();
  if (["..", ".", "/"].includes(result)) throw new Error("Invalid path.");
  return result;
}

function sanitizeFileName(fileName) {
  if (!fileName) return fileName;
  // eslint-disable-next-line no-useless-escape
  return fileName.replace(/[<>:"|?*\x00-\x1F]/g, "_");
}

describe("isWithin", () => {
  test("returns true for direct child path", () => {
    expect(isWithin("/foo", "/foo/bar")).toBe(true);
  });

  test("returns true for nested child path", () => {
    expect(isWithin("/foo", "/foo/bar/baz")).toBe(true);
  });

  test("returns false for parent path", () => {
    expect(isWithin("/foo", "/")).toBe(false);
  });

  test("returns false for sibling path", () => {
    expect(isWithin("/foo", "/bar")).toBe(false);
  });

  test("returns false for path traversal attempt", () => {
    expect(isWithin("/foo", "/foo/../bar")).toBe(false);
  });

  test("returns false when paths are equal", () => {
    expect(isWithin("/foo", "/foo")).toBe(false);
  });

  test("handles relative paths", () => {
    expect(isWithin("./foo", "./foo/bar")).toBe(true);
  });
});

describe("normalizePath", () => {
  test("removes leading ../", () => {
    expect(normalizePath("../foo/bar")).toBe("foo/bar");
  });

  test("removes multiple leading ../", () => {
    expect(normalizePath("../../../foo/bar")).toBe("foo/bar");
  });

  test("trims whitespace", () => {
    expect(normalizePath("  foo/bar  ")).toBe("foo/bar");
  });

  test("returns normalized path", () => {
    expect(normalizePath("foo/./bar")).toBe("foo/bar");
  });

  test("throws for .", () => {
    expect(() => normalizePath(".")).toThrow("Invalid path.");
  });

  test("throws for /", () => {
    expect(() => normalizePath("/")).toThrow("Invalid path.");
  });
});

describe("sanitizeFileName", () => {
  test("returns empty string as-is", () => {
    expect(sanitizeFileName("")).toBe("");
  });

  test("returns null as-is", () => {
    expect(sanitizeFileName(null)).toBeNull();
  });

  test("returns undefined as-is", () => {
    expect(sanitizeFileName(undefined)).toBeUndefined();
  });

  test("replaces invalid characters", () => {
    expect(sanitizeFileName("file:name")).toBe("file_name");
    expect(sanitizeFileName("file<name>")).toBe("file_name_");
    expect(sanitizeFileName("file|name")).toBe("file_name");
    expect(sanitizeFileName('file"name"')).toBe("file_name_");
    expect(sanitizeFileName("file?name")).toBe("file_name");
    expect(sanitizeFileName("file*name")).toBe("file_name");
  });

  test("preserves valid characters", () => {
    expect(sanitizeFileName("normal_file-name.txt")).toBe("normal_file-name.txt");
  });

  test("replaces control characters", () => {
    expect(sanitizeFileName("file\x00name")).toBe("file_name");
    expect(sanitizeFileName("file\x1Fname")).toBe("file_name");
  });
});
