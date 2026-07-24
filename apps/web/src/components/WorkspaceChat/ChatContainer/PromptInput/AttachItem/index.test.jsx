// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttachItem from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("react-router", () => ({
  useParams: vi.fn(() => ({})),
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: vi.fn(() => ({ theme: "dark", isLight: false })),
  getStoredTheme: () => "dark",
  resolveDarkMode: () => true,
}));

vi.mock("@/hooks/useDocument", () => ({
  default: vi.fn(() => ({
    document: null,
    isLoading: false,
    refresh: vi.fn(),
  })),
}));

vi.mock("@/hooks/useUser", () => ({
  default: vi.fn(() => ({ user: null })),
}));

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

describe("AttachItem", () => {
  function renderAttachItem(props = {}) {
    return render(<AttachItem workspaceSlug="test-workspace" {...props} />);
  }

  function addDndFileInput() {
    const input = document.createElement("input");
    input.id = "dnd-chat-file-uploader";
    input.type = "file";
    input.hidden = true;
    document.body.appendChild(input);
    return input;
  }

  function removeDndFileInput(input) {
    input?.remove();
  }

  function getTrigger() {
    return screen.getByRole("button", { name: /Attach a file to this chat/i });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Remove any leftover hidden file input we manually injected.
    const leftover = document.getElementById("dnd-chat-file-uploader");
    if (leftover) leftover.remove();
  });

  it("renders the attachment trigger button", () => {
    renderAttachItem();
    const trigger = getTrigger();
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-label", "Attach a file to this chat");
  });

  it("toggles the AddSourceMenu open and closed when the trigger is clicked", async () => {
    const user = userEvent.setup();
    renderAttachItem();
    const trigger = getTrigger();

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await user.click(trigger);
    expect(screen.getByRole("menu", { name: "Add files" })).toBeInTheDocument();

    await user.click(trigger);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("reflects the open state via aria-expanded", async () => {
    const user = userEvent.setup();
    renderAttachItem();
    const trigger = getTrigger();

    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the menu when clicking the backdrop", async () => {
    const user = userEvent.setup();
    renderAttachItem();
    await user.click(getTrigger());
    expect(screen.getByRole("menu")).toBeInTheDocument();

    // The backdrop is the first fixed div in the portal; click on it.
    await user.click(document.body.querySelector(".fixed.inset-0"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu with the Escape key", async () => {
    const user = userEvent.setup();
    renderAttachItem();
    await user.click(getTrigger());
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("triggers the hidden file input when selecting 'Upload from computer'", async () => {
    const user = userEvent.setup();
    const input = addDndFileInput();
    const clickSpy = vi.spyOn(input, "click");
    renderAttachItem();

    await user.click(getTrigger());
    await user.click(
      screen.getByRole("menuitem", { name: /Upload from computer/i }),
    );

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    removeDndFileInput(input);
  });

  it("is focusable and opens the menu via keyboard", async () => {
    const user = userEvent.setup();
    renderAttachItem();
    const trigger = getTrigger();

    await user.tab();
    expect(trigger).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
