// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@phosphor-icons/react", () => ({
  X: ({ size, weight, className, "aria-hidden": ariaHidden }) => (
    <svg
      data-testid="x-icon"
      data-size={size}
      data-weight={weight}
      className={className}
      aria-hidden={ariaHidden}
    />
  ),
}));

vi.mock("@/utils/paths", () => ({
  default: {
    communityHub: {
      authentication: () => "/settings/community-hub/authentication",
    },
  },
}));

vi.mock("@/components/ModalWrapper", () => ({
  default: ({ isOpen, children }) =>
    isOpen ? <div data-testid="modal-wrapper">{children}</div> : null,
}));

import UnauthenticatedHubModal from "./index";

describe("UnauthenticatedHubModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when show is false", () => {
    const { container } = render(
      <MemoryRouter>
        <UnauthenticatedHubModal show={false} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders modal content when show is true", () => {
    render(
      <MemoryRouter>
        <UnauthenticatedHubModal show={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("modal-wrapper")).toBeInTheDocument();
    expect(screen.getByText("Authentication Required")).toBeInTheDocument();
  });

  it("renders the description text", () => {
    render(
      <MemoryRouter>
        <UnauthenticatedHubModal show={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(
        "You need to authenticate with the OpenSIN Chat Community Hub before publishing items.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the close button with aria-label", () => {
    render(
      <MemoryRouter>
        <UnauthenticatedHubModal show={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    const closeButton = screen.getByRole("button", { name: "Close" });
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveAttribute("type", "button");
    expect(closeButton).toHaveAttribute("aria-label", "Close");
  });

  it("marks the close icon as aria-hidden", () => {
    render(
      <MemoryRouter>
        <UnauthenticatedHubModal show={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    const xIcon = screen.getByTestId("x-icon");
    expect(xIcon).toHaveAttribute("aria-hidden", "true");
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <UnauthenticatedHubModal show={true} onClose={onClose} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders an authentication link pointing to the correct path", () => {
    render(
      <MemoryRouter>
        <UnauthenticatedHubModal show={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    const link = screen.getByText("Connect to Community Hub");
    expect(link.closest("a")).toHaveAttribute(
      "href",
      "/settings/community-hub/authentication",
    );
  });
});
