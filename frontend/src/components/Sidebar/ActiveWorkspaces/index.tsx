// SPDX-License-Identifier: MIT
import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { Link, useMatch, useParams } from "react-router";
import { CalendarBlank } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { EnvelopeSimple } from "@phosphor-icons/react/dist/csr/EnvelopeSimple";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import useWorkspaces from "@/hooks/useWorkspaces";
import useUser from "@/hooks/useUser";
import { LAST_VISITED_WORKSPACE } from "@/utils/constants";
import { safeJsonParse } from "@/utils/request";
import { safeGetItem } from "@/utils/safeStorage";
import paths from "@/utils/paths";
import ThreadContainer from "./ThreadContainer";

type WorkspaceSummary = {
  id?: number | string;
  slug: string;
  name?: string;
};

type StoredWorkspace = { slug?: string } | null;

function ActiveWorkspaces() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const { user } = useUser();
  const { workspaces, isLoading } = useWorkspaces({ ordered: true });
  const isHomePage = !!useMatch("/");
  const isEmailCenter = !!useMatch("/mail");

  const activeWorkspace = useMemo(() => {
    const current = workspaces.find(
      (workspace: WorkspaceSummary) => workspace.slug === slug,
    );
    if (current) return current;
    if (!isHomePage && !isEmailCenter) return null;
    const last = safeJsonParse(
      safeGetItem(LAST_VISITED_WORKSPACE),
      null,
    ) as StoredWorkspace;
    return (
      workspaces.find(
        (workspace: WorkspaceSummary) => workspace.slug === last?.slug,
      ) ||
      workspaces[0] ||
      null
    );
  }, [isEmailCenter, isHomePage, slug, workspaces]);

  if (isLoading) {
    return (
      <Skeleton
        height={30}
        width="100%"
        count={6}
        baseColor="var(--theme-sidebar-item-default)"
        highlightColor="var(--theme-sidebar-item-hover)"
        className="my-1"
      />
    );
  }

  if (!activeWorkspace && user?.role === "default") return null;

  return (
    <div
      className="min-h-0 flex-1"
      role="region"
      aria-label={t("sidebar.mainNavigation", "Navigation")}
    >
      <div className="flex flex-col gap-0.5 pt-1">
        {activeWorkspace && (
          <ThreadContainer
            key={activeWorkspace.slug}
            workspace={activeWorkspace}
            isActive
            isVirtualThread={isHomePage}
          />
        )}
        {user?.role !== "default" && (
          <div className="mt-1 flex items-center gap-1">
            <Link
              to={paths.emailCenter()}
              className={`flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-sm font-medium transition-colors ${
                isEmailCenter
                  ? "bg-theme-sidebar-item-selected text-theme-sidebar-item-text-active"
                  : "text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary"
              }`}
            >
              <EnvelopeSimple size={15} weight={isEmailCenter ? "fill" : "regular"} />
              <span className="flex-1 truncate">{t("sidebar.email", "E-Mails")}</span>
            </Link>
            <Link
              to={`${paths.emailCenter()}?new=workflow`}
              aria-label="Neuen E-Mail-Workflow erstellen"
              title="Neuen E-Mail-Workflow erstellen"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary"
            >
              <Plus size={13} weight="bold" />
            </Link>
          </div>
        )}
        {user?.role !== "default" && (
          <Link
            to={paths.settings.scheduledJobs()}
            className="mt-1 flex h-8 items-center gap-2 rounded-lg px-2 text-sm font-medium text-theme-text-secondary transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary"
          >
            <CalendarBlank size={15} />
            <span className="flex-1">{t("sidebar.scheduled", "Aufgaben")}</span>
          </Link>
        )}
      </div>
    </div>
  );
}

export default memo(ActiveWorkspaces);
