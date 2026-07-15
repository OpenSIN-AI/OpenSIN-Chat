// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// Stub dnd-kit so we don't need a real DndContext
vi.mock("@dnd-kit/core", () => ({
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

// Stub the scroll hook to be a no-op
vi.mock("@/hooks/useScrollActiveItemIntoView", () => ({
  default: () => ({ ref: vi.fn() }),
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
  Promise.resolve({ thread: { slug: "new-thread" }, message: null }),
);
const updateThreadMock = vi.fn(() =>
  Promise.resolve({ thread: {}, message: null }),
);
const deleteThreadMock = vi.fn(() => Promise.resolve(true));

vi.mock("@/models/workspace", () => ({
  default: {
    threads: {
      new: (...args) => newThreadMock(...args),
      update: (...args) => updateThreadMock(...args),
      delete: (...args) => deleteThreadMock(...args),
    },
  },
}));

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

const confirmMock = vi.fn(() => Promise.resolve(true));
vi.mock("@/hooks/useConfirm", () => ({
  default: () => confirmMock,
}));

import ThreadItem from "@/components/Sidebar/ActiveWorkspaces/ThreadContainer/ThreadItem";

const baseWorkspace = { slug: "my-workspace" };
const baseThread = { id: 1, slug: "thread-1", name: "Thread 1" };

function renderThreadItem(
  props = {},
  { initialPath = "/workspace/my-workspace/t/thread-1" } = {},
) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="*"
          element={
            <ThreadItem
              idx={0}
              activeIdx={-1}
              isActive={false}
              workspace={baseWorkspace}
              thread={baseThread}
              onRemove={vi.fn()}
              toggleMarkForDeletion={vi.fn()}
              {...props}
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  confirmMock.mockResolvedValue(true);
  newThreadMock.mockResolvedValue({
    thread: { slug: "new-thread" },
    message: null,
  });
  updateThreadMock.mockResolvedValue({ thread: {}, message: null });
  deleteThreadMock.mockResolvedValue(true);
  // jsdom doesn't ship a working clipboard; provide a stub
  if (!navigator.clipboard) {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn(() => Promise.resolve()) },
      writable: true,
      configurable: true,
    });
  }
});

describe("ThreadItem", () => {
  it("renders the thread name as a link to the thread page", () => {
    renderThreadItem();
    const link = screen.getByRole("link", { name: /thread 1/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe(
      "/workspace/my-workspace/t/thread-1",
    );
  });

  it("marks itself as aria-current=page when isActive is true", () => {
    renderThreadItem({ isActive: true });
    const link = screen.getByRole("link", { name: /thread 1/i });
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("links to the workspace chat (no thread slug) when the thread has no slug", () => {
    renderThreadItem({ thread: { id: 1, name: "no-slug" } });
    const link = screen.getByRole("link", { name: /no-slug/i });
    expect(link.getAttribute("href")).toBe("/workspace/my-workspace");
  });

  it("renders a deleted thread as plain text, not a link", () => {
    renderThreadItem({ thread: { ...baseThread, deleted: true } });
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(/deleted thread/i)).toBeInTheDocument();
  });

  it("shows the restore button for deleted threads when ctrlPressed is true", () => {
    const toggleMarkForDeletion = vi.fn();
    renderThreadItem({
      thread: { ...baseThread, deleted: true },
      ctrlPressed: true,
      toggleMarkForDeletion,
    });
    const restoreBtn = screen.getByRole("button");
    fireEvent.click(restoreBtn);
    expect(toggleMarkForDeletion).toHaveBeenCalledWith(1);
  });

  it("hides the options dots button for virtual threads", () => {
    renderThreadItem({ thread: { ...baseThread, virtual: true } });
    expect(
      screen.queryByRole("button", { name: /thread options/i }),
    ).not.toBeInTheDocument();
  });

  it("hides the options dots button for deleted threads", () => {
    renderThreadItem({ thread: { ...baseThread, deleted: true } });
    expect(
      screen.queryByRole("button", { name: /thread options/i }),
    ).not.toBeInTheDocument();
  });

  it("shows an X (mark for deletion) button when ctrlPressed is true", () => {
    const toggleMarkForDeletion = vi.fn();
    renderThreadItem({ ctrlPressed: true, toggleMarkForDeletion });
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    expect(toggleMarkForDeletion).toHaveBeenCalledWith(1);
  });

  it("opens the options menu when the dots button is clicked", () => {
    renderThreadItem();
    const dotsBtn = screen.getByRole("button", { name: /thread options/i });
    fireEvent.click(dotsBtn);
    expect(screen.getByText(/new chat/i)).toBeInTheDocument();
    expect(screen.getByText(/copy link/i)).toBeInTheDocument();
    expect(screen.getByText(/rename/i)).toBeInTheDocument();
    expect(screen.getByText(/delete thread/i)).toBeInTheDocument();
  });

  it("'New Chat' creates a new thread and navigates to it", async () => {
    renderThreadItem();
    fireEvent.click(screen.getByRole("button", { name: /thread options/i }));
    fireEvent.click(screen.getByText(/new chat/i));
    await vi.waitFor(() => {
      expect(newThreadMock).toHaveBeenCalledWith("my-workspace");
    });
    expect(invalidateThreadsMock).toHaveBeenCalledWith("my-workspace");
    expect(navigateMock).toHaveBeenCalledWith(
      "/workspace/my-workspace/t/new-thread",
    );
  });

  it("'Copy Link' copies the thread link to the clipboard", async () => {
    const writeTextSpy = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue();
    renderThreadItem();
    fireEvent.click(screen.getByRole("button", { name: /thread options/i }));
    fireEvent.click(screen.getByText(/copy link/i));
    await vi.waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalled();
    });
    const url = writeTextSpy.mock.calls[0][0];
    expect(url).toMatch(/\/workspace\/my-workspace\/t\/thread-1$/);
  });

  it("'Rename' opens a prompt and calls Workspace.threads.update", async () => {
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("New name");
    renderThreadItem();
    fireEvent.click(screen.getByRole("button", { name: /thread options/i }));
    fireEvent.click(screen.getByText(/rename/i));
    await vi.waitFor(() => {
      expect(updateThreadMock).toHaveBeenCalledWith(
        "my-workspace",
        "thread-1",
        { name: "New name" },
      );
    });
    expect(invalidateThreadsMock).toHaveBeenCalledWith("my-workspace");
    promptSpy.mockRestore();
  });

  it("'Delete Thread' asks for confirmation and calls Workspace.threads.delete", async () => {
    const onRemove = vi.fn();
    confirmMock.mockResolvedValue(true);
    renderThreadItem({ onRemove });
    fireEvent.click(screen.getByRole("button", { name: /thread options/i }));
    fireEvent.click(screen.getByText(/delete thread/i));
    await vi.waitFor(() => {
      expect(deleteThreadMock).toHaveBeenCalledWith("my-workspace", "thread-1");
    });
    expect(onRemove).toHaveBeenCalledWith(1);
    expect(invalidateThreadsMock).toHaveBeenCalledWith("my-workspace");
  });

  it("'Delete Thread' aborts when the user cancels the confirm dialog", async () => {
    const onRemove = vi.fn();
    confirmMock.mockResolvedValue(false);
    renderThreadItem({ onRemove });
    fireEvent.click(screen.getByRole("button", { name: /thread options/i }));
    fireEvent.click(screen.getByText(/delete thread/i));
    await Promise.resolve();
    expect(deleteThreadMock).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
  });
});
