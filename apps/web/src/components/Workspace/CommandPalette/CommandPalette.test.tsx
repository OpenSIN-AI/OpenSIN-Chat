// SPDX-License-Identifier: MIT
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CommandPalette, type CommandItem } from "./CommandPalette";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

const items = (perform = vi.fn()): CommandItem[] => [
  {
    id: "recent",
    group: "recent",
    label: "Alpha document",
    description: "Recently opened",
    keywords: ["first", "document"],
    shortcut: "⌘1",
    perform,
  },
  {
    id: "quick",
    group: "quickActions",
    label: "Create report",
    perform,
  },
  {
    id: "workspace",
    group: "workspaces",
    label: "Research workspace",
    description: "Evidence collection",
    perform,
  },
  {
    id: "navigation",
    group: "navigation",
    label: "Open sources",
    keywords: ["files"],
    perform,
  },
];

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  window.requestAnimationFrame = (callback) => {
    callback(0);
    return 1;
  };
});

describe("CommandPalette", () => {
  beforeEach(() => {
    document.body.style.overflow = "auto";
  });

  it("does not render while closed", () => {
    render(
      <CommandPalette open={false} onOpenChange={vi.fn()} items={items()} />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("groups items, filters all searchable fields and shows empty state", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <CommandPalette open onOpenChange={vi.fn()} items={items()} />,
    );

    expect(screen.getAllByRole("option")).toHaveLength(4);
    expect(document.body.style.overflow).toBe("hidden");
    const input = screen.getByRole("combobox");

    await user.type(input, "Evidence");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByText("Research workspace")).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "files");
    expect(screen.getByText("Open sources")).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "not-found");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("No results found")).toBeInTheDocument();

    rerender(
      <CommandPalette open={false} onOpenChange={vi.fn()} items={items()} />,
    );
    expect(document.body.style.overflow).toBe("auto");
  });

  it("supports arrows, tab wrapping, mouse selection and enter execution", async () => {
    const perform = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CommandPalette
        open
        onOpenChange={onOpenChange}
        items={items(perform)}
      />,
    );
    const input = screen.getByRole("combobox");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", "command-quick");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input).toHaveAttribute("aria-activedescendant", "command-recent");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input).toHaveAttribute(
      "aria-activedescendant",
      "command-navigation",
    );
    fireEvent.keyDown(input, { key: "Tab" });
    expect(input).toHaveAttribute("aria-activedescendant", "command-recent");
    fireEvent.keyDown(input, { key: "Tab", shiftKey: true });
    expect(input).toHaveAttribute(
      "aria-activedescendant",
      "command-navigation",
    );

    await user.hover(screen.getByRole("option", { name: /Create report/i }));
    expect(input).toHaveAttribute("aria-activedescendant", "command-quick");
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(perform).toHaveBeenCalledTimes(1));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("executes clicks and closes through escape or backdrop", async () => {
    const perform = vi.fn();
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <CommandPalette
        open
        onOpenChange={onOpenChange}
        items={items(perform)}
      />,
    );

    await user.click(screen.getByRole("option", { name: /Alpha document/i }));
    expect(perform).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);

    const backdrop = container.firstElementChild as HTMLElement;
    fireEvent.mouseDown(backdrop);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    fireEvent.mouseDown(screen.getByRole("dialog"));
  });

  it("ignores IME composition and handles empty keyboard navigation", () => {
    const onOpenChange = vi.fn();
    render(<CommandPalette open onOpenChange={onOpenChange} items={[]} />);
    const input = screen.getByRole("combobox");

    fireEvent.keyDown(input, { key: "Escape", keyCode: 229 });
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "Tab" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
