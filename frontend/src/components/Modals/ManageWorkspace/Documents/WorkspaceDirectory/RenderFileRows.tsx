// SPDX-License-Identifier: MIT
import React from "react";

interface File {
  id: string;
  pinnedWorkspaces?: string[];
  [key: string]: any;
}

interface Folder {
  items: File[];
  [key: string]: any;
}

interface Files {
  items: Folder[];
}

interface MovedItem {
  id: string;
  [key: string]: any;
}

interface Workspace {
  id: string;
  [key: string]: any;
}

interface RenderFileRowsProps {
  files: Files;
  movedItems: MovedItem[];
  children: (props: { item: File; folder: Folder }) => React.ReactNode;
  workspace: Workspace;
}

export function RenderFileRows({ files, movedItems, children, workspace }: RenderFileRowsProps) {
  function sortMovedItemsAndFiles(a: File, b: File): number {
    const aIsMovedItem = movedItems.some((movedItem) => movedItem.id === a.id);
    const bIsMovedItem = movedItems.some((movedItem) => movedItem.id === b.id);
    if (aIsMovedItem && !bIsMovedItem) return -1;
    if (!aIsMovedItem && bIsMovedItem) return 1;

    // Sort pinned items to the top
    const aIsPinned = a.pinnedWorkspaces?.includes(workspace.id);
    const bIsPinned = b.pinnedWorkspaces?.includes(workspace.id);
    if (aIsPinned && !bIsPinned) return -1;
    if (!aIsPinned && bIsPinned) return 1;

    return 0;
  }

  return files.items
    .flatMap((folder) => folder.items)
    .sort(sortMovedItemsAndFiles)
    .map((item) => {
      const folder = files.items.find((f) => f.items.includes(item)) ?? {};
      return children({ item, folder });
    });
}
