// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import Sidebar from "@/components/SettingsSidebar";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { EnvelopeSimple } from "@phosphor-icons/react/dist/csr/EnvelopeSimple";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import InviteRow from "./InviteRow";
import NewInviteModal from "./NewInviteModal";
import useInvites, { INVITES_KEY } from "@/hooks/useInvites";
import { useModal } from "@/hooks/useModal";
import ModalWrapper from "@/components/ModalWrapper";
import CTAButton from "@/components/lib/CTAButton";
import { mutate } from "swr";
import { useTranslation } from "react-i18next";
import AdminContentPanel from "@/components/AdminContentPanel";

export default function AdminInvites(): JSX.Element {
  const { isOpen, openModal, closeModal } = useModal();
  const { invites, isLoading, error } = useInvites();
  const { t } = useTranslation();

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      <AdminContentPanel>
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
          <div className="w-full flex flex-col gap-y-1 pb-6 border-white/10 border-b-2">
            <div className="items-center flex gap-x-4">
              <p className="text-lg leading-6 font-bold text-theme-text-primary">
                {t("admin.invitations.title")}
              </p>
            </div>
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
              {t("admin.invitations.description")}
            </p>
          </div>
          <div className="w-full justify-end flex">
            <CTAButton
              onClick={openModal}
              className="mt-3 mr-0 mb-4 md:-mb-12 z-10"
            >
              <EnvelopeSimple className="h-4 w-4" weight="bold" />{" "}
              {t("admin.invitations.createInviteLink")}
            </CTAButton>
          </div>
          <div className="overflow-x-auto mt-6">
            {isLoading ? (
              <Skeleton
                height="80vh"
                width="100%"
                highlightColor="var(--theme-bg-primary)"
                baseColor="var(--theme-bg-secondary)"
                count={1}
                className="w-full p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm"
                containerClassName="flex w-full"
              />
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Warning className="h-8 w-8 text-red-500" />
                <p className="text-theme-text-primary text-sm">
                  {t("common.loadError")}
                </p>
              </div>
            ) : (
              <table className="w-full text-xs text-left rounded-lg min-w-[640px] border-spacing-0">
                <thead className="text-theme-text-secondary text-xs leading-[18px] font-bold uppercase border-white/10 border-b">
                  <tr>
                    <th scope="col" className="px-6 py-3 rounded-tl-lg">
                      {t("admin.invitations.status")}
                    </th>
                    <th scope="col" className="px-6 py-3">
                      {t("admin.invitations.acceptedBy")}
                    </th>
                    <th scope="col" className="px-6 py-3">
                      {t("admin.invitations.createdBy")}
                    </th>
                    <th scope="col" className="px-6 py-3">
                      {t("admin.invitations.created")}
                    </th>
                    <th scope="col" className="px-6 py-3 rounded-tr-lg">
                      {" "}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invites.length === 0 ? (
                    <tr className="bg-transparent text-theme-text-secondary text-sm font-medium">
                      <td colSpan={5} className="px-6 py-4 text-center">
                        {t("admin.invitations.noInvitations")}
                      </td>
                    </tr>
                  ) : (
                    invites.map((invite: any) => (
                      <InviteRow key={invite.id} invite={invite} />
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <ModalWrapper isOpen={isOpen} closeModal={closeModal}>
          <NewInviteModal
            closeModal={closeModal}
            onSuccess={() => mutate(INVITES_KEY)}
          />
        </ModalWrapper>
      </div>
    </div>
  );
}
