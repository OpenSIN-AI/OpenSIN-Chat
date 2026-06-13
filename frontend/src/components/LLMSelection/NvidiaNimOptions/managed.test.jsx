// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ManagedNvidiaNimOptions from "./managed";

describe("ManagedNvidiaNimOptions", () => {
  it("renders null", () => {
    const { container } = render(<ManagedNvidiaNimOptions settings={{}} />);
    expect(container.firstChild).toBeNull();
  });
});
