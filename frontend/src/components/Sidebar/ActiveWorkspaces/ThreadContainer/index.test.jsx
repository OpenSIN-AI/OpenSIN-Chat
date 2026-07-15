// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }) => children,
  PointerSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => ({})),
  DragOverlay: ({ children }) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
  closestCenter: vi.fn(),
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false,
  }),
}));

vi.mock("@/hooks/useScrollActiveItemIntoView", () => ({
  default: () => ({ ref: vi.fn() }),
}));

const navigateMock = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const mutateMock = vi.fn();
const useThreadsMock = vi.fn();
function useThreadsWrapper(...args) {
  return useThreadsMock(...args);
}
vi.mock("@/hooks/useThreads", () => ({
  default: useThreadsWrapper,
  invalidateThreads: vi.fn(),
}));

vi.mock("@/utils/toast", () => ({
  default: vi.fn(),
}));

const newThreadMock = vi.fn();
const deleteBulkMock = vi.fn();
const assignThreadMock = vi.fn();
const newFolderMock = vi.fn();

vi.mock("@/models/workspace", () => ({
  default: {
    threads: {
      new: (...args) => newThreadMock(...args),
      deleteBulk: (...args) => deleteBulkMock(...args),
      folders: {
        assignThread: (...args) => assignThreadMock(...args),
        new: (...args) => newFolderMock(...args),
      },
    },
  },
}));

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("./ThreadItem", () => ({
  default: ({ thread, isActive }) => (
    <div data-testid={`thread-${thread.slug || "default"}`}>
      {thread.name}
      {isActive ? " (active)" : ""}
    </div>
  ),
}));

vi.mock("./ThreadFolderItem", () => ({
  default: ({ folder }) => (
    <div data-testid={`folder-${folder.id}`}>{folder.name}</div>
  ),
}));

import ThreadContainer from "@/components/Sidebar/ActiveWorkspaces/ThreadContainer";

const baseWorkspace = { slug: "my-workspace", id: 1 };

function renderContainer(
  props = {},
  { initialPath = "/workspace/my-workspace" } = {},
) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="*"
          element={<ThreadContainer workspace={baseWorkspace} {...props} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useThreadsMock.mockReturnValue({
    threads: [],
    folders: [],
    defaultThreadHasChats: false,
    isLoading: false,
    mutate: mutateMock,
  });
  newThreadMock.mockResolvedValue({
    thread: { slug: "new-thread" },
    message: null,
  });
  deleteBulkMock.mockResolvedValue(true);
  assignThreadMock.mockResolvedValue(true);
  newFolderMock.mockResolvedValue({ folder: { id: 1, name: "New Folder" } });
  if (!navigator.clipboard) {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn(() => Promise.resolve()) },
      writable: true,
      configurable: true,
    });
  }
});

describe("ThreadContainer", () => {
  describe("Loading state", () => {
    it("zeigt Loading-Indikator wenn isLoading true ist", () => {
      useThreadsMock.mockReturnValue({
        threads: [],
        folders: [],
        defaultThreadHasChats: false,
        isLoading: true,
        mutate: mutateMock,
      });
      renderContainer();
      expect(screen.getByText(/loadingThreads|Loading/i)).toBeTruthy();
    });
  });

  describe("Thread rendering", () => {
    it("rendert unfoldered Threads", () => {
      useThreadsMock.mockReturnValue({
        threads: [
          { id: 1, slug: "t1", name: "Thread 1" },
          { id: 2, slug: "t2", name: "Thread 2" },
        ],
        folders: [],
        defaultThreadHasChats: false,
        isLoading: false,
        mutate: mutateMock,
      });
      renderContainer();
      expect(screen.getByTestId("thread-t1")).toBeTruthy();
      expect(screen.getByTestId("thread-t2")).toBeTruthy();
    });

    it("rendert Default-Thread wenn defaultThreadHasChats true ist", () => {
      useThreadsMock.mockReturnValue({
        threads: [],
        folders: [],
        defaultThreadHasChats: true,
        isLoading: false,
        mutate: mutateMock,
      });
      renderContainer();
      expect(screen.getByTestId("thread-default")).toBeTruthy();
    });

    it("rendert virtuellen Thread wenn kein threadSlug und keine Chats", () => {
      useThreadsMock.mockReturnValue({
        threads: [],
        folders: [],
        defaultThreadHasChats: false,
        isLoading: false,
        mutate: mutateMock,
      });
      renderContainer();
      expect(screen.getByText(/New Thread/i)).toBeTruthy();
    });

    it("rendert Folder mit ihren Threads", () => {
      useThreadsMock.mockReturnValue({
        threads: [{ id: 1, slug: "t1", name: "Thread 1", folder_id: 10 }],
        folders: [{ id: 10, name: "My Folder" }],
        defaultThreadHasChats: false,
        isLoading: false,
        mutate: mutateMock,
      });
      renderContainer();
      expect(screen.getByTestId("folder-10")).toBeTruthy();
    });
  });

  describe("THREAD_RENAME_EVENT", () => {
    it("aktualisiert Thread-Namen bei renameEvent", async () => {
      useThreadsMock.mockReturnValue({
        threads: [{ id: 1, slug: "t1", name: "Old Name" }],
        folders: [],
        defaultThreadHasChats: false,
        isLoading: false,
        mutate: mutateMock,
      });
      renderContainer();
      window.dispatchEvent(
        new CustomEvent("renameThread", {
          detail: { threadSlug: "t1", newName: "New Name" },
        }),
      );
      await waitFor(() => {
        expect(mutateMock).toHaveBeenCalled();
      });
    });
  });

  describe("Bulk deletion (Ctrl/Cmd key)", () => {
    it("aktiviert Bulk-Delete-Modus bei Ctrl-Tastendruck", async () => {
      useThreadsMock.mockReturnValue({
        threads: [{ id: 1, slug: "t1", name: "Thread 1", deleted: true }],
        folders: [],
        defaultThreadHasChats: false,
        isLoading: false,
        mutate: mutateMock,
      });
      renderContainer();
      fireEvent.keyDown(window, { key: "Control" });
      await waitFor(() => {
        expect(
          screen.queryByText(/deleteSelected|Delete selected/i),
        ).toBeTruthy();
      });
    });

    it("setzt deleted-Flag beim Keyup zurück", async () => {
      useThreadsMock.mockReturnValue({
        threads: [{ id: 1, slug: "t1", name: "Thread 1", deleted: true }],
        folders: [],
        defaultThreadHasChats: false,
        isLoading: false,
        mutate: mutateMock,
      });
      renderContainer();
      fireEvent.keyUp(window, { key: "Control" });
      await waitFor(() => {
        expect(mutateMock).toHaveBeenCalled();
      });
    });
  });

  describe("List accessibility", () => {
    it("hat eine list-role mit aria-label", () => {
      useThreadsMock.mockReturnValue({
        threads: [],
        folders: [],
        defaultThreadHasChats: false,
        isLoading: false,
        mutate: mutateMock,
      });
      renderContainer();
      const list = screen.getByRole("list");
      expect(list).toHaveAttribute("aria-label");
    });
  });
});
