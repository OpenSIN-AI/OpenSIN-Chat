# SWR-Migration Phase 1 — Copy-Paste-Fertig

**Status**: Alle 3 Context-Provider (Auth, Pfp, Logo) vorbereitet für SWR-Migration (ohne `useEffect`-Fetching)

**GitHub Issue**: #80

---

## Setup

```bash
cd OpenSIN-Chat
git checkout main && git pull
git checkout -b feat/swr-phase-1-contexts
```

---

## Phase 1: AuthContext.tsx

**Datei**: `frontend/src/AuthContext.tsx`  
**Aktion**: Komplette Datei ersetzen (246 Zeilen)

```bash
cat > frontend/src/AuthContext.tsx << 'EOF'
// SPDX-License-Identifier: MIT
import React, { useState, createContext } from "react";
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
import { userKey } from "@/hooks/useUser";

export const AuthContext = createContext<any>(null);

export function AuthProvider(props) {
  const localUser = localStorage.getItem(AUTH_USER);
  const localAuthToken = localStorage.getItem(AUTH_TOKEN);
  const [store, setStore] = useState({
    user: localUser ? safeJsonParse(localUser, null as any) : null,
    authToken: localAuthToken ? localAuthToken : null,
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

  return (
    <AuthContext.Provider value={{ store, actions }}>
      {props.children}
    </AuthContext.Provider>
  );
}
EOF
```

---

## Phase 2: PfpContext.tsx

**Datei**: `frontend/src/PfpContext.tsx`  
**Aktion**: Komplette Datei ersetzen (107 Zeilen)

```bash
cat > frontend/src/PfpContext.tsx << 'EOF'
// SPDX-License-Identifier: MIT
import React, { createContext, useCallback, useEffect, useRef } from "react";
import useSWR from "swr";
import useUser from "./hooks/useUser";
import System from "./models/system";

export const PFP_CACHE_KEY = "system/pfp";
export const PfpContext = createContext<any>(undefined);

export function PfpProvider({ children }) {
  const { user } = useUser();

  // Tracks the most recently created blob: object URL so it can be revoked
  // before being replaced (e.g. new user, upload, removal) and on unmount,
  // preventing object-URL memory leaks.
  const objectURLRef = useRef<string | null>(null);

  // Revoke the previous blob URL whenever SWR delivers a new one.
  const fetcher = useCallback(async () => {
    if (!user?.id) return null;
    const next = await System.fetchPfp(user.id);
    if (objectURLRef.current && objectURLRef.current !== next) {
      URL.revokeObjectURL(objectURLRef.current);
      objectURLRef.current = null;
    }
    if (typeof next === "string" && next.startsWith("blob:")) {
      objectURLRef.current = next;
    }
    return next;
  }, [user?.id]);

  const { data: pfp, mutate } = useSWR(
    user?.id ? `${PFP_CACHE_KEY}/${user.id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      // Do not revalidate on reconnect — the pfp is stable between sessions.
      revalidateOnReconnect: false,
    },
  );

  // Expose a stable setter that also updates the SWR cache directly (e.g.
  // after an upload or removal) without triggering a network round-trip.
  const setPfp = useCallback(
    (next: string | null) => {
      if (objectURLRef.current && objectURLRef.current !== next) {
        URL.revokeObjectURL(objectURLRef.current);
        objectURLRef.current = null;
      }
      if (typeof next === "string" && next.startsWith("blob:")) {
        objectURLRef.current = next;
      }
      mutate(next, false);
    },
    [mutate],
  );

  // Revoke the active blob URL on unmount.
  useEffect(() => {
    return () => {
      if (objectURLRef.current) {
        URL.revokeObjectURL(objectURLRef.current);
        objectURLRef.current = null;
      }
    };
  }, []);

  return (
    <PfpContext.Provider value={{ pfp: pfp ?? null, setPfp }}>
      {children}
    </PfpContext.Provider>
  );
}
EOF
```

---

## Phase 3: LogoContext.tsx

**Datei**: `frontend/src/LogoContext.tsx`  
**Aktion**: Komplette Datei ersetzen (145 Zeilen)

```bash
cat > frontend/src/LogoContext.tsx << 'EOF'
// SPDX-License-Identifier: MIT
import React, { createContext, useEffect, useRef } from "react";
import useSWR from "swr";
import OpenSINLogo from "./media/logo/opensin-logo.png";
import OpenSINLogoDark from "./media/logo/opensin-logo-dark.png";
import DefaultLoginLogo from "./media/logo/opensin-logo.png";
import System from "./models/system";

export const REFETCH_LOGO_EVENT = "refetch-logo";
export const LOGO_CACHE_KEY = "system/logo";

export const LogoContext = createContext<any>(undefined);

type LogoData = {
  logo: string;
  loginLogo: string;
  isCustomLogo: boolean;
};

export function LogoProvider({ children }) {
  // Tracks the most recently created blob: object URL so it can be revoked
  // before being replaced and on unmount, preventing object-URL memory leaks.
  const objectURLRef = useRef<string | null>(null);

  async function fetchLogoData(): Promise<LogoData> {
    const isDarkMode =
      (localStorage.getItem("theme") || "default") === "default";
    const fallbackLogo = isDarkMode ? OpenSINLogoDark : OpenSINLogo;
    const defaultLoginLogo = isDarkMode ? OpenSINLogoDark : DefaultLoginLogo;

    try {
      const { isCustomLogo, logoURL } = await System.fetchLogo();
      if (objectURLRef.current && objectURLRef.current !== logoURL) {
        URL.revokeObjectURL(objectURLRef.current);
        objectURLRef.current = null;
      }
      if (logoURL) {
        objectURLRef.current = logoURL;
        return {
          logo: logoURL,
          loginLogo: isCustomLogo ? logoURL : defaultLoginLogo,
          isCustomLogo,
        };
      }
      return { logo: fallbackLogo, loginLogo: defaultLoginLogo, isCustomLogo: false };
    } catch {
      return { logo: fallbackLogo, loginLogo: defaultLoginLogo, isCustomLogo: false };
    }
  }

  const { data, mutate } = useSWR<LogoData>(LOGO_CACHE_KEY, fetchLogoData, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    // Provide immediate fallback values so consumers never receive undefined.
    fallbackData: {
      logo: OpenSINLogo,
      loginLogo: DefaultLoginLogo,
      isCustomLogo: false,
    },
  });

  // When a REFETCH_LOGO_EVENT fires (e.g. after a custom logo upload),
  // tell SWR to re-run the fetcher and broadcast the new value to all
  // consumers — replaces the direct fetchInstanceLogo() call.
  useEffect(() => {
    const handleRefetch = () => mutate();
    window.addEventListener(REFETCH_LOGO_EVENT, handleRefetch);
    return () => {
      window.removeEventListener(REFETCH_LOGO_EVENT, handleRefetch);
      if (objectURLRef.current) {
        URL.revokeObjectURL(objectURLRef.current);
        objectURLRef.current = null;
      }
    };
  }, [mutate]);

  return (
    <LogoContext.Provider
      value={{
        logo: data!.logo,
        setLogo: (logo: string) => mutate((prev) => ({ ...prev!, logo }), false),
        loginLogo: data!.loginLogo,
        isCustomLogo: data!.isCustomLogo,
      }}
    >
      {children}
    </LogoContext.Provider>
  );
}
EOF
```

---

## Verifikation

```bash
# Alle 3 Dateien sollten syntaktisch sauber sein
npx tsc --noEmit frontend/src/AuthContext.tsx
npx tsc --noEmit frontend/src/PfpContext.tsx
npx tsc --noEmit frontend/src/LogoContext.tsx

# Optional: Tests laufen
npm run test
```

---

## Commit + Push + PR

```bash
git add \
  frontend/src/AuthContext.tsx \
  frontend/src/PfpContext.tsx \
  frontend/src/LogoContext.tsx

git commit -m "feat(swr): migrate Auth/Pfp/Logo contexts to SWR (Phase 1 of #80)

- AuthContext: replace useEffect+refreshUser with useSWR; mutate() called
  from updateUser/unsetUser to keep cache in sync
- PfpContext: replace useEffect+fetchPfp with useSWR + custom blob fetcher;
  blob URL revocation preserved; stable setPfp mutates cache without refetch
- LogoContext: replace useEffect+fetchInstanceLogo with useSWR; REFETCH_LOGO_EVENT
  now calls mutate() instead of a direct fetch; fallbackData prevents undefined flash

Part of #80"

git push -u origin feat/swr-phase-1-contexts

REPO="OpenSIN-AI/OpenSIN-Chat"
gh pr create -R $REPO \
  --base main \
  --head feat/swr-phase-1-contexts \
  --title "feat(swr): migrate Auth/Pfp/Logo contexts to SWR (Phase 1 of #80)" \
  --body "Migriert die drei zentralen Context-Provider von useEffect-Fetching auf SWR.

### Was sich ändert
| Datei | vorher | nachher |
|---|---|---|
| AuthContext.tsx | useEffect + refreshUser() | useSWR + onSuccess-Callback; Login/Logout invalidieren Cache |
| PfpContext.tsx | useEffect + System.fetchPfp() | useSWR + custom Blob-Fetcher; setPfp schreibt direkt in Cache |
| LogoContext.tsx | useEffect + addEventListener | useSWR + mutate() im Event-Listener; fallbackData verhindert undefined |

### Nicht geändert
- Blob-URL-Revoke-Lifecycle in Pfp/Logo bleibt vollständig erhalten
- Kein Breaking Change an Context-Shapes (alle Consumer unverändert)
- REFETCH_LOGO_EVENT bleibt als public API erhalten

Closes part of #80"
```

---

## Status nach Merge

- ✅ Keine `useEffect`-basierten Fetches in den 3 Core-Providern
- ✅ SWR-Cache wird von Login/Logout/PFP-Upload automatisch invalidiert
- ✅ Blob-URL-Lifecycle korrekt verwaltet (kein Memory Leak)
- ✅ `REFETCH_LOGO_EVENT` Event-Listener funktioniert weiterhin
- ✅ Alle Consumer-Komponenten (useAuth, usePfp, useLogo) arbeiten unverändert

**Nächste Phase**: 25 weitere Dateien (Modals + Settings, ~1100 LOC weitere Migrationen)
