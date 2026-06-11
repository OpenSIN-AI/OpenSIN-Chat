// SPDX-License-Identifier: MIT
import Sidebar from "@/components/SettingsSidebar";
import { isMobile } from "react-device-detect";
import * as Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { EnvelopeSimple } from "@phosphor-icons/react";
import InviteRow from "./InviteRow";
import NewInviteModal from "./NewInviteModal";
import useInvites, { INVITES_KEY } from "@/hooks/useInvites";
import { useModal } from "@/hooks/useModal";
import ModalWrapper from "@/components/ModalWrapper";
import CTAButton from "@/components/lib/CTAButton";
import { mutate } from "swr";

export default function AdminInvites() {
  const { isOpen, openModal, closeModal } = useModal();
  const { invites, isLoading } = useInvites();

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      <div
        style={{ height: isMobile ? "100%" : "calc(100% - 32px)" }}
        className="relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full overflow-y-scroll p-4 md:p-0"
      >
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
          <div className="w-full flex flex-col gap-y-1 pb-6 border-white/10 border-b-2">
            <div className="items-center flex gap-x-4">
              <p className="text-lg leading-6 font-bold text-theme-text-primary">
                Invitations
              </p>
            </div>
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
              Create invitation links for people in your organization to accept
              and sign up with. Invitations can only be used by a single user.
            </p>
          </div>
          <div className="w-full justify-end flex">
            <CTAButton
              onClick={openModal}
              className="mt-3 mr-0 mb-4 md:-mb-12 z-10"
            >
              <EnvelopeSimple className="h-4 w-4" weight="bold" /> Create Invite
              Link
            </CTAButton>
          </div>
          <div className="overflow-x-auto mt-6">
            {isLoading ? (
              <Skeleton.default
                height="80vh"
                width="100%"
                highlightColor="var(--theme-bg-primary)"
                baseColor="var(--theme-bg-secondary)"
                count={1}
                className="w-full p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm"
                containerClassName="flex w-full"
              />
            ) : (
              <table className="w-full text-xs text-left rounded-lg min-w-[640px] border-spacing-0">
                <thead className="text-theme-text-secondary text-xs leading-[18px] font-bold uppercase border-white/10 border-b">
                  <tr>
                    <th scope="col" className="px-6 py-3 rounded-tl-lg">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Accepted By
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Created By
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Created
                    </th>
                    <th scope="col" className="px-6 py-3 rounded-tr-lg">
                      {" "}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invites.length === 0 ? (
                    <tr className="bg-transparent text-theme-text-secondary text-sm font-medium">
                      <td colSpan="5" className="px-6 py-4 text-center">
                        No invitations found
                      </td>
                    </tr>
                  ) : (
                    invites.map((invite) => (
                      <InviteRow key={invite.id} invite={invite} />
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <ModalWrapper isOpen={isOpen}>
          <NewInviteModal
            closeModal={closeModal}
            onSuccess={() => mutate(INVITES_KEY)}
          />
        </ModalWrapper>
      </div>
    </div>
  );
}
