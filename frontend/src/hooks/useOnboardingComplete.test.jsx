// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useNavigate } from "react-router-dom";
import { SWRConfig } from "swr";
import React from "react";

// Mock useSystemConfig since useOnboardingComplete now delegates to it
vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useSystemConfig: vi.fn() };
});
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: vi.fn() };
});

import { useSystemConfig } from "@/hooks";
import useOnboardingComplete from "./useOnboardingComplete";

// Provide a fresh SWR cache per test to avoid cross-test cache bleed
const wrapper = ({ children }) =>
  React.createElement(
    SWRConfig,
    { value: { provider: () => new Map() } },
    children,
  );

describe("useOnboardingComplete", () => {
  it("navigates home when onboarding is complete", async () => {
    const navigate = vi.fn();
    useNavigate.mockReturnValue(navigate);
    useSystemConfig.mockReturnValue({ isOnboarded: true, loading: false });

    renderHook(() => useOnboardingComplete(), { wrapper });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/"));
  });

  it("stays when onboarding is not complete", async () => {
    const navigate = vi.fn();
    useNavigate.mockReturnValue(navigate);
    useSystemConfig.mockReturnValue({ isOnboarded: false, loading: false });

    renderHook(() => useOnboardingComplete(), { wrapper });
    await waitFor(() => expect(navigate).not.toHaveBeenCalled());
  });
});
