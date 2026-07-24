// SPDX-License-Identifier: MIT
// Purpose: React hook for OAuth connector management.
//          Handles connect (popup), disconnect, and listing connected accounts.
//          Gracefully handles "coming_soon" when OAuth is not configured.
import { useCallback, useEffect, useState } from "react";
import { AUTH_TOKEN } from "@/utils/constants";
import { safeGetItem } from "@/utils/safeStorage";

const API_BASE = "/api";

function authHeaders(): Record<string, string> {
  const token = safeGetItem(AUTH_TOKEN);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ConnectorAccount {
  id: number;
  provider: string;
  provider_account: string | null;
  scopes: string;
  status: string;
  expires_at: string | null;
  updated_at: string;
}

export interface UseConnectorResult {
  accounts: ConnectorAccount[];
  available: boolean;
  busy: boolean;
  connect: (product: string) => Promise<boolean>;
  disconnect: (account?: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useConnector(provider: string): UseConnectorResult {
  const [accounts, setAccounts] = useState<ConnectorAccount[]>([]);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/connectors`, {
        headers: authHeaders(),
      });
      const j = await r.json();
      if (j.success) {
        setAccounts(
          (j.accounts || []).filter(
            (a: ConnectorAccount) => a.provider === provider,
          ),
        );
        setAvailable(j.available?.[provider] ?? false);
      }
    } catch {
      // silently fail — app works without connectors
    }
  }, [provider]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const connect = useCallback(
    async (product: string): Promise<boolean> => {
      setBusy(true);
      try {
        const r = await fetch(
          `${API_BASE}/connectors/${provider}/start?product=${product}`,
          { headers: authHeaders() },
        );
        const j = await r.json();

        // Graceful degradation: coming_soon
        if (j.status === "coming_soon" || !j.success) {
          setBusy(false);
          return false;
        }

        const popup = window.open(
          j.authorizeUrl,
          "oauth",
          "width=520,height=680",
        );

        return new Promise<boolean>((resolve) => {
          let resolved = false;
          function onMsg(e: MessageEvent) {
            if (e.origin !== window.location.origin) return;
            if (!e.data || e.data.provider !== provider) return;
            if (resolved) return;
            resolved = true;
            window.removeEventListener("message", onMsg);
            clearInterval(iv);
            setBusy(false);
            if (e.data.ok) {
              refresh();
              resolve(true);
            } else {
              resolve(false);
            }
          }
          window.addEventListener("message", onMsg);

          // Detect manual popup close
          const iv = setInterval(() => {
            if (popup?.closed) {
              if (resolved) return;
              resolved = true;
              clearInterval(iv);
              window.removeEventListener("message", onMsg);
              setBusy(false);
              resolve(false);
            }
          }, 500);
        });
      } catch {
        setBusy(false);
        return false;
      }
    },
    [provider, refresh],
  );

  const disconnect = useCallback(
    async (account?: string) => {
      try {
        await fetch(`${API_BASE}/connectors/${provider}/disconnect`, {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ account }),
        });
        refresh();
      } catch (e: any) {
        console.warn("[useConnector] non-fatal error:", e?.message || e);
      }
    },
    [provider, refresh],
  );

  return { accounts, available, busy, connect, disconnect, refresh };
}
