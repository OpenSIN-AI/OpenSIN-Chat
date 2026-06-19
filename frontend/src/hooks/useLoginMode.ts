// SPDX-License-Identifier: MIT
import { AUTH_TOKEN, AUTH_USER } from "@/utils/constants";
import { safeGetItem } from "@/utils/safeStorage";

/**
 * Synchronously derives the login mode from localStorage.
 *
 * No async fetch is needed here — the values are already present in storage
 * at the time the component renders. The previous `useEffect + useState`
 * pattern added an unnecessary deferred-render cycle; reading synchronously
 * via `useMemo`-equivalent initialisation is both simpler and faster.
 *
 * @returns {"multi" | "single" | null}
 */
export default function useLoginMode(): "multi" | "single" | null {
  const user = !!safeGetItem(AUTH_USER);
  const token = !!safeGetItem(AUTH_TOKEN);
  if (user && token) return "multi";
  if (!user && token) return "single";
  return null;
}
