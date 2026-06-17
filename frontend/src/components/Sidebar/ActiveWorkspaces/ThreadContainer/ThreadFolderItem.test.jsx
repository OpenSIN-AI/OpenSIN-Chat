// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@dnd-kit/core", () => ({
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false,
  }),
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  }),
  useSensors: vi.fn(() => ({})),
  useSensor: vi.fn(() => ({})),
  PointerSensor: vi.fn(),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Translate: { toString: () => undefined } },
}));

const navigateMock = vi.fn();
const invalidateThreadsMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/hooks/useThreads", () => ({
  default: vi.fn(() => ({
    data: { threads: [] },
    isLoading: false,
    mutate: vi.fn(),
  })),
  invalidateThreads: (...args) => invalidateThreadsMock(...args),
}));

vi.mock("@/utils/toast", () => ({
  default: vi.fn(),
}));

const newThreadMock = vi.fn(() =>
  Promise.resolve({ thread: { slug: "fresh-thread" }, message: null }),
);
const newFolderMock = vi.fn(() =>
  Promise.resolve({ folder: { id: 99, name: "New Folder" }, message: null }),
);
const updateFolderMock = vi.fn(() =>
  Promise.resolve({ folder: { id: 1, name: "Renamed" }, message: null }),
);
const deleteFolderMock = vi.fn(() => Promise.resolve(true));

vi.mock("@/models/workspace", () => ({
  default: {
    threads: {
      new: (...args) => newThreadMock(...args),
      folders: {
        new: (...args) => newFolderMock(...args),
        update: (...args) => updateFolderMock(...args),
        delete: (...args) => deleteFolderMock(...args),
        assignThread: vi.fn(() => Promise.resolve(true)),
      },
    },
  },
}));

import ThreadFolderItem from "@/components/Sidebar/ActiveWorkspaces/ThreadContainer/ThreadFolderItem";

const baseFolder = { id: 1, name: "My Folder" };
const baseWorkspace = { slug: "my-workspace" };

function renderFolderItem({
  folder = baseFolder,
  workspace = baseWorkspace,
  threads = [],
  activeThreadIdx = -1,
  ctrlPressed = false,
  onRemoveThread = vi.fn(),
  onFolderDeleted = vi.fn(),
  onFolderRenamed = vi.fn(),
  initialPath = "/workspace/my-workspace",
} = {}) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="*"
          element={
            <ThreadFolderItem
              folder={folder}
              workspace={workspace}
              threads={threads}
              activeThreadIdx={activeThreadIdx}
              ctrlPressed={ctrlPressed}
              onRemoveThread={onRemoveThread}
              onFolderDeleted={onFolderDeleted}
              onFolderRenamed={onFolderRenamed}
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  newThreadMock.mockResolvedValue({
    thread: { slug: "fresh-thread" },
    message: null,
  });
  newFolderMock.mockResolvedValue({
    folder: { id: 99, name: "New Folder" },
    message: null,
  });
  updateFolderMock.mockResolvedValue({
    folder: { id: 1, name: "Renamed" },
    message: null,
  });
  deleteFolderMock.mockResolvedValue(true);
});

describe("ThreadFolderItem", () => {
  it("renders the folder name and the thread count", () => {
    renderFolderItem({ threads: [{}, {}, {}] });
    expect(screen.getByText(/my folder/i)).toBeInTheDocument();
    expect(screen.getByText("(3)")).toBeInTheDocument();
  });

  it("collapses the folder body when the header is clicked", () => {
    renderFolderItem({ threads: [{ slug: "t-1", name: "Inside" }] });
    expect(screen.getByText(/inside/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /my folder/i }));
    expect(screen.queryByText(/inside/i)).not.toBeInTheDocument();
  });

  it("expands again on a second click", () => {
    const threads = [{ slug: "t-1", name: "Inside" }];
    renderFolderItem({ threads });
    const header = screen.getByRole("button", { name: /my folder/i });
    fireEvent.click(header);
    fireEvent.click(header);
    expect(screen.getByText(/inside/i)).toBeInTheDocument();
  });

  it("renders the empty hint when the folder has no threads and is open", () => {
    renderFolderItem({ threads: [] });
    expect(screen.getByText(/drag here/i)).toBeInTheDocument();
  });

  it("renders child ThreadItems for the folder's threads", () => {
    const threads = [
      { slug: "t-1", name: "First" },
      { slug: "t-2", name: "Second" },
    ];
    renderFolderItem({ threads });
    expect(screen.getByText(/first/i)).toBeInTheDocument();
    expect(screen.getByText(/second/i)).toBeInTheDocument();
  });

  it("opens the quick-add dropdown when the + button is clicked", () => {
    renderFolderItem();
    fireEvent.click(screen.getByTitle(/create new chat or folder/i));
    expect(screen.getByText(/^new chat$/i)).toBeInTheDocument();
    expect(screen.getByText(/^new folder$/i)).toBeInTheDocument();
  });

  it("'Neuer Chat' (in the quick-add menu) creates a thread and navigates", async () => {
    renderFolderItem();
    fireEvent.click(screen.getByTitle(/create new chat or folder/i));
    fireEvent.click(screen.getByText(/^new chat$/i));
    await vi.waitFor(() => {
      expect(newThreadMock).toHaveBeenCalledWith("my-workspace");
    });
    await vi.waitFor(() => {
      expect(invalidateThreadsMock).toHaveBeenCalledWith("my-workspace");
    });
    expect(navigateMock).toHaveBeenCalledWith(
      "/workspace/my-workspace/t/fresh-thread",
    );
  });

  it("'Neuer Ordner' (in the quick-add menu) creates a new folder", async () => {
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Project");
    renderFolderItem();
    fireEvent.click(screen.getByTitle(/create new chat or folder/i));
    fireEvent.click(screen.getByText(/^new folder$/i));
    await vi.waitFor(() => {
      expect(newFolderMock).toHaveBeenCalledWith("my-workspace", "Project");
    });
    expect(invalidateThreadsMock).toHaveBeenCalledWith("my-workspace");
    promptSpy.mockRestore();
  });

  it("enters rename mode when the pencil button is clicked", () => {
    renderFolderItem();
    fireEvent.click(screen.getByTitle(/rename/i));
    const input = document.querySelector("input");
    expect(input).toBeInTheDocument();
    expect(input.value).toBe("My Folder");
  });

  it("commits a rename on Enter and calls folders.update", async () => {
    const onFolderRenamed = vi.fn();
    renderFolderItem({ onFolderRenamed });
    fireEvent.click(screen.getByTitle(/rename/i));
    const input = document.querySelector("input");
    fireEvent.change(input, { target: { value: "  Renamed  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    await vi.waitFor(() => {
      expect(updateFolderMock).toHaveBeenCalledWith("my-workspace", 1, {
        name: "Renamed",
      });
    });
    expect(onFolderRenamed).toHaveBeenCalledWith(1, "Renamed");
    expect(invalidateThreadsMock).toHaveBeenCalledWith("my-workspace");
  });

  it("cancels a rename on Escape without calling folders.update", async () => {
    const onFolderRenamed = vi.fn();
    renderFolderItem({ onFolderRenamed });
    fireEvent.click(screen.getByTitle(/rename/i));
    const input = document.querySelector("input");
    fireEvent.change(input, { target: { value: "should not stick" } });
    fireEvent.keyDown(input, { key: "Escape" });
    await Promise.resolve();
    expect(updateFolderMock).not.toHaveBeenCalled();
    expect(onFolderRenamed).not.toHaveBeenCalled();
  });

  it("does not call folders.update when the rename is empty or unchanged", async () => {
    renderFolderItem();
    fireEvent.click(screen.getByTitle(/rename/i));
    const input = document.querySelector("input");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await Promise.resolve();
    expect(updateFolderMock).not.toHaveBeenCalled();
  });

  it("asks for confirmation and calls folders.delete on confirm", async () => {
    const onFolderDeleted = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderFolderItem({ onFolderDeleted });
    fireEvent.click(screen.getByTitle(/delete/i));
    await vi.waitFor(() => {
      expect(deleteFolderMock).toHaveBeenCalledWith("my-workspace", 1);
    });
    expect(onFolderDeleted).toHaveBeenCalledWith(1);
    expect(invalidateThreadsMock).toHaveBeenCalledWith("my-workspace");
    confirmSpy.mockRestore();
  });

  it("aborts the delete when the user cancels the confirm dialog", async () => {
    const onFolderDeleted = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderFolderItem({ onFolderDeleted });
    fireEvent.click(screen.getByTitle(/delete/i));
    await Promise.resolve();
    expect(deleteFolderMock).not.toHaveBeenCalled();
    expect(onFolderDeleted).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
