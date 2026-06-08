// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import paths, { isPathMatch } from "./paths";

describe("isPathMatch", () => {
  it("returns true on exact match", () => {
    expect(isPathMatch("/settings", "/settings")).toBe(true);
  });

  it("returns true for child path", () => {
    expect(isPathMatch("/settings", "/settings/users")).toBe(true);
  });

  it("returns false for unrelated path", () => {
    expect(isPathMatch("/settings", "/login")).toBe(false);
  });

  it("does not match partial segment (e.g. /settings vs /settings-other)", () => {
    expect(isPathMatch("/settings", "/settings-other")).toBe(false);
  });

  it("does not match when href is longer", () => {
    expect(isPathMatch("/settings/users", "/settings")).toBe(false);
  });
});

describe("paths.home", () => {
  it("returns /", () => {
    expect(paths.home()).toBe("/");
  });
});

describe("paths.login", () => {
  it("returns /login by default", () => {
    expect(paths.login()).toBe("/login");
  });

  it("returns /login?nt=1 when noTry is true", () => {
    expect(paths.login(true)).toBe("/login?nt=1");
  });
});

describe("paths.workspace.chat", () => {
  it("returns /workspace/:slug without options", () => {
    expect(paths.workspace.chat("my-slug")).toBe("/workspace/my-slug");
  });

  it("appends search params when options.search is provided", () => {
    expect(paths.workspace.chat("my-slug", { search: "t=1" })).toBe(
      "/workspace/my-slug?t=1",
    );
  });
});

describe("paths.settings.users", () => {
  it("returns /settings/users", () => {
    expect(paths.settings.users()).toBe("/settings/users");
  });
});
