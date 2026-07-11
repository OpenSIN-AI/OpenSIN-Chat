// SPDX-License-Identifier: MIT
import { memo, useMemo } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { useMatch, useParams } from "react-router-dom";
import useWorkspaces from "@/hooks/useWorkspaces";
import { LAST_VISITED_WORKSPACE } from "@/utils/constants";
import { safeJsonParse } from "@/utils/request";
import { safeGetItem } from "@/utils/safeStorage";
import ThreadContainer from "./ThreadContainer";

function ActiveWorkspaces() {
  const { slug } = useParams();
  const { workspaces, isLoading } = useWorkspaces({ ordered: true });
  const isHomePage = !!useMatch("/");

  const activeWorkspace = useMemo(() => {
    const current = workspaces.find(
      (workspace: any) => workspace.slug === slug,
    );
    if (current) return current;
    if (!isHomePage) return null;
    const last = safeJsonParse(
      safeGetItem(LAST_VISITED_WORKSPACE),
      null as any,
    );
    return (
      workspaces.find((workspace: any) => workspace.slug === last?.slug) ||
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

  if (!activeWorkspace) return null;

  return (
    <div
      className="min-h-0 flex-1"
      role="region"
      aria-label={activeWorkspace.name}
    >
      <ThreadContainer
        workspace={activeWorkspace}
        isActive={true}
        isVirtualThread={isHomePage}
      />
    </div>
  );
}

export default memo(ActiveWorkspaces);
