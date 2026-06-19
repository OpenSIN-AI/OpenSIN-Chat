// SPDX-License-Identifier: MIT
import { ArrowsClockwise } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import useProviderKeyStatus from "@/hooks/useProviderKeyStatus";
import { useTranslation } from "react-i18next";

type Status = "key" | "fallback" | "unconfigured";

function StatusBadge({ status }: { status: Status }) {
  const { t } = useTranslation();
  if (status === "key") {
    return (
      <span className="flex items-center gap-x-1 rounded-full bg-theme-bg-primary px-2 py-0.5 text-xs text-theme-text-primary">
        <CheckCircle size={14} weight="fill" className="text-green-500" />
        {t("providerKeyStatus.status.keySet")}
      </span>
    );
  }
  if (status === "fallback") {
    return (
      <span className="flex items-center gap-x-1 rounded-full bg-theme-bg-primary px-2 py-0.5 text-xs text-theme-text-primary">
        <WarningCircle size={14} weight="fill" className="text-amber-500" />
        {t("providerKeyStatus.status.fallbackActive")}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-x-1 rounded-full bg-theme-bg-primary px-2 py-0.5 text-xs text-theme-text-secondary">
      <Info size={14} />
      {t("providerKeyStatus.status.notConfigured")}
    </span>
  );
}

interface Provider {
  name: string;
  envKey: string;
  configured: boolean;
  keySet: boolean;
  provider: string;
}

function ProviderRow({ provider }: { provider: Provider }) {
  const status: Status = !provider.configured
    ? "unconfigured"
    : provider.keySet
      ? "key"
      : "fallback";
  return (
    <li className="flex items-center justify-between gap-x-4 rounded-lg bg-theme-bg-secondary px-3 py-2">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-theme-text-primary">
          {provider.name}
        </span>
        <span className="truncate font-mono text-xs text-theme-text-secondary">
          {provider.envKey}
        </span>
      </div>
      <StatusBadge status={status} />
    </li>
  );
}

/**
 * Admin panel showing per-provider API-key status: whether a real key is
 * set, the safe placeholder fallback is active, or the provider is not
 * configured at all. Includes a storage-path health hint and manual refresh.
 */
export default function ProviderKeyStatusPanel() {
  const { t } = useTranslation();
  const { providers, paths, checkedAt, error, isLoading, refresh } =
    useProviderKeyStatus();

  const pathProblem =
    paths &&
    (!paths.storageExists || !paths.storageWritable || !paths.hotdirExists);

  return (
    <section
      aria-label={t("providerKeyStatus.section.ariaLabel")}
      className="flex w-full flex-col gap-y-3 rounded-xl border border-theme-sidebar-border bg-theme-bg-primary p-4"
    >
      <header className="flex items-center justify-between gap-x-2">
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold text-theme-text-primary">
            {t("providerKeyStatus.section.title")}
          </h3>
          <p className="text-xs text-theme-text-secondary">
            {t("providerKeyStatus.section.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isLoading}
          className="flex items-center gap-x-1 rounded-lg border border-theme-sidebar-border px-2.5 py-1.5 text-xs text-theme-text-primary hover:bg-theme-bg-secondary disabled:opacity-50"
          aria-label={t("providerKeyStatus.refresh.ariaLabel")}
        >
          <ArrowsClockwise
            size={14}
            className={isLoading ? "animate-spin" : ""}
          />
          {t("providerKeyStatus.refresh.button")}
        </button>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-theme-bg-secondary px-3 py-2 text-xs text-red-400"
        >
          {t("providerKeyStatus.error.loadFailed", { error })}
        </p>
      )}

      {!error && isLoading && (
        <p className="px-1 text-xs text-theme-text-secondary">
          {t("providerKeyStatus.loading")}
        </p>
      )}

      {!error && !isLoading && providers.length === 0 && (
        <p className="rounded-lg bg-theme-bg-secondary px-3 py-2 text-xs text-theme-text-secondary">
          {t("providerKeyStatus.empty")}
        </p>
      )}

      {providers.length > 0 && (
        <ul className="flex flex-col gap-y-1.5">
          {providers.map((p: Provider) => (
            <ProviderRow key={p.provider} provider={p} />
          ))}
        </ul>
      )}

      {pathProblem && (
        <p
          role="alert"
          className="flex items-start gap-x-1.5 rounded-lg bg-theme-bg-secondary px-3 py-2 text-xs text-amber-400"
        >
          <WarningCircle size={14} weight="fill" className="mt-0.5 shrink-0" />
          {t("providerKeyStatus.storagePath.problem", {
            path: paths.storagePath,
            exists: paths.storageExists ? t("common.yes") : t("common.no"),
            writable: paths.storageWritable ? t("common.yes") : t("common.no"),
            hotdir: paths.hotdirExists
              ? t("providerKeyStatus.storagePath.ok")
              : t("providerKeyStatus.storagePath.missing"),
          })}
        </p>
      )}

      {checkedAt && (
        <p className="text-right text-[11px] text-theme-text-secondary">
          {t("providerKeyStatus.lastChecked", {
            time: new Date(checkedAt).toLocaleTimeString(),
          })}
        </p>
      )}
    </section>
  );
}
