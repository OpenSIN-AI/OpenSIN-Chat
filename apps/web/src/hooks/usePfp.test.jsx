// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { PfpContext } from "../PfpContext";
import usePfp from "./usePfp";

function wrapper({ children }) {
  return (
    <PfpContext.Provider value={{ pfp: "url", setPfp: () => {} }}>
      {children}
    </PfpContext.Provider>
  );
}

describe("usePfp", () => {
  it("returns context values", () => {
    const { result } = renderHook(() => usePfp(), { wrapper });
    expect(result.current.pfp).toBe("url");
    expect(result.current.setPfp).toBeDefined();
  });
});
