// SPDX-License-Identifier: MIT
// Purpose: Admin dashboard for politician sync monitoring
// Docs: index.doc.md
import React from "react";
import { useTranslation } from "react-i18next";
import SettingsSidebar from "@/components/SettingsSidebar";
import usePoliticianSync from "@/hooks/usePoliticianSync";
import { ArrowsClockwise } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { XCircle } from "@phosphor-icons/react/dist/csr/XCircle";
import { TrendUp } from "@phosphor-icons/react/dist/csr/TrendUp";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import CTAButton from "@/components/lib/CTAButton";
import showToast from "@/utils/toast";
import { baseHeaders } from "@/utils/request";
import AdminContentPanel from "@/components/AdminContentPanel";

interface SyncStatus {
  lastSync: string | null;
  isHealthy: boolean;
  sources: Array<{
    source: string;
    status: string;
    lastAttempt: string;
    lastSuccess: string | null;
    itemsProcessed: number;
    itemsFailed: number;
    error: string | null;
    isHealthy: boolean;
  }>;
  retryQueue: Array<{
    phase: string;
    attempts: number;
    status: string;
    nextRetryAt: string | null;
    lastError: string | null;
  }>;
}

interface PoliticianStats {
  politicians: number;
  speeches: number;
  votes: number;
}

function getStatusIcon(status: string) {
  if (status === "completed" || status === "ok") {
    return <CheckCircle className="h-5 w-5 text-green-400" weight="fill" />;
  }
  if (status === "failed") {
    return <XCircle className="h-5 w-5 text-red-400" weight="fill" />;
  }
  if (status === "running") {
    return (
      <ArrowsClockwise
        className="h-5 w-5 text-yellow-400 animate-spin"
        weight="bold"
      />
    );
  }
  return <WarningCircle className="h-5 w-5 text-gray-400" weight="fill" />;
}

function getStatusBadgeClass(status: string) {
  if (status === "completed" || status === "ok") {
    return "bg-green-500/10 text-green-400 border-green-500/20";
  }
  if (status === "failed") {
    return "bg-red-500/10 text-red-400 border-red-500/20";
  }
  if (status === "running") {
    return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
  }
  return "bg-gray-500/10 text-gray-400 border-gray-500/20";
}

function formatDate(
  dateString: string | null,
  t: (key: string) => string,
  locale?: string,
) {
  if (!dateString) return t("politicianSync.never");
  const date = new Date(dateString);
  return date.toLocaleString(locale);
}

function formatRelativeTime(
  dateString: string | null,
  t: (key: string, opts?: any) => string,
) {
  if (!dateString) return t("politicianSync.never");
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return t("politicianSync.never");
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return t("politicianSync.justNow");
  if (diffMinutes < 60)
    return t("politicianSync.minutesAgo", { count: diffMinutes });
  if (diffHours < 24) return t("politicianSync.hoursAgo", { count: diffHours });
  return t("politicianSync.daysAgo", { count: Math.floor(diffHours / 24) });
}

export default function PoliticianSyncDashboard(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const { stats, syncStatus, isLoading, error, mutate } = usePoliticianSync();

  const handleManualSync = async () => {
    try {
      const res = await fetch("/api/politician/sync/trigger", {
        method: "POST",
        headers: {
          ...baseHeaders(),
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast(t("politicianSync.syncTriggered"), "success");
      mutate();
    } catch (e: any) {
      showToast(
        t("politicianSync.syncTriggerFailed", { error: e.message }),
        "error",
      );
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <SettingsSidebar />
      <AdminContentPanel>
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
          {/* Header */}
          <div className="w-full flex flex-col gap-y-2 pb-6 border-white/10 border-b-2">
            <div className="items-center flex gap-x-4 justify-between">
              <div className="flex items-center gap-x-4">
                <p className="text-lg leading-6 font-bold text-theme-text-primary">
                  {t("politicianSync.title")}
                </p>
                {syncStatus && (
                  <div
                    className={`flex items-center gap-x-1.5 px-2 py-1 rounded-full text-xs font-medium border ${
                      syncStatus.isHealthy
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}
                  >
                    {syncStatus.isHealthy ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5" weight="fill" />
                        {t("politicianSync.healthy")}
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5" weight="fill" />
                        {t("politicianSync.unhealthy")}
                      </>
                    )}
                  </div>
                )}
              </div>
              <CTAButton
                onClick={handleManualSync}
                className="text-theme-bg-chat"
              >
                <ArrowsClockwise className="h-4 w-4" weight="bold" />
                {t("politicianSync.syncNow")}
              </CTAButton>
            </div>
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary">
              {t("politicianSync.description")}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <StatCard
              title={t("politicianSync.statPoliticians")}
              value={stats?.politicians ?? 0}
              icon={<TrendUp className="h-5 w-5 text-blue-400" />}
              isLoading={isLoading}
            />
            <StatCard
              title={t("politicianSync.statSpeeches")}
              value={stats?.speeches ?? 0}
              icon={<TrendUp className="h-5 w-5 text-purple-400" />}
              isLoading={isLoading}
            />
            <StatCard
              title={t("politicianSync.statVotes")}
              value={stats?.votes ?? 0}
              icon={<TrendUp className="h-5 w-5 text-orange-400" />}
              isLoading={isLoading}
            />
          </div>

          {/* Source Status Cards */}
          <div className="mt-8">
            <h3 className="text-base font-semibold text-theme-text-primary mb-4">
              {t("politicianSync.sourceStatus")}
            </h3>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    height={160}
                    className="rounded-xl"
                    baseColor="var(--theme-bg-secondary)"
                    highlightColor="var(--theme-bg-primary)"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-red-400 text-sm">
                  {t("politicianSync.loadError")}: {error.message}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {syncStatus?.sources.map((source) => (
                  <div
                    key={source.source}
                    className="bg-theme-bg-primary rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-x-2">
                        {getStatusIcon(source.status)}
                        <span className="text-sm font-semibold text-theme-text-primary capitalize">
                          {source.source}
                        </span>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getStatusBadgeClass(source.status)}`}
                      >
                        {source.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-theme-text-secondary">
                        <span>{t("politicianSync.lastAttempt")}</span>
                        <span className="text-theme-text-primary">
                          {formatRelativeTime(source.lastAttempt, t)}
                        </span>
                      </div>
                      <div className="flex justify-between text-theme-text-secondary">
                        <span>{t("politicianSync.lastSuccess")}</span>
                        <span className="text-theme-text-primary">
                          {formatRelativeTime(source.lastSuccess, t)}
                        </span>
                      </div>
                      <div className="flex justify-between text-theme-text-secondary">
                        <span>{t("politicianSync.itemsProcessed")}</span>
                        <span className="text-theme-text-primary">
                          {source.itemsProcessed}
                        </span>
                      </div>
                      {source.itemsFailed > 0 && (
                        <div className="flex justify-between text-red-400">
                          <span>{t("politicianSync.itemsFailed")}</span>
                          <span>{source.itemsFailed}</span>
                        </div>
                      )}
                      {source.error && (
                        <div className="mt-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                          <p className="text-red-400 text-xs font-mono line-clamp-2">
                            {source.error}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Retry Queue */}
          {syncStatus && syncStatus.retryQueue.length > 0 && (
            <div className="mt-8">
              <h3 className="text-base font-semibold text-theme-text-primary mb-4">
                {t("politicianSync.retryQueue")}
              </h3>
              <div className="bg-theme-bg-primary rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="text-theme-text-secondary text-xs uppercase border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3">{t("politicianSync.phase")}</th>
                      <th className="px-4 py-3">
                        {t("politicianSync.attempts")}
                      </th>
                      <th className="px-4 py-3">
                        {t("politicianSync.nextRetry")}
                      </th>
                      <th className="px-4 py-3">
                        {t("politicianSync.status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncStatus.retryQueue.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-white/5 last:border-0"
                      >
                        <td className="px-4 py-3 text-theme-text-primary capitalize">
                          {item.phase}
                        </td>
                        <td className="px-4 py-3 text-theme-text-secondary">
                          {item.attempts}
                        </td>
                        <td className="px-4 py-3 text-theme-text-secondary">
                          {item.nextRetryAt
                            ? formatRelativeTime(item.nextRetryAt, t)
                            : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getStatusBadgeClass(item.status)}`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Last Sync Info */}
          {syncStatus?.lastSync && (
            <div className="mt-8 text-xs text-theme-text-secondary">
              <p>
                {t("politicianSync.lastSync")}:{" "}
                {formatDate(syncStatus.lastSync, t, i18n.language)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactElement;
  isLoading: boolean;
}

function StatCard({
  title,
  value,
  icon,
  isLoading,
}: StatCardProps): React.ReactElement {
  return (
    <div className="bg-theme-bg-primary rounded-xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-theme-text-secondary uppercase font-medium">
          {title}
        </span>
        {icon}
      </div>
      {isLoading ? (
        <Skeleton
          height={32}
          width={60}
          baseColor="var(--theme-bg-secondary)"
          highlightColor="var(--theme-bg-primary)"
        />
      ) : (
        <p className="text-2xl font-bold text-theme-text-primary">
          {value.toLocaleString()}
        </p>
      )}
    </div>
  );
}
