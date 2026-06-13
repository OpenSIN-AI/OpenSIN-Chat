// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@phosphor-icons/react", () => ({
  X: ({ size, "aria-hidden": ariaHidden, className }) => (
    <svg
      data-testid="x-icon"
      data-size={size}
      className={className}
      aria-hidden={ariaHidden}
    />
  ),
  CaretRight: ({ size }) => (
    <svg data-testid="caret-right-icon" data-size={size} />
  ),
}));


vi.mock("@/utils/paths", () => ({
  default: {
    communityHub: {
      viewItem: (type, id) => `https://hub.example.com/i/${type}/${id}`,
      authentication: () => "/settings/community-hub/authentication",
    },
  },
}));

vi.mock("@/utils/toast", () => ({
  default: vi.fn(),
}));

vi.mock("@/models/communityHub", () => ({
  default: {
    createSystemPrompt: vi.fn(),
    createAgentFlow: vi.fn(),
    createSlashCommand: vi.fn(),
  },
}));

vi.mock("@/components/ModalWrapper", () => ({
  default: ({ isOpen, children }) =>
    isOpen ? <div data-testid="modal-wrapper">{children}</div> : null,
}));

vi.mock("@/hooks/useCommunityHubAuth", () => ({
  default: vi.fn(),
}));

vi.mock("@/pages/Admin/AgentBuilder/BlockList", () => ({
  BLOCK_INFO: {
    "text-prompt": {
      label: "Text Prompt",
      icon: <svg data-testid="block-icon" />,
      getSummary: () => "Sample summary text",
    },
  },
}));

import PublishEntityModal from "./index";
import useCommunityHubAuth from "@/hooks/useCommunityHubAuth";
import CommunityHub from "@/models/communityHub";
import showToast from "@/utils/toast";

const renderModal = (props) =>
  render(
    <MemoryRouter>
      <PublishEntityModal {...props} />
    </MemoryRouter>,
  );

describe("PublishEntityModal - wrapper behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when show is false", () => {
    useCommunityHubAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });
    const { container } = renderModal({
      show: false,
      onClose: vi.fn(),
      entityType: "system-prompt",
      entity: "",
    });
    expect(container.innerHTML).toBe("");
  });

  it("returns null while auth is loading", () => {
    useCommunityHubAuth.mockReturnValue({
      isAuthenticated: false,
      loading: true,
    });
    const { container } = renderModal({
      show: true,
      onClose: vi.fn(),
      entityType: "system-prompt",
      entity: "",
    });
    expect(container.innerHTML).toBe("");
  });

  it("shows unauthenticated modal when not authenticated", () => {
    useCommunityHubAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
    });
    renderModal({
      show: true,
      onClose: vi.fn(),
      entityType: "system-prompt",
      entity: "",
    });
    expect(
      screen.getByText("Authentication Required"),
    ).toBeInTheDocument();
  });

  it("renders close button with type=button and aria-label", () => {
    useCommunityHubAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });
    renderModal({
      show: true,
      onClose: vi.fn(),
      entityType: "system-prompt",
      entity: "",
    });
    const closeButton = screen.getByRole("button", { name: "Close" });
    expect(closeButton).toHaveAttribute("type", "button");
    expect(closeButton).toHaveAttribute("aria-label", "Close");
  });

  it("marks close X icon as aria-hidden", () => {
    useCommunityHubAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });
    renderModal({
      show: true,
      onClose: vi.fn(),
      entityType: "system-prompt",
      entity: "",
    });
    const xIcons = screen.getAllByTestId("x-icon");
    expect(xIcons.length).toBeGreaterThan(0);
    xIcons.forEach((icon) => {
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("calls onClose when close button is clicked", () => {
    useCommunityHubAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });
    const onClose = vi.fn();
    renderModal({
      show: true,
      onClose,
      entityType: "system-prompt",
      entity: "",
    });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("PublishEntityModal - SystemPrompts form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCommunityHubAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });
  });

  it("renders system prompt modal title and fields", () => {
    renderModal({
      show: true,
      onClose: vi.fn(),
      entityType: "system-prompt",
      entity: "You are a helpful assistant.",
    });
    expect(
      screen.getByText("Publish System Prompt"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        "My System Prompt",
      ),
    ).toBeInTheDocument();
  });

  it("adds a tag when Enter is pressed", () => {
    renderModal({
      show: true,
      onClose: vi.fn(),
      entityType: "system-prompt",
      entity: "You are a helpful assistant.",
    });
    const tagInput = screen.getByPlaceholderText(
      "Type and press Enter to add tags",
    );
    fireEvent.change(tagInput, { target: { value: "ai" } });
    fireEvent.keyDown(tagInput, { key: "Enter" });
    expect(screen.getByText("ai")).toBeInTheDocument();
  });

  it("does not add a duplicate tag", () => {
    renderModal({
      show: true,
      onClose: vi.fn(),
      entityType: "system-prompt",
      entity: "You are a helpful assistant.",
    });
    const tagInput = screen.getByPlaceholderText(
      "Type and press Enter to add tags",
    );
    fireEvent.change(tagInput, { target: { value: "ai" } });
    fireEvent.keyDown(tagInput, { key: "Enter" });
    fireEvent.change(tagInput, { target: { value: "ai" } });
    fireEvent.keyDown(tagInput, { key: "Enter" });
    expect(screen.getAllByText("ai").length).toBe(1);
  });

  it("does not add tags longer than 20 chars", () => {
    renderModal({
      show: true,
      onClose: vi.fn(),
      entityType: "system-prompt",
      entity: "You are a helpful assistant.",
    });
    const tagInput = screen.getByPlaceholderText(
      "Type and press Enter to add tags",
    );
    fireEvent.change(tagInput, { target: { value: "x".repeat(21) } });
    fireEvent.keyDown(tagInput, { key: "Enter" });
    expect(screen.queryByText("x".repeat(21))).not.toBeInTheDocument();
  });

  it("removes a tag when its remove button is clicked", () => {
    renderModal({
      show: true,
      onClose: vi.fn(),
      entityType: "system-prompt",
      entity: "You are a helpful assistant.",
    });
    const tagInput = screen.getByPlaceholderText(
      "Type and press Enter to add tags",
    );
    fireEvent.change(tagInput, { target: { value: "ai" } });
    fireEvent.keyDown(tagInput, { key: "Enter" });
    expect(screen.getByText("ai")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove tag ai" }));
    expect(screen.queryByText("ai")).not.toBeInTheDocument();
  });

  it("renders tag remove buttons with type=button and aria-label", () => {
    renderModal({
      show: true,
      onClose: vi.fn(),
      entityType: "system-prompt",
      entity: "You are a helpful assistant.",
    });
    const tagInput = screen.getByPlaceholderText(
      "Type and press Enter to add tags",
    );
    fireEvent.change(tagInput, { target: { value: "ai" } });
    fireEvent.keyDown(tagInput, { key: "Enter" });
    const removeButton = screen.getByRole("button", { name: "Remove tag ai" });
    expect(removeButton).toHaveAttribute("type", "button");
    expect(removeButton).toHaveAttribute("aria-label", "Remove tag ai");
  });

  it("submits the form and shows success view", async () => {
    CommunityHub.createSystemPrompt.mockResolvedValue({
      success: true,
      error: null,
      itemId: "item-123",
    });
    renderModal({
      show: true,
      onClose: vi.fn(),
      entityType: "system-prompt",
      entity: "You are a helpful assistant.",
    });
    fireEvent.change(
      screen.getByPlaceholderText(
        "My System Prompt",
      ),
      {
        target: { value: "My Prompt" },
      },
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        "This is the description of your system prompt. Use this to describe the purpose of your system prompt.",
      ),
      {
        target: { value: "A description with enough length." },
      },
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        "Enter your system prompt here...",
      ),
      {
        target: { value: "A prompt with enough length." },
      },
    );
    fireEvent.click(
      screen.getByText("Publish to Community Hub"),
    );
    await waitFor(() => {
      expect(CommunityHub.createSystemPrompt).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(
        screen.getByText("Success!"),
      ).toBeInTheDocument();
    });
  });

  it("shows an error toast on submit failure", async () => {
    CommunityHub.createSystemPrompt.mockResolvedValue({
      success: false,
      error: "Server error",
      itemId: null,
    });
    renderModal({
      show: true,
      onClose: vi.fn(),
      entityType: "system-prompt",
      entity: "You are a helpful assistant.",
    });
    fireEvent.change(
      screen.getByPlaceholderText(
        "My System Prompt",
      ),
      {
        target: { value: "My Prompt" },
      },
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        "This is the description of your system prompt. Use this to describe the purpose of your system prompt.",
      ),
      {
        target: { value: "A description with enough length." },
      },
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        "Enter your system prompt here...",
      ),
      {
        target: { value: "A prompt with enough length." },
      },
    );
    fireEvent.click(
      screen.getByText("Publish to Community Hub"),
    );
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("Server error"),
        "error",
        expect.objectContaining({ clear: true }),
      );
    });
  });
});

describe("PublishEntityModal - AgentFlows form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCommunityHubAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });
  });

  const sampleEntity = {
    name: "Test Flow",
    description: "Test description",
    steps: [{ type: "text-prompt", config: {} }],
  };

  it("renders agent flow modal title and step", () => {
    renderModal({
      show: true,
      onClose: vi.fn(),
      entityType: "agent-flow",
      entity: sampleEntity,
    });
    expect(
      screen.getByText("Publish Agent Flow"),
    ).toBeInTheDocument();
    expect(screen.getByText("Text Prompt")).toBeInTheDocument();
  });

  it("renders expand button with aria-expanded=false initially", () => {
    renderModal({
      show: true,
      onClose: vi.fn(),
      entityType: "agent-flow",
      entity: sampleEntity,
    });
    const expandButton = screen.getByRole("button", { name: "Expand step 1" });
    expect(expandButton).toHaveAttribute("aria-expanded", "false");
  });

  it("toggles step expansion on click", () => {
    renderModal({
      show: true,
      onClose: vi.fn(),
      entityType: "agent-flow",
      entity: sampleEntity,
    });
    const expandButton = screen.getByRole("button", { name: "Expand step 1" });
    fireEvent.click(expandButton);
    expect(expandButton).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(expandButton);
    expect(expandButton).toHaveAttribute("aria-expanded", "false");
  });

  it("renders CaretRight icon", () => {
    renderModal({
      show: true,
      onClose: vi.fn(),
      entityType: "agent-flow",
      entity: sampleEntity,
    });
    expect(screen.getByTestId("caret-right-icon")).toBeInTheDocument();
  });

  it("submits the agent flow form with visibility set to private", async () => {
    CommunityHub.createAgentFlow.mockResolvedValue({
      success: true,
      error: null,
      itemId: "flow-123",
    });
    renderModal({
      show: true,
      onClose: vi.fn(),
      entityType: "agent-flow",
      entity: sampleEntity,
    });
    fireEvent.click(
      screen.getByText("Publish to Community Hub"),
    );
    await waitFor(() => {
      expect(CommunityHub.createAgentFlow).toHaveBeenCalled();
    });
    const callArg = CommunityHub.createAgentFlow.mock.calls[0][0];
    expect(callArg.visibility).toBe("private");
    expect(JSON.parse(callArg.flow).visibility).toBe("private");
  });

  it("shows empty steps message when entity has no steps", () => {
    renderModal({
      show: true,
      onClose: vi.fn(),
      entityType: "agent-flow",
      entity: { ...sampleEntity, steps: [] },
    });
    expect(screen.getByText("No steps defined.")).toBeInTheDocument();
  });
});

describe("PublishEntityModal - SlashCommands form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCommunityHubAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });
  });

  const sampleEntity = {
    name: "Test Command",
    description: "Test description",
    command: "/test",
    prompt: "Test prompt",
  };

  it("renders slash command modal title and command", () => {
    renderModal({
      show: true,
      onClose: vi.fn(),
      entityType: "slash-command",
      entity: sampleEntity,
    });
    expect(
      screen.getByText("Publish Slash Command"),
    ).toBeInTheDocument();
    expect(screen.getByText("/test")).toBeInTheDocument();
  });

  it("submits the slash command form successfully", async () => {
    CommunityHub.createSlashCommand.mockResolvedValue({
      success: true,
      error: null,
      itemId: "cmd-123",
    });
    renderModal({
      show: true,
      onClose: vi.fn(),
      entityType: "slash-command",
      entity: sampleEntity,
    });
    fireEvent.click(
      screen.getByText("Publish to Community Hub"),
    );
    await waitFor(() => {
      expect(CommunityHub.createSlashCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "/test",
        }),
      );
    });
  });

  it("shows error toast on slash command submit failure", async () => {
    CommunityHub.createSlashCommand.mockResolvedValue({
      success: false,
      error: "Bad command",
      itemId: null,
    });
    renderModal({
      show: true,
      onClose: vi.fn(),
      entityType: "slash-command",
      entity: sampleEntity,
    });
    fireEvent.click(
      screen.getByText("Publish to Community Hub"),
    );
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("Bad command"),
        "error",
        expect.objectContaining({ clear: true }),
      );
    });
  });
});

describe("PublishEntityModal - unknown entity type", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCommunityHubAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });
  });

  it("renders only the close button when entityType is unknown", () => {
    renderModal({
      show: true,
      onClose: vi.fn(),
      entityType: "unknown-type",
      entity: {},
    });
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(
      screen.queryByText("Publish System Prompt"),
    ).not.toBeInTheDocument();
  });
});
