// SPDX-License-Identifier: MIT
import { useRef } from "react";
import { Trash } from "@phosphor-icons/react";
import { stripUuidAndJsonFromString } from "@/components/Modals/ManageWorkspace/Documents/Directory/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import localizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);
import System from "@/models/system";

const MOMENT_LLL_FORMAT = "lll";
const wrapRelative = (text: string) => `(${text})`;

export default function DocumentSyncQueueRow({ queue }: { queue: any }) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const handleDelete = async () => {
    rowRef?.current?.remove();
    await System.experimentalFeatures.liveSync.setWatchStatusForDocument(
      queue.workspaceDoc.workspace.slug,
      queue.workspaceDoc.docpath,
      false,
    );
  };

  return (
    <>
      <tr
        ref={rowRef}
        className="bg-transparent text-white text-opacity-80 text-sm font-medium"
      >
        <td scope="row" className="px-6 py-4 whitespace-nowrap">
          {stripUuidAndJsonFromString(queue.workspaceDoc.filename)}
        </td>
        <td className="px-6 py-4">{dayjs(queue.lastSyncedAt).fromNow()}</td>
        <td className="px-6 py-4">
          {dayjs(queue.nextSyncAt).format(MOMENT_LLL_FORMAT)}
          <i className="text-xs px-2">
            {wrapRelative(dayjs(queue.nextSyncAt).fromNow())}
          </i>
        </td>
        <td className="px-6 py-4">
          {dayjs(queue.createdAt).format(MOMENT_LLL_FORMAT)}
        </td>
        <td className="px-6 py-4 flex items-center gap-x-6">
          <button type="button"
            onClick={handleDelete}
            className="border-none font-medium px-2 py-1 rounded-lg text-theme-text-primary hover:text-red-500"
          >
            <Trash className="h-5 w-5" />
          </button>
        </td>
      </tr>
    </>
  );
}
