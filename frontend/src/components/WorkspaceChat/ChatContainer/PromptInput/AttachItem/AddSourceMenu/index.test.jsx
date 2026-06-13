// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  within,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddSourceMenu from "./index";
import showToast from "@/utils/toast";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@/utils/toast", () => ({
  default: vi.fn(),
}));

vi.mock("@/hooks/useDocuments", () => ({
  default: vi.fn(() => ({
    documents: null,
    isLoading: false,
    mutate: vi.fn(),
  })),
}));

describe("AddSourceMenu", () => {
  const onAddLocalFiles = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderMenu(props = {}) {
    return render(
      <AddSourceMenu
        workspaceSlug="test-workspace"
        onClose={onClose}
        onAddLocalFiles={onAddLocalFiles}
        {...props}
      />,
    );
  }

  function renderWithTrigger(props = {}) {
    return render(
      <AddSourceMenu
        workspaceSlug="test-workspace"
        onClose={onClose}
        onAddLocalFiles={onAddLocalFiles}
        trigger={<button type="button">Open menu</button>}
        {...props}
      />,
    );
  }

  it("renders the v0-style root menu items", () => {
    renderMenu();
    expect(screen.getByText("Import from GitHub")).toBeInTheDocument();
    expect(screen.getByText("Create from Bitbucket")).toBeInTheDocument();
    expect(screen.getByText("Upload from computer")).toBeInTheDocument();
    expect(screen.getByText("Current sources")).toBeInTheDocument();
    expect(screen.getByText("Add from URL")).toBeInTheDocument();
  });

  it("triggers the local file upload handler and closes the menu", () => {
    renderMenu();
    fireEvent.click(screen.getByText("Upload from computer"));
    expect(onAddLocalFiles).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows a coming-soon toast for the Bitbucket placeholder", () => {
    renderMenu();
    fireEvent.click(screen.getByText("Create from Bitbucket"));
    expect(showToast).toHaveBeenCalledWith(
      "Bitbucket integration coming soon",
      "info",
    );
  });

  it("renders the Bitbucket SVG icon on the Bitbucket row", () => {
    renderMenu();
    const row = screen.getByRole("menuitem", {
      name: /Create from Bitbucket/i,
    });
    expect(within(row).getByTestId("bitbucket-icon")).toBeInTheDocument();
    expect(row.querySelector("svg")).toBeInTheDocument();
  });

  it("shows a coming-soon toast for the GitHub placeholder and does not trigger upload", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(
      screen.getByRole("menuitem", { name: /Import from GitHub/i }),
    );
    expect(showToast).toHaveBeenCalledWith(
      "GitHub integration coming soon",
      "info",
    );
    expect(onAddLocalFiles).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("opens the Current sources submenu and can navigate back", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(
      screen.getByRole("menuitem", { name: /Current sources/i }),
    );
    expect(screen.getByText("No sources available")).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /^Back$/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: /^Back$/i }));
    expect(
      screen.getByRole("menuitem", { name: /Current sources/i }),
    ).toBeInTheDocument();
  });

  it("opens the Add from URL submenu", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("menuitem", { name: /Add from URL/i }));
    expect(screen.getByPlaceholderText("https://...")).toBeInTheDocument();
    expect(screen.getByText("Add source")).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /^Back$/i }),
    ).toBeInTheDocument();
  });

  it("has the correct accessibility attributes", () => {
    renderMenu();
    const menu = screen.getByRole("menu");
    expect(menu).toHaveAttribute("aria-label", "Add files");

    const items = screen.getAllByRole("menuitem");
    expect(items).toHaveLength(5);

    expect(
      screen.getByRole("menuitem", { name: /Current sources/i }),
    ).toHaveAttribute("aria-haspopup", "true");
    expect(
      screen.getByRole("menuitem", { name: /Add from URL/i }),
    ).toHaveAttribute("aria-haspopup", "true");
  });

  it("does not render menu items when the menu is closed", () => {
    renderWithTrigger();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
  });

  it("disables the trigger when the component is disabled", () => {
    renderWithTrigger({ disabled: true });
    expect(screen.getByText("Open menu")).toBeDisabled();
  });

  it("opens and closes the menu when the trigger is clicked", async () => {
    const user = userEvent.setup();
    renderWithTrigger();
    await user.click(screen.getByText("Open menu"));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByText("Open menu"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes the menu when clicking outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <AddSourceMenu
          workspaceSlug="test-workspace"
          onClose={onClose}
          onAddLocalFiles={onAddLocalFiles}
          trigger={<button type="button">Open menu</button>}
        />
        <div data-testid="outside">outside</div>
      </div>,
    );

    await user.click(screen.getByText("Open menu"));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByTestId("outside"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes the menu with the Escape key", async () => {
    const user = userEvent.setup();
    renderWithTrigger();
    await user.click(screen.getByText("Open menu"));
    await waitFor(() =>
      expect(
        screen.getByRole("menuitem", { name: /Import from GitHub/i }),
      ).toHaveFocus(),
    );

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("moves focus between menu items with ArrowDown/ArrowUp", async () => {
    const user = userEvent.setup();
    renderWithTrigger();
    await user.click(screen.getByText("Open menu"));
    const first = screen.getByRole("menuitem", { name: /Import from GitHub/i });
    const second = screen.getByRole("menuitem", {
      name: /Create from Bitbucket/i,
    });
    const third = screen.getByRole("menuitem", {
      name: /Upload from computer/i,
    });

    await waitFor(() => expect(first).toHaveFocus());

    await user.keyboard("{ArrowDown}");
    expect(second).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(third).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(second).toHaveFocus();
  });

  it("traps Tab inside the menu", async () => {
    const user = userEvent.setup();
    renderWithTrigger();
    await user.click(screen.getByText("Open menu"));
    const items = screen.getAllByRole("menuitem");
    items[items.length - 1].focus();

    await user.keyboard("{Tab}");
    expect(items[0]).toHaveFocus();
  });

  it("selects an item with the Enter key", async () => {
    const user = userEvent.setup();
    renderWithTrigger();
    await user.click(screen.getByText("Open menu"));
    const upload = screen.getByRole("menuitem", {
      name: /Upload from computer/i,
    });
    upload.focus();

    await user.keyboard("{Enter}");
    expect(onAddLocalFiles).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("selects an item with the Space key", async () => {
    const user = userEvent.setup();
    renderWithTrigger();
    await user.click(screen.getByText("Open menu"));
    const bitbucket = screen.getByRole("menuitem", {
      name: /Create from Bitbucket/i,
    });
    bitbucket.focus();

    await user.keyboard(" ");
    expect(showToast).toHaveBeenCalledWith(
      "Bitbucket integration coming soon",
      "info",
    );
  });

  it("triggers the upload handler from the keyboard without opening the submenus", async () => {
    const user = userEvent.setup();
    renderWithTrigger();
    await user.click(screen.getByText("Open menu"));
    const upload = screen.getByRole("menuitem", {
      name: /Upload from computer/i,
    });
    upload.focus();

    await user.keyboard("{Enter}");
    expect(onAddLocalFiles).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(showToast).not.toHaveBeenCalled();
  });
});
