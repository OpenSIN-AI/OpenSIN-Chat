// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddSourceMenu from "./index";

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

  it("renders sectioned root menu without stub integrations", () => {
    renderMenu();
    expect(screen.getByText("This chat (temporary)")).toBeInTheDocument();
    expect(
      screen.getByText("Workspace knowledge (permanent)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Upload from computer")).toBeInTheDocument();
    expect(screen.getByText("Add existing document")).toBeInTheDocument();
    expect(screen.getByText("Add from URL")).toBeInTheDocument();
    expect(screen.queryByText(/GitHub/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Bitbucket/i)).not.toBeInTheDocument();
  });

  it("triggers the local file upload handler and closes the menu", () => {
    renderMenu();
    fireEvent.click(screen.getByText("Upload from computer"));
    expect(onAddLocalFiles).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("opens the existing-document submenu and can navigate back", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(
      screen.getByRole("menuitem", { name: /Add existing document/i }),
    );
    expect(screen.getByText("No sources available")).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /^Back$/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: /^Back$/i }));
    expect(
      screen.getByRole("menuitem", { name: /Add existing document/i }),
    ).toBeInTheDocument();
  });

  it("opens the Add from URL submenu", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("menuitem", { name: /Add from URL/i }));
    expect(screen.getByPlaceholderText("https://...")).toBeInTheDocument();
    expect(screen.getByText("Add to workspace")).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /^Back$/i }),
    ).toBeInTheDocument();
  });

  it("has the correct accessibility attributes", () => {
    renderMenu();
    const menu = screen.getByRole("menu");
    expect(menu).toHaveAttribute("aria-label", "Add files");

    const items = screen.getAllByRole("menuitem");
    // Upload + existing document + URL (section labels are not menuitems)
    expect(items).toHaveLength(3);

    expect(
      screen.getByRole("menuitem", { name: /Add existing document/i }),
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
        screen.getByRole("menuitem", { name: /Upload from computer/i }),
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
    const first = screen.getByRole("menuitem", {
      name: /Upload from computer/i,
    });
    const second = screen.getByRole("menuitem", {
      name: /Add existing document/i,
    });
    const third = screen.getByRole("menuitem", { name: /Add from URL/i });

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

  it("selects upload with Enter and closes", async () => {
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
});
