// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("react-toastify", () => {
  const toast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    dismiss: vi.fn(),
  };
  return { toast };
});

import { toast } from "react-toastify";
import showToast from "./toast";

describe("toast utility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls toast.success for success type", () => {
    showToast("Success message", "success");
    expect(toast.success).toHaveBeenCalledWith("Success message", expect.any(Object));
  });

  it("calls toast.error for error type", () => {
    showToast("Error message", "error");
    expect(toast.error).toHaveBeenCalledWith("Error message", expect.any(Object));
  });

  it("calls toast.info for info type", () => {
    showToast("Info message", "info");
    expect(toast.info).toHaveBeenCalledWith("Info message", expect.any(Object));
  });

  it("calls toast.warn for warning type", () => {
    showToast("Warning message", "warning");
    expect(toast.warn).toHaveBeenCalledWith("Warning message", expect.any(Object));
  });

  it("dismisses all toasts when clear option is true", () => {
    showToast("Message", "success", { clear: true });
    expect(toast.dismiss).toHaveBeenCalled();
  });

  it("has correct default options", () => {
    showToast("Test", "success");
    const options = toast.success.mock.calls[0][1];
    expect(options.theme).toBeDefined();
    expect(options.autoClose).toBeDefined();
    expect(options.closeOnClick).toBeDefined();
  });

  it("passes through custom options", () => {
    showToast("Test", "success", { autoClose: 1000 });
    const options = toast.success.mock.calls[0][1];
    expect(options.autoClose).toBe(1000);
  });
});
