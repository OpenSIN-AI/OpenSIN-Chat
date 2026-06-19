// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SlashCommandRow from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@phosphor-icons/react/dist/csr/Plus", () => ({
  default: (props) => <svg data-testid="phosphor-plus-icon" {...props} />,
  Plus: (props) => <svg data-testid="phosphor-plus-icon" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/DotsThree", () => ({
  default: (props) => <svg data-testid="dots-three" {...props} />,
  DotsThree: (props) => <svg data-testid="dots-three" {...props} />,
}));

describe("SlashCommandRow", () => {
  const onClick = vi.fn();
  const onEdit = vi.fn();
  const onPublish = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderRow(props = {}) {
    return render(
      <SlashCommandRow
        command="/hello"
        description="Say hello"
        onClick={onClick}
        onEdit={onEdit}
        onPublish={onPublish}
        showMenu={true}
        highlighted={false}
        {...props}
      />,
    );
  }

  it("renders the command and description", () => {
    renderRow();
    expect(screen.getByText("/hello")).toBeInTheDocument();
    expect(screen.getByText("Say hello")).toBeInTheDocument();
  });

  it("calls onClick when the row is clicked", async () => {
    const user = userEvent.setup();
    renderRow();
    await user.click(screen.getByText("/hello"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not render the menu button when showMenu is false", () => {
    renderRow({ showMenu: false });
    expect(screen.queryByTestId("dots-three")).not.toBeInTheDocument();
  });

  it("opens the action menu when the menu button is clicked", async () => {
    const user = userEvent.setup();
    renderRow();
    const menuButton = screen.getByTestId("dots-three").closest("button");
    await user.click(menuButton);
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish" })).toBeInTheDocument();
  });

  it("closes the action menu when clicking outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <SlashCommandRow
          command="/hello"
          description="Say hello"
          onClick={onClick}
          onEdit={onEdit}
          onPublish={onPublish}
          showMenu={true}
        />
        <div data-testid="outside">outside</div>
      </div>,
    );
    const menuButton = screen.getByTestId("dots-three").closest("button");
    await user.click(menuButton);
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();

    await user.click(screen.getByTestId("outside"));
    expect(
      screen.queryByRole("button", { name: "Edit" }),
    ).not.toBeInTheDocument();
  });

  it("calls onEdit when the edit menu item is clicked", async () => {
    const user = userEvent.setup();
    renderRow();
    const menuButton = screen.getByTestId("dots-three").closest("button");
    await user.click(menuButton);
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("calls onPublish when the publish menu item is clicked", async () => {
    const user = userEvent.setup();
    renderRow();
    const menuButton = screen.getByTestId("dots-three").closest("button");
    await user.click(menuButton);
    await user.click(screen.getByRole("button", { name: "Publish" }));
    expect(onPublish).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when interacting with the menu", async () => {
    const user = userEvent.setup();
    renderRow();
    const menuButton = screen.getByTestId("dots-three").closest("button");
    await user.click(menuButton);
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies the highlighted background class when highlighted", () => {
    const { container } = renderRow({ highlighted: true });
    expect(container.firstChild).toHaveClass("bg-zinc-700/50");
  });

  it("does not apply the highlighted background class by default", () => {
    const { container } = renderRow();
    expect(container.firstChild).not.toHaveClass("bg-zinc-700/50");
  });

  it("renders a disabled row without crashing when callbacks are missing", () => {
    render(
      <SlashCommandRow
        command="/minimal"
        description="No callbacks"
        showMenu={false}
      />,
    );
    expect(screen.getByText("/minimal")).toBeInTheDocument();
  });

  it("toggles the menu closed when the menu button is clicked again", async () => {
    const user = userEvent.setup();
    renderRow();
    const menuButton = screen.getByTestId("dots-three").closest("button");
    await user.click(menuButton);
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();

    await user.click(menuButton);
    expect(
      screen.queryByRole("button", { name: "Edit" }),
    ).not.toBeInTheDocument();
  });
});
