// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import Sidebar from "@/components/SettingsSidebar";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { BookOpen } from "@phosphor-icons/react/dist/csr/BookOpen";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import WorkspaceRow from "./WorkspaceRow";
import NewWorkspaceModal from "./NewWorkspaceModal";
import { useModal } from "@/hooks/useModal";
import ModalWrapper from "@/components/ModalWrapper";
import CTAButton from "@/components/lib/CTAButton";
import useAdminWorkspaces from "@/hooks/useAdminWorkspaces";
import { useTranslation } from "react-i18next";
import AdminContentPanel from "@/components/AdminContentPanel";

export default function AdminWorkspaces(): JSX.Element {
  const { t } = useTranslation();
  const { isOpen, openModal, closeModal } = useModal();

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      <AdminContentPanel>
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
          <div className="w-full flex flex-col gap-y-1 pb-6 border-white/10 border-b-2">
            <div className="items-center flex gap-x-4">
              <p className="text-lg leading-6 font-bold text-theme-text-primary">
                {t("admin.workspacesPage.instanceWorkspaces")}
              </p>
            </div>
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary">
              {t("admin.workspacesPage.description")}
            </p>
          </div>
          <div className="w-full justify-end flex">
            <CTAButton
              onClick={openModal}
              className="mt-3 mr-0 mb-4 md:-mb-14 z-10"
            >
              <BookOpen className="h-4 w-4" weight="bold" />{" "}
              {t("admin.workspacesPage.newWorkspace")}
            </CTAButton>
          </div>
          <div className="overflow-x-auto">
            <WorkspacesContainer />
          </div>
        </div>
        <ModalWrapper isOpen={isOpen} closeModal={closeModal}>
          <NewWorkspaceModal closeModal={closeModal} />
        </ModalWrapper>
      </div>
    </div>
  );
}

function WorkspacesContainer(): JSX.Element {
  const { t } = useTranslation();
  const { users, workspaces, deletionProtected, isLoading, error } =
    useAdminWorkspaces();

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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <Warning className="h-8 w-8 text-red-500" />
        <p className="text-theme-text-primary text-sm">
          {t("common.loadError")}
        </p>
      </div>
    );
  }

  return (
    <table className="w-full text-xs text-left rounded-lg mt-6 min-w-[640px] border-spacing-0">
      <thead className="text-theme-text-secondary text-xs leading-[18px] font-bold uppercase border-white/10 border-b">
        <tr>
          <th scope="col" className="px-6 py-3 rounded-tl-lg">
            {t("admin.workspacesPage.name")}
          </th>
          <th scope="col" className="px-6 py-3">
            {t("admin.workspacesPage.link")}
          </th>
          <th scope="col" className="px-6 py-3">
            {t("admin.workspacesPage.users")}
          </th>
          <th scope="col" className="px-6 py-3">
            {t("admin.workspacesPage.createdOn")}
          </th>
          <th scope="col" className="px-6 py-3 rounded-tr-lg">
            {" "}
          </th>
        </tr>
      </thead>
      <tbody>
        {workspaces.map((workspace: any) => (
          <WorkspaceRow
            key={workspace.id}
            workspace={workspace}
            users={users}
            deletionProtected={deletionProtected}
          />
        ))}
      </tbody>
    </table>
  );
}
