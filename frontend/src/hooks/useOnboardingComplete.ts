// SPDX-License-Identifier: MIT
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import paths from "@/utils/paths";
import { useSystemConfig } from "@/hooks";

/**
 * Redirects to the home page as soon as onboarding is confirmed complete.
 *
 * Uses the SWR-backed `useSystemConfig` hook (shared with other callers) so
 * the `isOnboardingComplete` API call is de-duplicated rather than issuing a
 * fresh fetch on every render. Navigation is performed in a `useEffect` that
 * only fires once `loading` is false and the result is `isOnboarded === true`.
 */
export default function useRedirectToHomeOnOnboardingComplete() {
  const navigate = useNavigate();
  const { isOnboarded, loading } = useSystemConfig();

  useEffect(() => {
    if (loading) return;
    if (!isOnboarded) return;
    navigate(paths.home());
  }, [isOnboarded, loading, navigate]);
}
