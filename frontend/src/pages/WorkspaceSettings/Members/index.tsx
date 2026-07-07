// SPDX-License-Identifier: MIT
import ModalWrapper from "@/components/ModalWrapper";
import { useModal } from "@/hooks/useModal";
import Skeleton from "react-loading-skeleton";
import AddMemberModal from "./AddMemberModal";
import WorkspaceMemberRow from "./WorkspaceMemberRow";
import CTAButton from "@/components/lib/CTAButton";
import useWorkspaceMembers from "@/hooks/useWorkspaceMembers";
import { useTranslation } from "react-i18next";

export default function Members({ workspace }: { workspace: { id: number } }) {
  const { t } = useTranslation();
  const { users, workspaceUsers, adminWorkspace, isLoading } =
    useWorkspaceMembers(workspace.id);

  const { isOpen, openModal, closeModal } = useModal();

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
    <div className="flex justify-between -mt-3">
      <table className="w-full max-w-[700px] text-sm text-left rounded-lg">
        <thead className="text-white text-opacity-80 text-xs leading-[18px] font-bold uppercase border-white/10 border-b border-opacity-60">
          <tr>
            <th scope="col" className="px-6 py-3 rounded-tl-lg">
              {t("members.username")}
            </th>
            <th scope="col" className="px-6 py-3">
              {t("members.role")}
            </th>
            <th scope="col" className="px-6 py-3">
              {t("members.dateAdded")}
            </th>
            <th scope="col" className="px-6 py-3 rounded-tr-lg">
              {" "}
            </th>
          </tr>
        </thead>
        <tbody>
          {workspaceUsers.length > 0 ? (
            workspaceUsers.map((user: any) => (
              <WorkspaceMemberRow key={user.id} user={user} />
            ))
          ) : (
            <tr>
              <td className="text-center py-4 text-theme-text-primary" colSpan={4}>
                {t("members.noMembers")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <CTAButton onClick={openModal}>{t("members.manageUsers")}</CTAButton>
      <ModalWrapper isOpen={isOpen} closeModal={closeModal}>
        <AddMemberModal
          closeModal={closeModal}
          users={users}
          workspace={adminWorkspace}
        />
      </ModalWrapper>
    </div>
  );
}
