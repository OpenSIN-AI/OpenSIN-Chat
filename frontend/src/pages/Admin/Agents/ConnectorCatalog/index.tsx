// SPDX-License-Identifier: MIT
// Purpose: Connector Catalog page — tile grid showing all connectable services.
//          Connected services show account + disconnect button.
//          Unconfigured providers show "Coming Soon" badge.
//          Coming-soon services show lock icon.
// Docs: ConnectorCatalog.doc.md
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { CONNECTOR_CATALOG, CatalogEntry } from "@/data/connectorCatalog";
import { useConnector } from "@/hooks/useConnector";
import {
  Envelope,
  HardDrive,
  FileText,
  Table,
  ChatCircle,
  Note,
  SquaresFour,
  Kanban,
  Handshake,
  Calendar,
  GithubLogo,
  Lock,
  CheckCircle,
  CircleNotch,
  Plugs,
} from "@phosphor-icons/react";
import showToast from "@/utils/toast";

// Map icon string names to components
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; weight?: string }>> = {
  envelope: Envelope,
  "hard-drive": HardDrive,
  "file-text": FileText,
  table: Table,
  "chat-circle": ChatCircle,
  note: Note,
  "squares-four": SquaresFour,
  kanban: Kanban,
  handshake: Handshake,
  calendar: Calendar,
  "github-logo": GithubLogo,
};

function ConnectorTile({
  entry,
  isAvailable,
  connectedAccount,
  onConnect,
  onDisconnect,
  busy,
}: {
  entry: CatalogEntry;
  isAvailable: boolean;
  connectedAccount: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const Icon = ICON_MAP[entry.icon] || Plugs;
  const isComingSoon = entry.comingSoon || !isAvailable;
  const isConnected = !!connectedAccount;

  return (
    <div
      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all
        ${isComingSoon
          ? "border-zinc-800 light:border-slate-200 opacity-60"
          : "border-zinc-700 light:border-slate-300 hover:border-[#009ee0] hover:shadow-lg"
        }
        bg-zinc-900 light:bg-white w-full`}
    >
      {/* Status badge */}
      {isConnected && (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-green-500">
          <CheckCircle size={14} weight="fill" />
        </div>
      )}
      {isComingSoon && (
        <div className="absolute top-2 right-2">
          <Lock size={14} className="text-theme-text-secondary" />
        </div>
      )}

      {/* Icon */}
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center
          ${entry.category === "google"
            ? "bg-white/10"
            : entry.category === "github"
              ? "bg-zinc-800 light:bg-slate-100"
              : "bg-zinc-800/50 light:bg-slate-100"
          }`}
      >
        <Icon size={24} weight={isComingSoon ? "thin" : "regular"} />
      </div>

      {/* Name + description */}
      <div className="text-center">
        <p className="text-sm font-medium text-theme-text-primary">{entry.name}</p>
        <p className="text-xs text-theme-text-secondary mt-0.5">{entry.description}</p>
      </div>

      {/* Action button */}
      {isComingSoon ? (
        <span className="text-xs text-theme-text-secondary mt-1">
          {t("connectors.coming_soon", "Coming Soon")}
        </span>
      ) : isConnected ? (
        <div className="flex flex-col items-center gap-1 mt-1 w-full">
          <span className="text-xs text-green-500 truncate max-w-full">
            {connectedAccount}
          </span>
          <button
            onClick={onDisconnect}
            className="text-xs text-red-400 hover:text-red-300"
          >
            {t("connectors.disconnect", "Trennen")}
          </button>
        </div>
      ) : (
        <button
          onClick={onConnect}
          disabled={busy}
          className="mt-1 px-3 py-1.5 bg-[#009ee0] text-white rounded-lg text-xs
                     disabled:opacity-50 hover:bg-[#0088c7] transition-colors"
        >
          {busy ? (
            <span className="flex items-center gap-1">
              <CircleNotch size={12} className="animate-spin" />
              {t("connectors.connecting", "Verbinde…")}
            </span>
          ) : (
            t("connectors.connect", "Verbinden")
          )}
        </button>
      )}
    </div>
  );
}

export default function ConnectorCatalog() {
  const { t } = useTranslation();
  const googleConnector = useConnector("google");
  const githubConnector = useConnector("github");

  // Group entries by category
  const categories = [
    { key: "google", label: "Google Workspace", entries: CONNECTOR_CATALOG.filter((e) => e.category === "google") },
    { key: "github", label: "GitHub", entries: CONNECTOR_CATALOG.filter((e) => e.category === "github") },
    { key: "coming_soon", label: t("connectors.coming_soon_section", "Demnächst verfügbar"), entries: CONNECTOR_CATALOG.filter((e) => e.category === "coming_soon") },
  ];

  function getConnector(entry: CatalogEntry) {
    if (entry.provider === "google") return googleConnector;
    if (entry.provider === "github") return githubConnector;
    return null;
  }

  function getConnectedAccount(entry: CatalogEntry): string | null {
    const c = getConnector(entry);
    if (!c) return null;
    const acc = c.accounts.find((a) => a.scopes?.includes(entry.product));
    return acc?.provider_account || null;
  }

  function handleConnect(entry: CatalogEntry) {
    const c = getConnector(entry);
    if (!c) return;
    c.connect(entry.product).then((ok) => {
      if (ok) showToast(`${entry.name} verbunden!`, "success");
      else if (c.available) showToast(`Verbindung zu ${entry.name} fehlgeschlagen.`, "error");
    });
  }

  function handleDisconnect(entry: CatalogEntry) {
    const c = getConnector(entry);
    if (!c) return;
    const acc = c.accounts.find((a) => a.scopes?.includes(entry.product));
    c.disconnect(acc?.provider_account);
    showToast(`${entry.name} getrennt.`, "info");
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Plugs size={24} className="text-[#009ee0]" />
        <h2 className="text-xl font-bold text-theme-text-primary">
          {t("connectors.title", "Connectors")}
        </h2>
      </div>

      <p className="text-sm text-theme-text-secondary">
        {t("connectors.description", "Verbinde deine Accounts, damit Agenten auf deine Daten zugreifen können.")}
      </p>

      {categories.map((cat) => (
        <div key={cat.key} className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-theme-text-primary border-b border-zinc-800 light:border-slate-200 pb-1">
            {cat.label}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {cat.entries.map((entry) => {
              const c = getConnector(entry);
              const isAvailable = entry.comingSoon ? false : (c?.available ?? false);
              return (
                <ConnectorTile
                  key={entry.id}
                  entry={entry}
                  isAvailable={isAvailable}
                  connectedAccount={getConnectedAccount(entry)}
                  onConnect={() => handleConnect(entry)}
                  onDisconnect={() => handleDisconnect(entry)}
                  busy={c?.busy ?? false}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
