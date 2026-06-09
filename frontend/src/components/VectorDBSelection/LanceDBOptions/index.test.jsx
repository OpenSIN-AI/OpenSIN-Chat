// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LanceDBOptions from "./index";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => {
      const map = {
        "vector.provider.description": "LanceDB is an embedded vector database.",
      };
      return map[key] ?? key;
    },
  }),
}));

describe("LanceDBOptions", () => {
  it("renders without crash", () => {
    const { container } = render(<LanceDBOptions />);
    expect(container).toBeInTheDocument();
  });

  it("displays the translated provider description", () => {
    render(<LanceDBOptions />);
    expect(
      screen.getByText("LanceDB is an embedded vector database."),
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
