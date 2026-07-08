// SPDX-License-Identifier: MIT
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import useSWR from "swr";
import useUser from "./hooks/useUser";
import System from "./models/system";

export const PFP_CACHE_KEY = "system/pfp";
export const PfpContext = createContext<any>(undefined);

export function PfpProvider({ children }: { children: React.ReactNode }) {
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

  const value = useMemo(() => ({ pfp: pfp ?? null, setPfp }), [pfp, setPfp]);

  return <PfpContext.Provider value={value}>{children}</PfpContext.Provider>;
}
