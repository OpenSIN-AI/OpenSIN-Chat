// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/telegram", () => ({
  default: {
    getConfig: vi.fn(),
  },
}));

import Telegram from "@/models/telegram";
import useTelegramBot, { TELEGRAM_BOT_KEY } from "./useTelegramBot";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useTelegramBot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns default value while loading", () => {
    Telegram.getConfig.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useTelegramBot(), { wrapper });
    expect(result.current.config).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it("returns data on success", async () => {
    const fakeConfig = { config: { active: true, bot_username: "testbot" } };
    Telegram.getConfig.mockResolvedValue(fakeConfig);
    const { result } = renderHook(() => useTelegramBot(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.config).toEqual({
      active: true,
      bot_username: "testbot",
    });
  });

  it("captures errors", async () => {
    Telegram.getConfig.mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useTelegramBot(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it("exposes a stable cache key", () => {
    expect(TELEGRAM_BOT_KEY).toBe("telegram-bot");
  });
});
