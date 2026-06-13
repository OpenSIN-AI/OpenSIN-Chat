// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { LogoContext } from "../LogoContext";
import useLogo from "./useLogo";

function wrapper({ children }) {
  return (
    <LogoContext.Provider
      value={{ logo: "logo.png", setLogo: () => {}, loginLogo: "login.png", isCustomLogo: true }}
    >
      {children}
    </LogoContext.Provider>
  );
}

describe("useLogo", () => {
  it("returns context values", () => {
    const { result } = renderHook(() => useLogo(), { wrapper });
    expect(result.current.logo).toBe("logo.png");
    expect(result.current.isCustomLogo).toBe(true);
  });
});
