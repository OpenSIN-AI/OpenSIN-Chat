// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ToolApprovalRequest from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@/hooks/useTimeoutProgress", () => ({
  default: vi.fn(() => 50),
}));

vi.mock("@/models/agentSkillWhitelist", () => ({
  default: {
    addToWhitelist: vi.fn().mockResolvedValue({}),
  },
}));

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
    const expandButton = screen.getByRole("button", { name: /show details/i });
    fireEvent.click(expandButton);
    expect(screen.getByText(/"arg": "value"/)).toBeInTheDocument();
  });

  it("does not render expand button when payload is empty", () => {
    render(<ToolApprovalRequest {...request} payload={{}} />);
    expect(
      screen.queryByRole("button", { name: /show details/i }),
    ).not.toBeInTheDocument();
  });
});
