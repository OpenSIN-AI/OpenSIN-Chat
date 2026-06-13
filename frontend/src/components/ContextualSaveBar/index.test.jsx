// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

import ContextualSaveBar from "./index";

describe("ContextualSaveBar", () => {
  it("renders nothing when showing is false", () => {
    const { container } = render(
      <ContextualSaveBar showing={false} onSave={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders Save and Cancel buttons when showing is true", () => {
    render(
      <ContextualSaveBar showing={true} onSave={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();
  });

  it("calls onSave when Save button is clicked", () => {
    const onSave = vi.fn();
    render(
      <ContextualSaveBar showing={true} onSave={onSave} onCancel={vi.fn()} />,
    );
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when Cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(
      <ContextualSaveBar showing={true} onSave={vi.fn()} onCancel={onCancel} />,
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("defaults showing to false", () => {
    const { container } = render(
      <ContextualSaveBar onSave={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
