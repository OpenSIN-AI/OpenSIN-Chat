// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import { useState } from "react";
import { isMobile } from "react-device-detect";
import Sidebar from "@/components/SettingsSidebar";
import ProviderKeyStatusPanel from "@/components/ProviderKeyStatusPanel";
import ProviderStatus from "@/models/providerStatus";
import showToast from "@/utils/toast";
import { Plugs } from "@phosphor-icons/react/dist/csr/Plugs";
import { PlugsConnected } from "@phosphor-icons/react/dist/csr/PlugsConnected";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import useProviderKeyStatus from "@/hooks/useProviderKeyStatus";
import { useTranslation } from "react-i18next";

type ConnectivityResult = {
  name: string;
  configured: boolean;
  baseUrl?: string;
  reachable?: boolean;
  latencyMs?: number;
  status?: number;
  error?: string;
  provider: string;
};

type ConnectivityRowProps = {
  result: ConnectivityResult;
};

function ConnectivityRow({ result }: ConnectivityRowProps): JSX.Element {
  const { t } = useTranslation();
  if (!result.configured) {
    return (
      <li className="flex items-center justify-between gap-x-4 rounded-lg bg-theme-bg-secondary px-3 py-2 opacity-60">
        <span className="text-sm text-theme-text-primary">{result.name}</span>
        <span className="text-xs text-theme-text-secondary">
          {t("systemHealth.notConfigured")}
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
          {t("systemHealth.reachable", {
            latencyMs: result.latencyMs,
            status: result.status,
          })}
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-x-1 text-xs text-red-400">
          <Plugs size={14} weight="fill" />
          {result.error || t("systemHealth.notReachable")}
        </span>
      )}
    </li>
  );
}

function ConnectivityPanel(): JSX.Element {
  const { t } = useTranslation();
  const [results, setResults] = useState<ConnectivityResult[] | null>(null);
  const [checking, setChecking] = useState(false);
  const { providers } = useProviderKeyStatus();
  const configuredCount = providers.filter((p: any) => p.configured).length;

  const runProbe = async () => {
    setChecking(true);
    const res = await ProviderStatus.connectivity();
    setChecking(false);
    if (res.error) {
      showToast(t("systemHealth.probeFailed", { error: res.error }), "error");
      return;
    }
    setResults(res.results);
    const reachable = res.results.filter(
      (r: ConnectivityResult) => r.reachable,
    ).length;
    const configured = res.results.filter(
      (r: ConnectivityResult) => r.configured,
    ).length;
    showToast(
      t("systemHealth.probeComplete", { reachable, configured }),
      reachable === configured ? "success" : "warning",
    );
  };

  return (
    <section
      aria-label={t("common.providerConnectivity")}
      className="flex w-full flex-col gap-y-3 rounded-xl border border-theme-sidebar-border bg-theme-bg-primary p-4"
    >
      <header className="flex items-center justify-between gap-x-2">
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold text-theme-text-primary">
            {t("systemHealth.connectivityTest")}
          </h3>
          <p className="text-xs text-theme-text-secondary">
            {t("systemHealth.connectivityTestDescription", {
              count: configuredCount,
            })}
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
          {checking ? t("systemHealth.testing") : t("systemHealth.testNow")}
        </button>
      </header>

      {results === null && !checking && (
        <p className="rounded-lg bg-theme-bg-secondary px-3 py-2 text-xs text-theme-text-secondary">
          {t("systemHealth.noTestYet")}
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

export default function SystemHealth(): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-theme-bg-container">
      <Sidebar />
      <div
        style={{ "--content-height": isMobile ? "100%" : "calc(100% - 32px)" }}
        className="h-[var(--content-height)] relative w-full overflow-y-scroll bg-theme-bg-secondary no-scroll md:my-[16px] md:ml-[2px] md:mr-[16px] md:rounded-[16px]"
      >
        <div className="flex w-full flex-col gap-y-6 p-4 pt-16 md:p-8 md:pt-6">
          <div className="flex flex-col gap-y-1">
            <h1 className="text-lg font-bold leading-6 text-theme-text-primary">
              {t("systemHealth.title")}
            </h1>
            <p className="text-xs leading-[18px] text-theme-text-secondary text-pretty">
              {t("systemHealth.description")}
            </p>
          </div>
          <ProviderKeyStatusPanel />
          <ConnectivityPanel />
        </div>
      </div>
    </div>
  );
}
