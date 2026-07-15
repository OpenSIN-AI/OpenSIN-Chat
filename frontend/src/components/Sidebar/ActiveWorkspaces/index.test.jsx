// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import ActiveWorkspaces from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

const mockWorkspaces = vi.fn(() => ({
  workspaces: [],
  isLoading: true,
  mutate: vi.fn(),
}));

vi.mock("@/hooks/useUser", () => ({
  default: vi.fn(() => ({ user: { role: "admin" } })),
}));

vi.mock("@/hooks/useWorkspaces", () => ({
  default: () => mockWorkspaces(),
}));

vi.mock("@/hooks/useThreads", () => ({
  invalidateThreads: vi.fn(),
}));

vi.mock("../../Modals/ManageWorkspace", () => ({
  default: () => <div data-testid="manage-workspace-modal">Modal</div>,
  useManageWorkspaceModal: () => ({
    showing: false,
    showModal: vi.fn(),
    hideModal: vi.fn(),
  }),
}));

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }) => children,
  Droppable: ({ children }) =>
    children({ innerRef: null, droppableProps: {}, placeholder: null }),
  Draggable: ({ children }) =>
    children(
      { innerRef: null, draggableProps: {}, dragHandleProps: {} },
      { isDragging: false },
    ),
}));

vi.mock("react-loading-skeleton", () => ({
  default: ({ count }) => <div data-testid="skeleton" data-count={count} />,
}));

vi.mock("./ThreadContainer", () => ({
  default: ({ workspace }) => (
    <div data-testid={`thread-container-${workspace.slug}`} />
  ),
}));

describe("ActiveWorkspaces", () => {
  beforeEach(() => {
    mockWorkspaces.mockReturnValue({
      workspaces: [],
      isLoading: true,
      mutate: vi.fn(),
    });
  });

  it("renders skeleton while loading", () => {
    render(
      <MemoryRouter>
        <ActiveWorkspaces />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });

  it("renders workspace list when loaded", () => {
    mockWorkspaces.mockReturnValue({
      workspaces: [
        { id: 1, slug: "ws-1", name: "Workspace One" },
        { id: 2, slug: "ws-2", name: "Workspace Two" },
      ],
      isLoading: false,
      mutate: vi.fn(),
    });
    render(
      <MemoryRouter>
        <ActiveWorkspaces />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("thread-container-ws-1")).toBeInTheDocument();
    expect(
      screen.queryByTestId("thread-container-ws-2"),
    ).not.toBeInTheDocument();
  });
});
