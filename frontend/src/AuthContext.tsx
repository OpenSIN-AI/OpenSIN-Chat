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

export const AuthContext = createContext<any>(null);
export const userKey = "system/refresh-user";

export function AuthProvider(props) {
  // Lazy initialiser so localStorage access and safeJsonParse only run on the
  // very first render rather than on every render of the provider.
  const [store, setStore] = useState(() => {
    const localUser = localStorage.getItem(AUTH_USER);
    const localAuthToken = localStorage.getItem(AUTH_TOKEN);
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
          localStorage.removeItem(AUTH_USER);
          localStorage.removeItem(AUTH_TOKEN);
          localStorage.removeItem(AUTH_TIMESTAMP);
          localStorage.removeItem(USER_PROMPT_INPUT_MAP);
          setStore({ user: null, authToken: null });
          navigate("/login");
          return;
        }

        localStorage.setItem(AUTH_USER, JSON.stringify(data.user));
        setStore((prev) => ({ ...prev, user: data.user }));
      },
    },
  );

  /* NOTE:
   * 1. These helper functions are not stateful — they are plain actions.
   * 2. updateUser / unsetUser also invalidate the SWR user cache so any
   *    component that calls useUser() immediately sees the new state.
   */
  const [actions] = useState({
    updateUser: (user, authToken = "" as any) => {
      localStorage.setItem(AUTH_USER, JSON.stringify(user));
      localStorage.setItem(AUTH_TOKEN, authToken);
      setStore({ user, authToken });
      mutate({ success: true, user, message: null }, false);
    },
    unsetUser: () => {
      localStorage.removeItem(AUTH_USER);
      localStorage.removeItem(AUTH_TOKEN);
      localStorage.removeItem(AUTH_TIMESTAMP);
      localStorage.removeItem(USER_PROMPT_INPUT_MAP);
      setStore({ user: null, authToken: null });
      mutate({ success: false, user: null, message: null }, false);
    },
  });

  const value = useMemo(() => ({ store, actions }), [store, actions]);

  return (
    <AuthContext.Provider value={value}>
      {props.children}
    </AuthContext.Provider>
  );
}
