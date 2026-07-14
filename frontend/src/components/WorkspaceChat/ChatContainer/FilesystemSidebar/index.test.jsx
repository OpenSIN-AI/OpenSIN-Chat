// SPDX-License-Identifier: MIT
/**
 * Tests for the FilesystemSidebar component.
 * Covers loading, error, empty, and populated states, plus abort on unmount.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { SWRConfig } from "swr";
import FilesystemSidebar from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("react-router-dom", () => ({
  useParams: () => ({ slug: "test-ws" }),
}));

vi.mock("../ChatSidebar", async () => {
  const actual = await vi.importActual("../ChatSidebar");
  return {
    ...actual,
    default: ({ children, isOpen }) =>
      isOpen ? <div data-testid="chat-sidebar">{children}</div> : null,
    useFilesystemSidebar: () => ({
      sidebarOpen: true,
      closeSidebar: vi.fn(),
    }),
  };
});

const defaultFileBrowserState = {
  currentPath: "",
  items: [],
  parentPath: null,
  loading: false,
  error: null,
  selectedFiles: [],
  browse: vi.fn(),
  navigateTo: vi.fn(),
  navigateUp: vi.fn(),
  createDirectory: vi.fn(),
  createFile: vi.fn(),
  deleteItem: vi.fn(),
  toggleFileSelection: vi.fn(),
  clearSelection: vi.fn(),
};

const defaultFilesystemState = {
  data: null,
  loading: false,
  error: null,
  refresh: vi.fn(),
};

let fileBrowserState = { ...defaultFileBrowserState };
let filesystemState = { ...defaultFilesystemState };

vi.mock("@/hooks/useFilesystem", () => ({
  useFilesystem: () => filesystemState,
}));

vi.mock("@/hooks/useConfirm", () => ({
  default: () => vi.fn(() => Promise.resolve(true)),
}));

vi.mock("@/hooks/useFileBrowser", () => ({
  useFileBrowser: () => fileBrowserState,
}));

const Wrapper = ({ children }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
);

function resetMocks() {
  fileBrowserState = { ...defaultFileBrowserState };
  fileBrowserState.browse = vi.fn();
  fileBrowserState.navigateTo = vi.fn();
  fileBrowserState.navigateUp = vi.fn();
  fileBrowserState.createDirectory = vi.fn();
  fileBrowserState.createFile = vi.fn();
  fileBrowserState.deleteItem = vi.fn();
  fileBrowserState.toggleFileSelection = vi.fn();
  fileBrowserState.clearSelection = vi.fn();

  filesystemState = { ...defaultFilesystemState };
  filesystemState.refresh = vi.fn();
}

describe("FilesystemSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing when sidebar is open", () => {
    expect(() =>
      render(<FilesystemSidebar />, { wrapper: Wrapper }),
    ).not.toThrow();
  });

  it("displays loading skeleton when items are loading", () => {
    fileBrowserState.loading = true;
    fileBrowserState.currentPath = "";
    render(<FilesystemSidebar />, { wrapper: Wrapper });
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("displays error message when browse fails", () => {
    fileBrowserState.error = "Connection refused";
    fileBrowserState.currentPath = "";
    render(<FilesystemSidebar />, { wrapper: Wrapper });
    expect(screen.getByText(/Connection refused/i)).toBeInTheDocument();
  });

  it("displays empty state when directory has no items", () => {
    fileBrowserState.loading = false;
    fileBrowserState.error = null;
    fileBrowserState.items = [];
    fileBrowserState.currentPath = "";
    render(<FilesystemSidebar />, { wrapper: Wrapper });
    expect(screen.getByText(/No files yet/i)).toBeInTheDocument();
  });

  it("renders directories and files when items are populated", async () => {
    fileBrowserState.loading = false;
    fileBrowserState.error = null;
    fileBrowserState.currentPath = "";
    fileBrowserState.items = [
      { name: "docs", path: "docs", type: "directory", ext: "", size: 0 },
      {
        name: "report.pdf",
        path: "report.pdf",
        type: "file",
        ext: ".pdf",
        size: 1024,
      },
      {
        name: "notes.txt",
        path: "notes.txt",
        type: "file",
        ext: ".txt",
        size: 512,
      },
    ];
    render(<FilesystemSidebar />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("docs")).toBeInTheDocument();
      expect(screen.getByText("report.pdf")).toBeInTheDocument();
      expect(screen.getByText("notes.txt")).toBeInTheDocument();
    });
  });

  it("renders a directory item when directories are populated", async () => {
    fileBrowserState.items = [
      { name: "mydir", path: "mydir", type: "directory", ext: "", size: 0 },
    ];
    fileBrowserState.currentPath = "";
    render(<FilesystemSidebar />, { wrapper: Wrapper });

    const dirEl = await screen.findByText("mydir");
    expect(dirEl).toBeInTheDocument();
  });

  it("calls toggleFileSelection when a supported file is clicked", async () => {
    fileBrowserState.items = [
      {
        name: "doc.txt",
        path: "doc.txt",
        type: "file",
        ext: ".txt",
        size: 256,
      },
    ];
    fileBrowserState.currentPath = "";
    render(<FilesystemSidebar />, { wrapper: Wrapper });

    const fileEl = await screen.findByText("doc.txt");
    fireEvent.click(fileEl.closest("div"));
    expect(fileBrowserState.toggleFileSelection).toHaveBeenCalled();
  });

  it("calls toggleFileSelection for any file type when clicked", async () => {
    fileBrowserState.items = [
      {
        name: "archive.xyz",
        path: "archive.xyz",
        type: "file",
        ext: ".xyz",
        size: 256,
      },
    ];
    fileBrowserState.currentPath = "";
    render(<FilesystemSidebar />, { wrapper: Wrapper });

    const fileEl = await screen.findByText("archive.xyz");
    fireEvent.click(fileEl.closest("div"));
    expect(fileBrowserState.toggleFileSelection).toHaveBeenCalled();
  });

  it("calls browse on initial mount when sidebar is open and path is null", () => {
    fileBrowserState.currentPath = null;
    render(<FilesystemSidebar />, { wrapper: Wrapper });
    expect(fileBrowserState.browse).toHaveBeenCalledWith("");
  });

  it("calls browse with current path when refresh button is clicked", async () => {
    fileBrowserState.currentPath = "subdir";
    fileBrowserState.loading = false;
    render(<FilesystemSidebar />, { wrapper: Wrapper });

    const refreshBtn = screen.getByLabelText(/refresh|aktualisieren/i);
    fireEvent.click(refreshBtn);
    expect(fileBrowserState.browse).toHaveBeenCalledWith("subdir");
  });

  it("renders system info panel when info button is clicked", async () => {
    filesystemState.data = {
      platform: "linux",
      arch: "x64",
      nodeVersion: "v20.10.0",
      storage: { current: 10, capacity: 50 },
      freeMemMB: 4096,
      totalMemMB: 8192,
      uploadPath: "/data/uploads",
      workDir: "/app",
    };
    render(<FilesystemSidebar />, { wrapper: Wrapper });

    const infoBtn = screen.getByLabelText(/system|systeminfo/i);
    fireEvent.click(infoBtn);

    await waitFor(() => {
      expect(screen.getByText("linux (x64)")).toBeInTheDocument();
      expect(screen.getByText("v20.10.0")).toBeInTheDocument();
    });
  });

  it("disables refresh button while loading", () => {
    fileBrowserState.loading = true;
    fileBrowserState.currentPath = "";
    render(<FilesystemSidebar />, { wrapper: Wrapper });

    const refreshBtn = screen.getByLabelText(/refresh|aktualisieren/i);
    expect(refreshBtn).toBeDisabled();
  });
});
