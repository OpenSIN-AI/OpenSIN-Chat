// SPDX-License-Identifier: MIT
/* eslint-disable i18next/no-literal-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TextSizeMenu from "./index";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => {
      const map = {
        "chat_window.small": "Small",
        "chat_window.normal": "Normal",
        "chat_window.large": "Large",
        "chat_window.text_size_label": "Text Size",
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock("@/hooks/useLoginMode", () => ({
  default: () => null,
}));

const __isMobile = { value: false };
vi.mock("react-device-detect", () => ({
  get isMobile() {
    return __isMobile.value;
  },
}));

vi.mock("@phosphor-icons/react", () => ({
  SlidersHorizontal: ({ size, className }) => (
    <span
      data-testid="sliders-icon"
      className={className}
      style={{ fontSize: size }}
    >
      Sliders
    </span>
  ),
}));

describe("TextSizeMenu", () => {
  beforeEach(() => {
    __isMobile.value = false;
    window.localStorage.getItem.mockReturnValue(null);
  });

  it("renders the toggle button with slider icon", () => {
    render(<TextSizeMenu />);
    expect(screen.getByTestId("sliders-icon")).toBeInTheDocument();
  });

  it("does not show menu initially", () => {
    render(<TextSizeMenu />);
    expect(screen.queryByText("Text Size")).not.toBeInTheDocument();
  });

  it("opens menu on button click", () => {
    render(<TextSizeMenu />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(screen.getByText("Text Size")).toBeInTheDocument();
    expect(screen.getByText("Small")).toBeInTheDocument();
    expect(screen.getByText("Normal")).toBeInTheDocument();
    expect(screen.getByText("Large")).toBeInTheDocument();
  });

  it("closes menu on second button click", () => {
    render(<TextSizeMenu />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(screen.getByText("Text Size")).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.queryByText("Text Size")).not.toBeInTheDocument();
  });

  it("defaults to normal size when no localStorage value", () => {
    render(<TextSizeMenu />);
    fireEvent.click(screen.getByRole("button"));
    const normalItem = screen.getByText("Normal").closest("div");
    expect(normalItem.className).toContain("bg-zinc-700");
  });

  it("uses localStorage value as selected size", () => {
    window.localStorage.getItem.mockReturnValue("large");
    render(<TextSizeMenu />);
    fireEvent.click(screen.getByRole("button"));
    const largeItem = screen.getByText("Large").closest("div");
    expect(largeItem.className).toContain("bg-zinc-700");
  });

  it("saves size to localStorage on click", () => {
    render(<TextSizeMenu />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Small"));
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "openafd_text_size",
      "small",
    );
  });

  it("dispatches textSizeChange event on size change", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    render(<TextSizeMenu />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Large"));
    expect(dispatchSpy).toHaveBeenCalled();
    const lastCall =
      dispatchSpy.mock.calls[dispatchSpy.mock.calls.length - 1][0];
    expect(lastCall.type).toBe("textSizeChange");
    expect(lastCall.detail).toBe("large");
  });

  it("returns null on mobile", () => {
    __isMobile.value = true;
    const { container } = render(<TextSizeMenu />);
    expect(container.innerHTML).toBe("");
  });
});
