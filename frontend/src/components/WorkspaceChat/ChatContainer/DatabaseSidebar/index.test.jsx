// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import DatabaseSidebar from "./index";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, fallback) => fallback || key }),
}));

vi.mock("../ChatSidebar", async () => {
  const actual = await vi.importActual("../ChatSidebar");
  return {
    ...actual,
    useDatabaseSidebar: () => ({
      sidebarOpen: true,
      closeSidebar: vi.fn(),
    }),
  };
});

vi.mock("@/utils/fetchWithTimeout", () => ({
  fetchWithTimeout: vi.fn(),
}));

import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

describe("DatabaseSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    fetchWithTimeout.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
    expect(() => render(<DatabaseSidebar />)).not.toThrow();
  });

  it("displays a list of politicians when fetch succeeds", async () => {
    fetchWithTimeout.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: "1", first_name: "Alice", last_name: "Weidel" },
          { id: "2", first_name: "Tino", last_name: "Chrupalla" },
        ],
      }),
    });

    render(<DatabaseSidebar />);
    await waitFor(() => {
      expect(screen.getByText("Alice Weidel")).toBeInTheDocument();
      expect(screen.getByText("Tino Chrupalla")).toBeInTheDocument();
    });
  });

  it("survives 500 errors without crashing", () => {
    fetchWithTimeout.mockResolvedValue({
      ok: false,
      status: 500,
    });
    expect(() => render(<DatabaseSidebar />)).not.toThrow();
  });
});
