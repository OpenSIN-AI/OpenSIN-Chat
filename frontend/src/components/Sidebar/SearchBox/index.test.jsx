// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@/models/workspace", () => ({
  default: {
    searchWorkspaceOrThread: vi
      .fn()
      .mockResolvedValue({ workspaces: [], threads: [] }),
  },
}));

vi.mock("@/components/Preloader", () => ({
  default: () => <div data-testid="preloader">Loading...</div>,
}));


vi.mock("react-tooltip", () => ({
  Tooltip: () => null,
}));

import SearchBox from "./index";
import Workspace from "@/models/workspace";

describe("SearchBox", () => {
  const defaultProps = {
    user: { id: 1 },
    showNewWsModal: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders search input", () => {
    render(
      <MemoryRouter>
        <SearchBox {...defaultProps} />
      </MemoryRouter>,
    );
    const input = document.querySelector("input[type='search']");
    expect(input).toBeInTheDocument();
  });

  it("renders new workspace button", () => {
    render(
      <MemoryRouter>
        <SearchBox {...defaultProps} />
      </MemoryRouter>,
    );
    const button = document.querySelector("button");
    expect(button).toBeInTheDocument();
  });

  it("calls showNewWsModal when new workspace button clicked", () => {
    const showNewWsModal = vi.fn();
    render(
      <MemoryRouter>
        <SearchBox user={{ id: 1 }} showNewWsModal={showNewWsModal} />
      </MemoryRouter>,
    );
    const button = document.querySelector("button");
    fireEvent.click(button);
    expect(showNewWsModal).toHaveBeenCalled();
  });

  it("updates search value on input change", () => {
    render(
      <MemoryRouter>
        <SearchBox {...defaultProps} />
      </MemoryRouter>,
    );
    const input = document.querySelector("input[type='search']");
    fireEvent.change(input, { target: { value: "test" } });
    expect(input.value).toBe("test");
  });

  it("debounces search calls", async () => {
    render(
      <MemoryRouter>
        <SearchBox {...defaultProps} />
      </MemoryRouter>,
    );
    const input = document.querySelector("input[type='search']");
    fireEvent.change(input, { target: { value: "afd" } });
    // Wait for debounce to complete
    await waitFor(
      () => {
        expect(Workspace.searchWorkspaceOrThread).toHaveBeenCalledWith("afd");
      },
      { timeout: 1000 },
    );
  });
});
