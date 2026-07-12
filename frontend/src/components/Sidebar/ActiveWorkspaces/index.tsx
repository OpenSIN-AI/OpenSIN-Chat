// SPDX-License-Identifier: MIT
import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { useMatch, useParams } from "react-router-dom";
import useWorkspaces from "@/hooks/useWorkspaces";
import { LAST_VISITED_WORKSPACE } from "@/utils/constants";
import { safeJsonParse } from "@/utils/request";
import { safeGetItem } from "@/utils/safeStorage";
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
  const { workspaces, isLoading } = useWorkspaces({ ordered: true });
  const isHomePage = !!useMatch("/");

  const activeWorkspace = useMemo(() => {
    const current = workspaces.find(
      (workspace: WorkspaceSummary) => workspace.slug === slug,
    );
    if (current) return current;
    if (!isHomePage) return null;
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
  }, [isHomePage, slug, workspaces]);

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

  if (workspaces.length === 0) return null;

  return (
    <div
      className="min-h-0 flex-1"
      role="region"
      aria-label={t("sidebar.projects")}
    >
      <p className="px-2 pb-1 pt-3 text-xs font-medium text-theme-placeholder">
        {t("sidebar.projects")}
      </p>
      <div className="flex flex-col gap-0.5">
        {workspaces.map((workspace: WorkspaceSummary) => (
          <ThreadContainer
            key={workspace.slug}
            workspace={workspace}
            isActive={activeWorkspace?.slug === workspace.slug}
            isVirtualThread={
              isHomePage && activeWorkspace?.slug === workspace.slug
            }
            codexProject
          />
        ))}
      </div>
    </div>
  );
}

export default memo(ActiveWorkspaces);
