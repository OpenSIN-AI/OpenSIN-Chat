// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useNavigate } from "react-router-dom";

vi.mock("@/models/system", () => ({
  default: { isOnboardingComplete: vi.fn() },
}));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: vi.fn() };
});

import System from "@/models/system";
import useOnboardingComplete from "./useOnboardingComplete";

describe("useOnboardingComplete", () => {
  it("navigates home when onboarding is complete", async () => {
    const navigate = vi.fn();
    useNavigate.mockReturnValue(navigate);
    System.isOnboardingComplete.mockResolvedValue(true);

    renderHook(() => useOnboardingComplete());
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/"));
  });

  it("stays when onboarding is not complete", async () => {
    const navigate = vi.fn();
    useNavigate.mockReturnValue(navigate);
    System.isOnboardingComplete.mockResolvedValue(false);

    renderHook(() => useOnboardingComplete());
    await waitFor(() => expect(navigate).not.toHaveBeenCalled());
  });
});
