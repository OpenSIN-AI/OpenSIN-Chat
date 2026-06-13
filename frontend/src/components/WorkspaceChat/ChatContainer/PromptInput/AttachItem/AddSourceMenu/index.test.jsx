// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AddSourceMenu from "./index";
import showToast from "@/utils/toast";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@/utils/toast", () => ({
  default: vi.fn(),
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
});
