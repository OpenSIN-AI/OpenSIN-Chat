// SPDX-License-Identifier: MIT

import type { NavigateFunction } from "react-router";
import { setPendingSearchNavigation } from "./pending-navigation";
import type { GlobalSearchResult } from "./types";

function workspaceHref(workspaceSlug: string) {
  return `/workspace/${encodeURIComponent(workspaceSlug)}`;
}

function threadHref(workspaceSlug: string, threadSlug: string) {
  return `${workspaceHref(workspaceSlug)}/t/${encodeURIComponent(threadSlug)}`;
}

export function navigateToSearchResult({
  result,
  navigate,
}: {
  result: GlobalSearchResult;
  navigate: NavigateFunction;
}) {
  const target = result.target;
  const workspaceSlug = target.workspaceSlug || result.workspaceSlug;

  if (!workspaceSlug) return;

  setPendingSearchNavigation({
    workspaceSlug,
    threadSlug: target.threadSlug,
    chatId: target.chatId,
    sourceId: target.sourceId,
    noteId: target.noteId,
    artifactUuid: target.artifactUuid,
    sidebar: target.sidebar || target.sourcePanel,
  });

  if (target.threadSlug) {
    navigate(threadHref(workspaceSlug, target.threadSlug));
    return;
  }

  navigate(workspaceHref(workspaceSlug));
}
