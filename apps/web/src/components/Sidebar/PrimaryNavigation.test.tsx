// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import PrimaryNavigation from "./PrimaryNavigation";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

describe("PrimaryNavigation", () => {
  it("keeps the primary rail focused on chat, sources and research", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <PrimaryNavigation />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Chats" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sources" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Research" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Admin" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Political Data" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Reports" }),
    ).not.toBeInTheDocument();
  });
});
