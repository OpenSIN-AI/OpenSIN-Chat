// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import AttachmentList from "./AttachmentList";

vi.mock("./Attachments", () => ({
  default: ({ attachments }) => (
    <div data-testid="attachments" data-count={attachments.length} />
  ),
}));

describe("AttachmentList", () => {
  it("forwards attachments to the manager", () => {
    const { getByTestId } = render(<AttachmentList attachments={["a", "b"]} />);
    expect(getByTestId("attachments")).toHaveAttribute("data-count", "2");
  });
});
