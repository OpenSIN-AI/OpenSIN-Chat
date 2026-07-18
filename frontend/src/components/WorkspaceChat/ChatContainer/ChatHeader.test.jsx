// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ChatHeader from "./ChatHeader";

vi.mock("react-device-detect", () => ({
  isMobile: false,
}));

vi.mock("../../Sidebar", () => ({
  SidebarMobileHeader: () => (
    <div data-testid="mobile-header">Mobile Header</div>
  ),
}));

vi.mock("./WorkspaceModelPicker", () => ({
  default: ({ workspaceSlug }) => (
    <div data-testid="workspace-model-picker" data-slug={workspaceSlug}>
      Model Picker
    </div>
  ),
}));

vi.mock("./MobileSidebarMenu", () => ({
  default: () => <div data-testid="mobile-sidebar-menu" />,
}));

describe("ChatHeader", () => {
  it("renders the workspace model picker", () => {
    render(<ChatHeader workspaceSlug="my-workspace" isEmpty={false} />);
    expect(screen.getByTestId("workspace-model-picker")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-model-picker")).toHaveAttribute(
      "data-slug",
      "my-workspace",
    );
  });

  it("does not render mobile header on desktop", () => {
    render(<ChatHeader workspaceSlug="my-workspace" isEmpty={false} />);
    expect(screen.queryByTestId("mobile-header")).not.toBeInTheDocument();
  });

  it("passes the workspace slug to the model picker", () => {
    render(<ChatHeader workspaceSlug="another-workspace" isEmpty={true} />);
    expect(screen.getByTestId("workspace-model-picker")).toHaveAttribute(
      "data-slug",
      "another-workspace",
    );
  });
});
