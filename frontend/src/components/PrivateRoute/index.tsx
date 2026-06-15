// SPDX-License-Identifier: MIT
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { FullScreenLoader } from "../Preloader";
import validateSessionTokenForUser from "@/utils/session";
import paths from "@/utils/paths";
import { AUTH_TIMESTAMP, AUTH_TOKEN, AUTH_USER } from "@/utils/constants";
import { userFromStorage } from "@/utils/request";
import useSystemSettings from "@/hooks/useSystemSettings";
import useSWR from "swr";
import UserMenu from "../UserMenu";
import { KeyboardShortcutWrapper } from "@/utils/keyboardShortcuts";

const ONBOARDING_STATUS_KEY = "system/onboarding-status";
const SESSION_VALID_KEY = "system/session-valid";

/**
 * Replaces the `useEffect + async validateSession()` pattern with two
 * composable SWR fetches:
 *
 * 1. `ONBOARDING_STATUS_KEY` — whether onboarding has been completed.
 * 2. `SESSION_VALID_KEY` — whether the current auth token is still valid
 *    (only fetched when settings are loaded and a token is present).
 *
 * Both keys are deduplicated across all four Route components that call
 * `useIsAuthenticated`, so at most two network requests fire instead of one
 * per mount regardless of how many Route wrappers are on the page.
 */
function useIsAuthenticated() {
  const { settings, loading: settingsLoading } = useSystemSettings();
  const { MultiUserMode, RequiresAuth } = settings || {};

  const localAuthToken = localStorage.getItem(AUTH_TOKEN);
  const localUser = localStorage.getItem(AUTH_USER);

  // Step 1: check onboarding (always needed)
  const { data: onboardingComplete, isLoading: onboardingLoading } = useSWR(
    !settingsLoading ? ONBOARDING_STATUS_KEY : null,
    () => {
      // Avoid circular import by using the system model lazily
      return import("@/models/system").then((m) =>
        m.default.isOnboardingComplete(),
      );
    },
    { revalidateOnFocus: false, dedupingInterval: 10000 },
  );

  // Step 2: validate the session token (only when auth is actually required)
  const needsTokenCheck =
    !settingsLoading &&
    onboardingComplete !== undefined &&
    onboardingComplete !== false &&
    !!localAuthToken &&
    (MultiUserMode || RequiresAuth);

  const { data: sessionValid, isLoading: sessionLoading } = useSWR(
    needsTokenCheck ? SESSION_VALID_KEY : null,
    () => validateSessionTokenForUser(),
    { revalidateOnFocus: false, dedupingInterval: 5000 },
  );

  const loading =
    settingsLoading ||
    onboardingLoading ||
    (needsTokenCheck && sessionLoading);

  if (loading || onboardingComplete === undefined) {
    return { isAuthd: null, shouldRedirectToOnboarding: false, multiUserMode: !!MultiUserMode };
  }

  // Onboarding is incomplete — redirect
  if (onboardingComplete === false) {
    return { isAuthd: true, shouldRedirectToOnboarding: true, multiUserMode: !!MultiUserMode };
  }

  // Single-user mode, no password required
  if (!MultiUserMode && !RequiresAuth) {
    return { isAuthd: true, shouldRedirectToOnboarding: false, multiUserMode: false };
  }

  // Auth is required but we have no token
  if (!localAuthToken) {
    return { isAuthd: false, shouldRedirectToOnboarding: false, multiUserMode: !!MultiUserMode };
  }

  // Multi-user mode also requires a stored user record
  if (MultiUserMode && !localUser) {
    return { isAuthd: false, shouldRedirectToOnboarding: false, multiUserMode: true };
  }

  // Session token was invalid — clean up storage
  if (needsTokenCheck && sessionValid === false) {
    localStorage.removeItem(AUTH_USER);
    localStorage.removeItem(AUTH_TOKEN);
    localStorage.removeItem(AUTH_TIMESTAMP);
    return { isAuthd: false, shouldRedirectToOnboarding: false, multiUserMode: !!MultiUserMode };
  }

  return {
    isAuthd: sessionValid !== false,
    shouldRedirectToOnboarding: false,
    multiUserMode: !!MultiUserMode,
  };
}

// Allows only admin to access the route and if in single user mode,
// allows all users to access the route
export function AdminRoute({ Component, hideUserMenu = false }) {
  const { isAuthd, shouldRedirectToOnboarding, multiUserMode } =
    useIsAuthenticated();
  if (isAuthd === null) return <FullScreenLoader />;

  if (shouldRedirectToOnboarding) {
    return <Navigate to={paths.onboarding.home()} />;
  }

  const user = userFromStorage();
  return isAuthd && (user?.role === "admin" || !multiUserMode) ? (
    hideUserMenu ? (
      <KeyboardShortcutWrapper>
        <Component />
      </KeyboardShortcutWrapper>
    ) : (
      <KeyboardShortcutWrapper>
        <UserMenu>
          <Component />
        </UserMenu>
      </KeyboardShortcutWrapper>
    )
  ) : (
    <Navigate to={paths.home()} />
  );
}

// Allows manager and admin to access the route and if in single user mode,
// allows all users to access the route
export function ManagerRoute({ Component }) {
  const { isAuthd, shouldRedirectToOnboarding, multiUserMode } =
    useIsAuthenticated();
  if (isAuthd === null) return <FullScreenLoader />;

  if (shouldRedirectToOnboarding) {
    return <Navigate to={paths.onboarding.home()} />;
  }

  const user = userFromStorage();
  return isAuthd && (user?.role !== "default" || !multiUserMode) ? (
    <KeyboardShortcutWrapper>
      <UserMenu>
        <Component />
      </UserMenu>
    </KeyboardShortcutWrapper>
  ) : (
    <Navigate to={paths.home()} />
  );
}

// Allows access only in single user mode — redirects to home in multi-user mode
export function SingleUserRoute({ Component }) {
  const { isAuthd, shouldRedirectToOnboarding, multiUserMode } =
    useIsAuthenticated();
  if (isAuthd === null) return <FullScreenLoader />;

  if (shouldRedirectToOnboarding) {
    return <Navigate to={paths.onboarding.home()} />;
  }

  return isAuthd && !multiUserMode ? (
    <KeyboardShortcutWrapper>
      <Component />
    </KeyboardShortcutWrapper>
  ) : (
    <Navigate to={paths.home()} />
  );
}

export default function PrivateRoute({ Component }) {
  const { isAuthd, shouldRedirectToOnboarding } = useIsAuthenticated();
  if (isAuthd === null) return <FullScreenLoader />;

  if (shouldRedirectToOnboarding) {
    return <Navigate to="/onboarding" />;
  }

  return isAuthd ? (
    <KeyboardShortcutWrapper>
      <UserMenu>
        <Component />
      </UserMenu>
    </KeyboardShortcutWrapper>
  ) : (
    <Navigate to={paths.login(true)} />
  );
}
