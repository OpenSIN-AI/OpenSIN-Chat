// SPDX-License-Identifier: MIT
// Purpose: LiveSync document sync queue manager
// Docs: manage/index.doc.md
import { useTranslation } from "react-i18next";
import Sidebar from "@/components/Sidebar";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import DocumentSyncQueueRow from "./DocumentSyncQueueRow";
import useLiveSync from "@/hooks/useLiveSync";
import AdminContentPanel from "@/components/AdminContentPanel";

interface LiveSyncQueue {
  id: string;
  // Add other fields as needed from useLiveSync hook
}

export default function LiveDocumentSyncManager(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      <AdminContentPanel>
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
          <div className="w-full flex flex-col gap-y-1 pb-6 border-white/10 border-b-2">
            <div className="items-center flex gap-x-4">
              <p className="text-lg leading-6 font-bold text-theme-text-primary">
                {t("experimentalFeatures.watchedDocs")}
              </p>
            </div>
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary">
              {t("experimentalFeatures.watchedDocsDesc")}
            </p>
          </div>
          <div className="overflow-x-auto">
            <WatchedDocumentsContainer />
          </div>
        </div>
      </AdminContentPanel>
    </div>
  );
}

function WatchedDocumentsContainer(): React.ReactElement {
  const { t } = useTranslation();
  const { queues, isLoading } = useLiveSync();

  if (isLoading) {
    return (
      <Skeleton
        height="80vh"
        width="100%"
        highlightColor="var(--theme-bg-primary)"
        baseColor="var(--theme-bg-secondary)"
        count={1}
        className="w-full p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm mt-6"
        containerClassName="flex w-full"
      />
    );
  }

  return (
    <table className="w-full text-sm text-left rounded-lg mt-6 min-w-[640px]">
      <thead className="text-theme-text-secondary text-xs leading-[18px] font-bold uppercase border-white/10 border-b">
        <tr>
          <th scope="col" className="px-6 py-3 rounded-tl-lg">
            {t("experimentalFeatures.colDocumentName")}
          </th>
          <th scope="col" className="px-6 py-3">
            {t("experimentalFeatures.colLastSynced")}
          </th>
          <th scope="col" className="px-6 py-3">
            {t("experimentalFeatures.colNextRefresh")}
          </th>
          <th scope="col" className="px-6 py-3">
            {t("experimentalFeatures.colCreatedOn")}
          </th>
          <th scope="col" className="px-6 py-3 rounded-tr-lg">
            {" "}
          </th>
        </tr>
      </thead>
      <tbody>
        {queues.map((queue: LiveSyncQueue) => (
          <DocumentSyncQueueRow key={queue.id} queue={queue} />
        ))}
      </tbody>
    </table>
  );
}
