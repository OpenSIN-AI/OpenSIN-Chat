// SPDX-License-Identifier: MIT
import { useState } from "react";
import { isMobile } from "react-device-detect";
import Sidebar from "@/components/SettingsSidebar";
import ProviderKeyStatusPanel from "@/components/ProviderKeyStatusPanel";
import ProviderStatus from "@/models/providerStatus";
import showToast from "@/utils/toast";
import { Plugs, PlugsConnected, CircleNotch } from "@phosphor-icons/react";
import useProviderKeyStatus from "@/hooks/useProviderKeyStatus";

function ConnectivityRow({ result }) {
  if (!result.configured) {
    return (
      <li className="flex items-center justify-between gap-x-4 rounded-lg bg-theme-bg-secondary px-3 py-2 opacity-60">
        <span className="text-sm text-theme-text-primary">{result.name}</span>
        <span className="text-xs text-theme-text-secondary">
          Nicht konfiguriert
        </span>
      </li>
    );
  }
  return (
    <li className="flex items-center justify-between gap-x-4 rounded-lg bg-theme-bg-secondary px-3 py-2">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-theme-text-primary">
          {result.name}
        </span>
        <span className="truncate font-mono text-xs text-theme-text-secondary">
          {result.baseUrl}
        </span>
      </div>
      {result.reachable ? (
        <span className="flex shrink-0 items-center gap-x-1 text-xs text-green-500">
          <PlugsConnected size={14} weight="fill" />
          {`Erreichbar (${result.latencyMs}ms, HTTP ${result.status})`}
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-x-1 text-xs text-red-400">
          <Plugs size={14} weight="fill" />
          {result.error || "Nicht erreichbar"}
        </span>
      )}
    </li>
  );
}

function ConnectivityPanel() {
  const [results, setResults] = useState(null);
  const [checking, setChecking] = useState(false);
  const { providers } = useProviderKeyStatus();
  const configuredCount = providers.filter((p) => p.configured).length;

  const runProbe = async () => {
    setChecking(true);
    const res = await ProviderStatus.connectivity();
    setChecking(false);
    if (res.error) {
      showToast(`Verbindungstest fehlgeschlagen: ${res.error}`, "error");
      return;
    }
    setResults(res.results);
    const reachable = res.results.filter((r) => r.reachable).length;
    const configured = res.results.filter((r) => r.configured).length;
    showToast(
      `Verbindungstest abgeschlossen: ${reachable}/${configured} konfigurierte Provider erreichbar.`,
      reachable === configured ? "success" : "warning",
    );
  };

  return (
    <section
      aria-label="Provider connectivity"
      className="flex w-full flex-col gap-y-3 rounded-xl border border-theme-sidebar-border bg-theme-bg-primary p-4"
    >
      <header className="flex items-center justify-between gap-x-2">
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold text-theme-text-primary">
            Verbindungstest
          </h3>
          <p className="text-xs text-theme-text-secondary">
            {`Prüft aktiv, ob die Base-URLs der ${configuredCount} konfigurierten Provider antworten (Timeout 4s).`}
          </p>
        </div>
        <button
          type="button"
          onClick={runProbe}
          disabled={checking}
          className="flex items-center gap-x-1.5 rounded-lg border border-theme-sidebar-border px-3 py-1.5 text-xs text-theme-text-primary hover:bg-theme-bg-secondary disabled:opacity-50"
        >
          {checking ? (
            <CircleNotch size={14} className="animate-spin" />
          ) : (
            <PlugsConnected size={14} />
          )}
          {checking ? "Teste…" : "Jetzt testen"}
        </button>
      </header>

      {results === null && !checking && (
        <p className="rounded-lg bg-theme-bg-secondary px-3 py-2 text-xs text-theme-text-secondary">
          {
            "Noch kein Test ausgeführt. Klicke auf \u201EJetzt testen\u201C, um alle konfigurierten Provider zu prüfen."
          }
        </p>
      )}

      {results !== null && (
        <ul className="flex flex-col gap-y-1.5">
          {results.map((r) => (
            <ConnectivityRow key={r.provider} result={r} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default function SystemHealth() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-theme-bg-container">
      <Sidebar />
      <div
        style={{ height: isMobile ? "100%" : "calc(100% - 32px)" }}
        className="relative w-full overflow-y-scroll bg-theme-bg-secondary no-scroll md:my-[16px] md:ml-[2px] md:mr-[16px] md:rounded-[16px]"
      >
        <div className="flex w-full flex-col gap-y-6 p-4 pt-16 md:p-8 md:pt-6">
          <div className="flex flex-col gap-y-1">
            <h1 className="text-lg font-bold leading-6 text-theme-text-primary">
              System Health
            </h1>
            <p className="text-xs leading-[18px] text-theme-text-secondary text-pretty">
              Diagnose für lokale LLM-Provider und Speicherpfade:
              API-Key-Status, aktive Fallbacks und Erreichbarkeit der
              konfigurierten Endpunkte.
            </p>
          </div>
          <ProviderKeyStatusPanel />
          <ConnectivityPanel />
        </div>
      </div>
    </div>
  );
}
