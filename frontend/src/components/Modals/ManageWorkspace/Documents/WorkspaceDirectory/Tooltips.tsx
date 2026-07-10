// SPDX-License-Identifier: MIT
import React from "react";
import { Tooltip } from "react-tooltip";
import { safeJsonParse } from "@/utils/request";

interface TooltipData {
  title: string;
  date: string;
  extension: string;
}

/**
 * Tooltips for the workspace directory components. Renders when the workspace directory is shown
 * or updated so that tooltips are attached as the items are changed.
 */
export function WorkspaceDocumentTooltips() {
  return (
    <>
      <Tooltip
        id="ws-directory-item"
        place="bottom"
        delayShow={800}
        className="tooltip invert light:invert-0 z-[99] max-w-[200px]"
        render={({ content }: { content: string }) => {
          const data = safeJsonParse(content, null) as TooltipData | null;
          if (!data) return null;
          return (
            <div className="text-xs">
              <p className="text-white light:invert font-medium break-all">
                {data.title}
              </p>
              <div className="flex mt-1 gap-x-2">
                <p className="">
                  Date: <b>{data.date}</b>
                </p>
                <p className="">
                  Type: <b>{data.extension}</b>
                </p>
              </div>
            </div>
          );
        }}
      />
      <Tooltip
        id="watch-changes"
        place="bottom"
        delayShow={300}
        className="tooltip invert !text-xs"
      />
      <Tooltip
        id="pin-document"
        place="bottom"
        delayShow={300}
        className="tooltip invert !text-xs"
      />
      <Tooltip
        id="remove-document"
        place="bottom"
        delayShow={300}
        className="tooltip invert !text-xs"
      />
    </>
  );
}
