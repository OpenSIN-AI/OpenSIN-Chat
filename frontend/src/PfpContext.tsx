// SPDX-License-Identifier: MIT
import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import useUser from "./hooks/useUser";
import System from "./models/system";

export const PfpContext = createContext<any>(undefined);

export function PfpProvider({ children }) {
  const [pfp, _setPfp] = useState(null);
  const { user } = useUser();
  // Tracks the most recently created blob: object URL so it can be revoked
  // before being replaced (e.g. new user, upload, removal) and on unmount,
  // preventing object-URL memory leaks.
  const objectURLRef = useRef<string | null>(null);

  // Wraps the raw setter so any previously created blob URL is released
  // whenever the pfp is replaced or cleared.
  const setPfp = useCallback((next) => {
    if (objectURLRef.current && objectURLRef.current !== next) {
      URL.revokeObjectURL(objectURLRef.current);
      objectURLRef.current = null;
    }
    if (typeof next === "string" && next.startsWith("blob:"))
      objectURLRef.current = next;
    _setPfp(next);
  }, []);

  useEffect(() => {
    async function fetchPfp() {
      if (!user?.id) return;
      try {
        const pfpUrl = await System.fetchPfp(user.id);
        setPfp(pfpUrl);
      } catch (err) {
        setPfp(null);

        console.error("Failed to fetch pfp:", err);
      }
    }
    fetchPfp();
  }, [user?.id, setPfp]);

  useEffect(() => {
    return () => {
      if (objectURLRef.current) {
        URL.revokeObjectURL(objectURLRef.current);
        objectURLRef.current = null;
      }
    };
  }, []);

  return (
    <PfpContext.Provider value={{ pfp, setPfp }}>
      {children}
    </PfpContext.Provider>
  );
}
