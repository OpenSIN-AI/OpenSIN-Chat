// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";
import { castToType } from "./types";

describe("castToType", () => {
  it("returns the value unchanged for unknown keys", () => {
    expect(castToType("unknown", "42")).toBe("42");
  });

  it("casts openAiTemp to a number", () => {
    expect(castToType("openAiTemp", "0.7")).toBe(0.7);
  });

  it("casts openAiHistory to a number", () => {
    expect(castToType("openAiHistory", "10")).toBe(10);
  });

  it("casts similarityThreshold to a float", () => {
    expect(castToType("similarityThreshold", "0.85")).toBe(0.85);
  });

  it("casts topN to a number", () => {
    expect(castToType("topN", "5")).toBe(5);
  });

  it("casts router_id to a number or null", () => {
    expect(castToType("router_id", "3")).toBe(3);
    expect(castToType("router_id", "")).toBeNull();
  });
});
