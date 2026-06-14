// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ToolApprovalRequest from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

const timeoutCallbacks = [];
vi.mock("@/hooks/useTimeoutProgress", () => ({
  default: vi.fn((timeoutMs, options) => {
    if (options?.onTimeout) {
      timeoutCallbacks.push(options.onTimeout);
    }
    return 50;
  }),
}));

vi.mock("@/models/agentSkillWhitelist", () => ({
  default: {
    addToWhitelist: vi.fn().mockResolvedValue({}),
  },
}));

import AgentSkillWhitelist from "@/models/agentSkillWhitelist";
import useTimeoutProgress from "@/hooks/useTimeoutProgress";

describe("ToolApprovalRequest", () => {
  const request = {
    requestId: "req-1",
    skillName: "my-skill",
    payload: { arg: "value" },
    description: "This is a test tool request",
    timeoutMs: 1000,
    websocket: null,
    onResponse: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    timeoutCallbacks.length = 0;
  });

  it("renders the skill name and description", () => {
    render(<ToolApprovalRequest {...request} />);
    expect(screen.getByText("my-skill")).toBeInTheDocument();
    expect(screen.getByText("This is a test tool request")).toBeInTheDocument();
  });

  it("renders approve and reject buttons", () => {
    render(<ToolApprovalRequest {...request} />);
    expect(screen.getByText("Approve")).toBeInTheDocument();
    expect(screen.getByText("Reject")).toBeInTheDocument();
  });

  it("calls onResponse with true when approved", async () => {
    render(<ToolApprovalRequest {...request} />);
    fireEvent.click(screen.getByText("Approve"));
    await waitFor(() => {
      expect(request.onResponse).toHaveBeenCalledWith(true);
    });
  });

  it("calls onResponse with false when rejected", () => {
    render(<ToolApprovalRequest {...request} />);
    fireEvent.click(screen.getByText("Reject"));
    expect(request.onResponse).toHaveBeenCalledWith(false);
  });

  it("does not allow multiple responses", () => {
    render(<ToolApprovalRequest {...request} />);
    const approveButton = screen.getByText("Approve");
    fireEvent.click(approveButton);
    expect(screen.queryByText("Approve")).not.toBeInTheDocument();
    expect(request.onResponse).toHaveBeenCalledTimes(1);
  });

  it("sends response via websocket when available", () => {
    const websocket = { readyState: 1, send: vi.fn() };
    render(<ToolApprovalRequest {...request} websocket={websocket} />);
    fireEvent.click(screen.getByText("Approve"));
    expect(websocket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "toolApprovalResponse",
        requestId: "req-1",
        approved: true,
      }),
    );
  });

  it("renders a progress bar when timeoutMs is provided", () => {
    const { container } = render(<ToolApprovalRequest {...request} />);
    const progressBar = container.querySelector(".bg-sky-500");
    expect(progressBar).toBeInTheDocument();
  });

  it("expands payload details when expand button is clicked", () => {
    render(<ToolApprovalRequest {...request} />);
    const expandButton = screen.getByRole("button", { name: /show/i });
    fireEvent.click(expandButton);
    expect(screen.getByText(/"arg": "value"/)).toBeInTheDocument();
  });

  it("does not render expand button when payload is empty", () => {
    render(<ToolApprovalRequest {...request} payload={{}} />);
    expect(
      screen.queryByRole("button", { name: /show/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the approved message after approving", () => {
    render(<ToolApprovalRequest {...request} />);
    fireEvent.click(screen.getByText("Approve"));
    expect(
      screen.getByText("Tool call was approved"),
    ).toBeInTheDocument();
  });

  it("shows the rejected message after rejecting", () => {
    render(<ToolApprovalRequest {...request} />);
    fireEvent.click(screen.getByText("Reject"));
    expect(
      screen.getByText("Tool call was rejected"),
    ).toBeInTheDocument();
  });

  it("adds the skill to the whitelist when approved with always allow checked", async () => {
    render(<ToolApprovalRequest {...request} />);
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    fireEvent.click(screen.getByText("Approve"));
    await waitFor(() => {
      expect(AgentSkillWhitelist.addToWhitelist).toHaveBeenCalledWith("my-skill");
    });
  });

  it("does not whitelist the skill when always allow is not checked", () => {
    render(<ToolApprovalRequest {...request} />);
    fireEvent.click(screen.getByText("Approve"));
    expect(AgentSkillWhitelist.addToWhitelist).not.toHaveBeenCalled();
  });

  it("rejects automatically when the timeout fires", async () => {
    render(<ToolApprovalRequest {...request} />);
    expect(timeoutCallbacks).toHaveLength(1);
    await act(async () => timeoutCallbacks[0]());
    await waitFor(() =>
      expect(request.onResponse).toHaveBeenCalledWith(false),
    );
    expect(screen.getByText("Tool call was rejected")).toBeInTheDocument();
  });

  it("hides the response buttons after the timeout fires", async () => {
    render(<ToolApprovalRequest {...request} />);
    await act(async () => timeoutCallbacks[0]());
    await waitFor(() => {
      expect(screen.queryByText("Approve")).not.toBeInTheDocument();
      expect(screen.queryByText("Reject")).not.toBeInTheDocument();
    });
  });

  it("does not trigger a second response when already timed out", async () => {
    render(<ToolApprovalRequest {...request} />);
    await act(async () => timeoutCallbacks[0]());
    await waitFor(() =>
      expect(screen.getByText("Tool call was rejected")).toBeInTheDocument(),
    );
    expect(request.onResponse).toHaveBeenCalledTimes(1);
  });
});
