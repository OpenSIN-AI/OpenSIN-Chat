// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LanceDBOptions from "./index";
vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});


describe("LanceDBOptions", () => {
  it("renders without crash", () => {
    const { container } = render(<LanceDBOptions />);
    expect(container).toBeInTheDocument();
  });

  it("displays the translated provider description", () => {
    render(<LanceDBOptions />);
    expect(
      screen.getByText("There is no configuration needed for LanceDB."),
    ).toBeInTheDocument();
  });

  it("applies correct layout classes", () => {
    const { container } = render(<LanceDBOptions />);
    const wrapper = container.querySelector(".w-full.h-10");
    expect(wrapper).toBeInTheDocument();
  });

  it("renders text with correct styling classes", () => {
    const { container } = render(<LanceDBOptions />);
    const text = container.querySelector(".text-sm.font-base");
    expect(text).toBeInTheDocument();
  });

  it("applies text opacity class", () => {
    const { container } = render(<LanceDBOptions />);
    const text = container.querySelector(".text-opacity-60");
    expect(text).toBeInTheDocument();
  });
});
