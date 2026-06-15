// SPDX-License-Identifier: MIT
// Tests for MemoryCard component
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MemoryCard from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

// ---- module mocks ----
// Use vi.hoisted so the mock factory variable is available before vi.mock is hoisted
const { useMemoriesContext } = vi.hoisted(() => ({
  useMemoriesContext: vi.fn(),
}));

vi.mock("../MemoriesContext", () => ({
  LIMITS: { workspace: 20, global: 5 },
  useMemoriesContext,
}));

vi.mock("./CardMenu", () => ({
  default: ({ onEdit, onDelete, onMove, menuRef }) => (
    <div data-testid="card-menu" ref={menuRef}>
      <button data-testid="menu-edit" onClick={onEdit}>
        Edit
      </button>
      <button data-testid="menu-delete" onClick={onDelete}>
        Delete
      </button>
      <button data-testid="menu-move" onClick={onMove}>
        Move
      </button>
    </div>
  ),
}));

// ---- helpers ----
const makeContextValue = (overrides = {}) => ({
  activeTab: "workspace",
  memories: { workspace: [], global: [] },
  handleDelete: vi.fn(),
  openEditModal: vi.fn(),
  handlePromote: vi.fn(),
  handleDemote: vi.fn(),
  ...overrides,
});

const workspaceMemory = {
  id: "mem-1",
  content: "Remember to greet users by name",
  createdAt: "2024-01-15T10:00:00Z",
};

const globalMemory = {
  id: "mem-2",
  content: "Global context note",
  createdAt: "2024-02-20T12:00:00Z",
};

const Wrapper = ({ children }) => <MemoryRouter>{children}</MemoryRouter>;

describe("MemoryCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders memory content", () => {
    useMemoriesContext.mockReturnValue(makeContextValue());
    render(<MemoryCard memory={workspaceMemory} />, { wrapper: Wrapper });
    expect(
      screen.getByText("Remember to greet users by name"),
    ).toBeInTheDocument();
  });

  it("renders formatted creation date", () => {
    useMemoriesContext.mockReturnValue(makeContextValue());
    render(<MemoryCard memory={workspaceMemory} />, { wrapper: Wrapper });
    // Jan 15, 2024 formatted as "Jan 15, 2024"
    expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
  });

  it("menu is hidden by default", () => {
    useMemoriesContext.mockReturnValue(makeContextValue());
    render(<MemoryCard memory={workspaceMemory} />, { wrapper: Wrapper });
    expect(screen.queryByTestId("card-menu")).toBeNull();
  });

  it("opens menu when the dots button is clicked", () => {
    useMemoriesContext.mockReturnValue(makeContextValue());
    render(<MemoryCard memory={workspaceMemory} />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByTestId("card-menu")).toBeInTheDocument();
  });

  it("calls handleDelete when delete is clicked in menu", () => {
    const handleDelete = vi.fn();
    useMemoriesContext.mockReturnValue(makeContextValue({ handleDelete }));
    render(<MemoryCard memory={workspaceMemory} />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByTestId("menu-delete"));
    expect(handleDelete).toHaveBeenCalledWith(workspaceMemory.id);
  });

  it("calls openEditModal when edit is clicked in menu", () => {
    const openEditModal = vi.fn();
    useMemoriesContext.mockReturnValue(makeContextValue({ openEditModal }));
    render(<MemoryCard memory={workspaceMemory} />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByTestId("menu-edit"));
    expect(openEditModal).toHaveBeenCalledWith(workspaceMemory);
  });

  it("calls handlePromote when move is clicked on workspace tab", () => {
    const handlePromote = vi.fn();
    useMemoriesContext.mockReturnValue(
      makeContextValue({ activeTab: "workspace", handlePromote }),
    );
    render(<MemoryCard memory={workspaceMemory} />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByTestId("menu-move"));
    expect(handlePromote).toHaveBeenCalledWith(workspaceMemory.id);
  });

  it("calls handleDemote when move is clicked on global tab", () => {
    const handleDemote = vi.fn();
    useMemoriesContext.mockReturnValue(
      makeContextValue({
        activeTab: "global",
        memories: { workspace: [], global: [globalMemory] },
        handleDemote,
      }),
    );
    render(<MemoryCard memory={globalMemory} />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByTestId("menu-move"));
    expect(handleDemote).toHaveBeenCalledWith(globalMemory.id);
  });

  it("closes menu when clicking outside", async () => {
    useMemoriesContext.mockReturnValue(makeContextValue());
    render(<MemoryCard memory={workspaceMemory} />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByTestId("card-menu")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByTestId("card-menu")).toBeNull();
    });
  });

  it("closes menu after edit action", () => {
    useMemoriesContext.mockReturnValue(makeContextValue());
    render(<MemoryCard memory={workspaceMemory} />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByTestId("menu-edit"));
    expect(screen.queryByTestId("card-menu")).toBeNull();
  });
});
