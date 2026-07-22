// SPDX-License-Identifier: MIT
import React, { createContext, useMemo, useState } from "react";
import useSWR from "swr";
import {
  AUTH_TIMESTAMP,
  AUTH_TOKEN,
  AUTH_USER,
  USER_PROMPT_INPUT_MAP,
} from "@/utils/constants";
import System from "./models/system";
import { useNavigate } from "react-router";
import { safeJsonParse } from "@/utils/request";
import { safeGetItem, safeRemoveItem, safeSetItem } from "@/utils/safeStorage";

export interface AuthUser {
  id?: number;
  username?: string;
  role?: string;
  suspended?: boolean;
  [key: string]: unknown;
}

interface AuthStore {
  user: AuthUser | null;
  authToken: string | null;
}

interface RefreshUserResponse {
  success: boolean;
  user: AuthUser | null;
  message?: string | null;
}

interface AuthActions {
  updateUser: (user: AuthUser, authToken?: string | null) => void;
  unsetUser: () => void;
}

export interface AuthContextValue {
  store: AuthStore;
  actions: AuthActions;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
export const userKey = "system/refresh-user";

function clearStoredAuth(): void {
  safeRemoveItem(AUTH_USER);
  safeRemoveItem(AUTH_TOKEN);
  safeRemoveItem(AUTH_TIMESTAMP);
  safeRemoveItem(USER_PROMPT_INPUT_MAP);
}

export function AuthProvider(props: { children: React.ReactNode }) {
  const [store, setStore] = useState<AuthStore>(() => {
    const localUser = safeGetItem(AUTH_USER);
    return {
      user: localUser
        ? safeJsonParse<AuthUser | null>(localUser, null)
        : null,
      authToken: safeGetItem(AUTH_TOKEN),
    };
  });

  const navigate = useNavigate();
  const { mutate } = useSWR<RefreshUserResponse>(
    store.authToken ? userKey : null,
    () => System.refreshUser(),
    {
      revalidateOnFocus: true,
      dedupingInterval: 2000,
      onSuccess(data) {
        if (!data) return;

        if (!data.success) {
          clearStoredAuth();
          setStore({ user: null, authToken: null });
          navigate("/login");
          return;
        }

        if (data.user === null) {
          safeRemoveItem(AUTH_USER);
          setStore((previous) => ({ ...previous, user: null }));
          return;
        }

        safeSetItem(AUTH_USER, JSON.stringify(data.user));
        setStore((previous) => ({ ...previous, user: data.user }));
      },
    },
  );

  const actions = useMemo<AuthActions>(
    () => ({
      updateUser(user, authToken) {
        const nextAuthToken =
          authToken === undefined ? safeGetItem(AUTH_TOKEN) : authToken;

        safeSetItem(AUTH_USER, JSON.stringify(user));
        if (nextAuthToken) safeSetItem(AUTH_TOKEN, nextAuthToken);
        else safeRemoveItem(AUTH_TOKEN);

        setStore({ user, authToken: nextAuthToken });
        void mutate({ success: true, user, message: null }, false);
      },
      unsetUser() {
        clearStoredAuth();
        setStore({ user: null, authToken: null });
        void mutate({ success: false, user: null, message: null }, false);
      },
    }),
    [mutate],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ store, actions }),
    [actions, store],
  );

  return (
    <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
  );
}
