// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import PoliticalSidebar from "./index";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, fallback) => fallback || key }),
}));

vi.mock("../ChatSidebar", async () => {
  const actual = await vi.importActual("../ChatSidebar");
  return {
    ...actual,
    usePoliticalSidebar: () => ({
      sidebarOpen: true,
      closeSidebar: vi.fn(),
    }),
  };
});

vi.mock("@/utils/fetchWithTimeout", () => ({
  fetchWithTimeout: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({}),
  }),
}));

describe("PoliticalSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    expect(() => render(<PoliticalSidebar />)).not.toThrow();
  });

  it("survives 500 errors without crashing", async () => {
    const { fetchWithTimeout } = await import("@/utils/fetchWithTimeout");
    fetchWithTimeout.mockResolvedValue({
      ok: false,
      status: 500,
    });

    expect(() => render(<PoliticalSidebar />)).not.toThrow();
  });
});
