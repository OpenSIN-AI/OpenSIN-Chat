// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StopGenerationButton from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("react-tooltip", () => ({
  Tooltip: ({ id }) => <div data-testid={`tooltip-${id}`} />,
}));

vi.mock("@/utils/chat", () => ({
  ABORT_STREAM_EVENT: "abort-stream",
}));

describe("StopGenerationButton", () => {
  it("renders the stop button", () => {
    render(<StopGenerationButton />);
    expect(screen.getByLabelText("Stop generating")).toBeInTheDocument();
  });

  it("dispatches the abort event when clicked", () => {
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
    render(<StopGenerationButton />);
    const button = screen.getByLabelText("Stop generating");
    fireEvent.click(button);
    expect(dispatchEventSpy).toHaveBeenCalled();
    const event = dispatchEventSpy.mock.calls[0][0];
    expect(event.type).toBe("abort-stream");
    dispatchEventSpy.mockRestore();
  });

  it("renders the tooltip", () => {
    render(<StopGenerationButton />);
    expect(
      screen.getByTestId("tooltip-stop-generation-button"),
    ).toBeInTheDocument();
  });
});
