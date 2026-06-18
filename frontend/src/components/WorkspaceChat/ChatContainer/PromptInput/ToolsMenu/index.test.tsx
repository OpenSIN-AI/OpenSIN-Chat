// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ToolsMenu, { TOOLS_MENU_KEYBOARD_EVENT } from "./index";
import useUser from "@/hooks/useUser";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@/hooks/useUser", () => ({
  default: vi.fn(() => ({ user: null })),
}));

vi.mock("./Tabs/SlashCommands", () => ({
  default: function SlashCommandsTab({
    sendCommand,
    setShowing,
    promptRef,
    highlightedIndex,
    registerItemCount,
  }) {
    // Register two items so keyboard navigation has something to iterate over.
    registerItemCount(2);
    return (
      <div data-testid="slash-commands-tab">
        <span data-testid="highlighted-index">{highlightedIndex}</span>
        <button
          data-testid="slash-use"
          type="button"
          onClick={() => {
            sendCommand({ text: "/reset", autoSubmit: true });
            setShowing(false);
          }}
        >
          Use slash command
        </button>
      </div>
    );
  },
}));

vi.mock("./Tabs/AgentSkills", () => ({
  default: function AgentSkillsTab({ registerItemCount }) {
    registerItemCount(1);
    return <div data-testid="agent-skills-tab">Agent skills</div>;
  },
}));

describe("ToolsMenu", () => {
  const sendCommand = vi.fn();
  const setShowing = vi.fn();
  const promptRef = { current: { focus: vi.fn() } };
  const highlightedIndexRef = { current: -1 };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUser).mockReturnValue({ user: null });
    highlightedIndexRef.current = -1;
  });

  afterEach(() => {
    // Clean up any portal/backdrop remnants left in document.body.
    document.body.innerHTML = "";
  });

  function renderMenu(props = {}) {
    return render(
      <ToolsMenu
        workspace={{}}
        showing={true}
        setShowing={setShowing}
        sendCommand={sendCommand}
        promptRef={promptRef}
        highlightedIndexRef={highlightedIndexRef}
        {...props}
      />,
    );
  }

  async function dispatchToolsKeyboard(key) {
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(TOOLS_MENU_KEYBOARD_EVENT, { detail: { key } }),
      );
    });
  }

  it("renders nothing when not showing", () => {
    const { container } = renderMenu({ showing: false });
    expect(container.firstChild).toBeNull();
  });

  it("renders the slash commands tab by default", () => {
    renderMenu();
    expect(screen.getByTestId("slash-commands-tab")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Slash Commands" })).toHaveClass(
      "bg-zinc-700",
    );
  });

  it("switches to the agent skills tab when clicked", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: "Agent Skills" }));
    expect(screen.getByTestId("agent-skills-tab")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agent Skills" })).toHaveClass(
      "bg-zinc-700",
    );
  });

  it("cycles tabs with ArrowLeft and ArrowRight keyboard events", async () => {
    renderMenu();
    expect(screen.getByTestId("slash-commands-tab")).toBeInTheDocument();

    await dispatchToolsKeyboard("ArrowRight");
    await waitFor(() =>
      expect(screen.getByTestId("agent-skills-tab")).toBeInTheDocument(),
    );

    await dispatchToolsKeyboard("ArrowRight");
    await waitFor(() =>
      expect(screen.getByTestId("slash-commands-tab")).toBeInTheDocument(),
    );

    await dispatchToolsKeyboard("ArrowLeft");
    await waitFor(() =>
      expect(screen.getByTestId("agent-skills-tab")).toBeInTheDocument(),
    );
  });

  it("does not render the agent skills tab for non-admin users in multi-user mode", () => {
    vi.mocked(useUser).mockReturnValue({ user: { role: "user" } });
    renderMenu();
    expect(
      screen.queryByRole("button", { name: "Agent Skills" }),
    ).not.toBeInTheDocument();
  });

  it("closes when clicking the backdrop", async () => {
    const user = userEvent.setup();
    renderMenu();
    const backdrop = document.body.querySelector(".fixed.inset-0");
    expect(backdrop).toBeInTheDocument();
    await user.click(backdrop);
    expect(setShowing).toHaveBeenCalledWith(false);
  });

  it("keeps the popover open when clicking inside it", async () => {
    const user = userEvent.setup();
    renderMenu();
    const popover = screen.getByTestId("slash-commands-tab").parentElement;
    await user.click(popover);
    expect(setShowing).not.toHaveBeenCalled();
  });

  it("resets active tab to slash commands when reopened", async () => {
    const { rerender } = renderMenu();
    await dispatchToolsKeyboard("ArrowRight");
    await waitFor(() =>
      expect(screen.getByTestId("agent-skills-tab")).toBeInTheDocument(),
    );

    rerender(
      <ToolsMenu
        workspace={{}}
        showing={false}
        setShowing={setShowing}
        sendCommand={sendCommand}
        promptRef={promptRef}
        highlightedIndexRef={highlightedIndexRef}
      />,
    );
    rerender(
      <ToolsMenu
        workspace={{}}
        showing={true}
        setShowing={setShowing}
        sendCommand={sendCommand}
        promptRef={promptRef}
        highlightedIndexRef={highlightedIndexRef}
      />,
    );
    expect(screen.getByTestId("slash-commands-tab")).toBeInTheDocument();
  });

  it("navigates items with ArrowUp and ArrowDown", async () => {
    renderMenu();
    expect(screen.getByTestId("highlighted-index").textContent).toBe("-1");

    await dispatchToolsKeyboard("ArrowDown");
    await waitFor(() =>
      expect(screen.getByTestId("highlighted-index").textContent).toBe("0"),
    );

    await dispatchToolsKeyboard("ArrowDown");
    await waitFor(() =>
      expect(screen.getByTestId("highlighted-index").textContent).toBe("1"),
    );

    await dispatchToolsKeyboard("ArrowDown");
    // Wraps back to the first item.
    await waitFor(() =>
      expect(screen.getByTestId("highlighted-index").textContent).toBe("0"),
    );

    await dispatchToolsKeyboard("ArrowUp");
    // Wraps back to the last item.
    await waitFor(() =>
      expect(screen.getByTestId("highlighted-index").textContent).toBe("1"),
    );
  });

  it("syncs highlighted index to the parent ref", async () => {
    renderMenu();
    await dispatchToolsKeyboard("ArrowDown");
    await waitFor(() => expect(highlightedIndexRef.current).toBe(0));
  });

  it("resets highlight when switching tabs", async () => {
    renderMenu();
    await dispatchToolsKeyboard("ArrowDown");
    await waitFor(() =>
      expect(screen.getByTestId("highlighted-index").textContent).toBe("0"),
    );

    fireEvent.click(screen.getByRole("button", { name: "Agent Skills" }));
    // The new tab mock registers count 1, index is reset to -1 by the parent.
    await waitFor(() =>
      expect(screen.queryByTestId("highlighted-index")).not.toBeInTheDocument(),
    );
  });

  it("forwards sendCommand and setShowing to the active tab", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByTestId("slash-use"));
    expect(sendCommand).toHaveBeenCalledWith({
      text: "/reset",
      autoSubmit: true,
    });
    expect(setShowing).toHaveBeenCalledWith(false);
  });

  it("uses centered layout class when centered prop is true", () => {
    const { container } = renderMenu({ centered: true });
    const popover = container.querySelector(".z-50");
    expect(popover).toHaveClass("top-full");
  });

  it("uses bottom layout class when centered prop is false", () => {
    const { container } = renderMenu({ centered: false });
    const popover = container.querySelector(".z-50");
    expect(popover).toHaveClass("bottom-full");
  });
});
