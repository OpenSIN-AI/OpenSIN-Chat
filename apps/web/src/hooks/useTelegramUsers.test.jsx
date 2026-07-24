// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/telegram", () => ({
  default: {
    getPendingUsers: vi.fn(),
    getApprovedUsers: vi.fn(),
  },
}));

import Telegram from "@/models/telegram";
import useTelegramUsers, { TELEGRAM_USERS_KEY } from "./useTelegramUsers";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useTelegramUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns default values while loading", () => {
    Telegram.getPendingUsers.mockReturnValue(new Promise(() => {}));
    Telegram.getApprovedUsers.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useTelegramUsers(), { wrapper });
    expect(result.current.pendingUsers).toEqual([]);
    expect(result.current.approvedUsers).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns data on success", async () => {
    const pending = { users: [{ id: "p1", username: "pending_user" }] };
    const approved = { users: [{ id: "a1", username: "approved_user" }] };
    Telegram.getPendingUsers.mockResolvedValue(pending);
    Telegram.getApprovedUsers.mockResolvedValue(approved);
    const { result } = renderHook(() => useTelegramUsers(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pendingUsers).toEqual(pending.users);
    expect(result.current.approvedUsers).toEqual(approved.users);
  });

  it("captures errors", async () => {
    Telegram.getPendingUsers.mockRejectedValue(new Error("fail"));
    Telegram.getApprovedUsers.mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useTelegramUsers(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it("exposes a stable cache key", () => {
    expect(TELEGRAM_USERS_KEY).toBe("telegram-users");
  });
});
