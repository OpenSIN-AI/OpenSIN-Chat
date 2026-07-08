// SPDX-License-Identifier: MIT
import React, { useState, createContext, useMemo } from "react";
import useSWR from "swr";
import {
  AUTH_TIMESTAMP,
  AUTH_TOKEN,
  AUTH_USER,
  USER_PROMPT_INPUT_MAP,
} from "@/utils/constants";
import System from "./models/system";
import { useNavigate } from "react-router-dom";
import { safeJsonParse } from "@/utils/request";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/utils/safeStorage";

export interface AuthUser {
  id?: string | number;
  username?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

export interface AuthStore {
  user: AuthUser | null;
  authToken: string | null;
}

export interface AuthActions {
  updateUser: (user: AuthUser, authToken?: string) => void;
  unsetUser: () => void;
}

export interface AuthContextValue {
  store: AuthStore;
  actions: AuthActions;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
export const userKey = "system/refresh-user";

export function AuthProvider(props: { children: React.ReactNode }) {
  // Lazy initialiser so localStorage access and safeJsonParse only run on the
  // very first render rather than on every render of the provider.
  const [store, setStore] = useState<AuthStore>(() => {
    const localUser = safeGetItem(AUTH_USER);
    const localAuthToken = safeGetItem(AUTH_TOKEN);
    return {
      user: localUser ? safeJsonParse(localUser, null as any) : null,
      authToken: localAuthToken ? localAuthToken : null,
    };
  });

  const navigate = useNavigate();

  // SWR replaces the useEffect + refreshUser pattern.
  // Only fires when an authToken is present; the userKey is set to null
  // otherwise so SWR skips the request entirely.
  const { mutate } = useSWR(
    store.authToken ? userKey : null,
    () => System.refreshUser(),
    {
      revalidateOnFocus: true,
      dedupingInterval: 2000,
      onSuccess(data) {
        // Single-user mode (no multi-user): data.user is null but success is
        // true — nothing to do.
        if (data.success && data.user === null) return;

        if (!data.success) {
          safeRemoveItem(AUTH_USER);
          safeRemoveItem(AUTH_TOKEN);
          safeRemoveItem(AUTH_TIMESTAMP);
          safeRemoveItem(USER_PROMPT_INPUT_MAP);
          setStore({ user: null, authToken: null });
          navigate("/login");
          return;
        }

        safeSetItem(AUTH_USER, JSON.stringify(data.user));
        setStore((prev) => ({ ...prev, user: data.user }));
      },
    },
  );

  /* NOTE:
   * 1. These helper functions are not stateful — they are plain actions.
   * 2. updateUser / unsetUser also invalidate the SWR user cache so any
   *    component that calls useUser() immediately sees the new state.
   */
  const [actions] = useState<AuthActions>({
    updateUser: (user, authToken = "" as any) => {
      safeSetItem(AUTH_USER, JSON.stringify(user));
      safeSetItem(AUTH_TOKEN, authToken);
      setStore({ user, authToken });
      mutate({ success: true, user, message: null }, false);
    },
    unsetUser: () => {
      safeRemoveItem(AUTH_USER);
      safeRemoveItem(AUTH_TOKEN);
      safeRemoveItem(AUTH_TIMESTAMP);
      safeRemoveItem(USER_PROMPT_INPUT_MAP);
      setStore({ user: null, authToken: null });
      mutate({ success: false, user: null, message: null }, false);
    },
  });

  const value = useMemo<AuthContextValue>(() => ({ store, actions }), [store, actions]);

  return (
    <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
  );
}
