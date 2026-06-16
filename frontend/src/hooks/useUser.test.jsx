// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { SWRConfig } from "swr";
import { AuthContext } from "@/AuthContext";

vi.mock("@/models/system", () => ({
  default: {
    refreshUser: vi.fn(),
  },
}));

import System from "@/models/system";
import useUser, { userKey } from "./useUser";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <AuthContext.Provider
        value={{
          store: { user: { id: 1, username: "alice" }, authToken: "token" },
          actions: {},
        }}
      >
        {children}
      </AuthContext.Provider>
    </SWRConfig>
  );
}

describe("useUser", () => {
  it("reads the authenticated user from AuthContext without fetching", () => {
    const { result } = renderHook(() => ({ a: useUser(), b: useUser() }), {
      wrapper,
    });

    expect(result.current.a.user).toEqual({ id: 1, username: "alice" });
    expect(result.current.b.user).toEqual({ id: 1, username: "alice" });
    expect(System.refreshUser).not.toHaveBeenCalled();
  });

  it("keeps the shared refresh-user cache key stable", () => {
    expect(userKey).toBe("system/refresh-user");
  });
});
