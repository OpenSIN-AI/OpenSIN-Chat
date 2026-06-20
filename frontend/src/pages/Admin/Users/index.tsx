// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import Sidebar from "@/components/SettingsSidebar";
import { isMobile } from "react-device-detect";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { UserPlus } from "@phosphor-icons/react/dist/csr/UserPlus";
import UserRow from "./UserRow";
import useUser from "@/hooks/useUser";
import useUsers, { USERS_KEY } from "@/hooks/useUsers";
import NewUserModal from "./NewUserModal";
import { useModal } from "@/hooks/useModal";
import ModalWrapper from "@/components/ModalWrapper";
import CTAButton from "@/components/lib/CTAButton";
import Toggle from "@/components/lib/Toggle";
import { mutate } from "swr";
import { useTranslation } from "react-i18next";

export default function AdminUsers(): JSX.Element {
  const { isOpen, openModal, closeModal } = useModal();
  const { t } = useTranslation();

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      <div
        style={{ "--content-height": isMobile ? "100%" : "calc(100% - 32px)" }}
        className="h-[var(--content-height)] relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full overflow-y-scroll p-4 md:p-0"
      >
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
          <div className="w-full flex flex-col gap-y-1 pb-6 border-white/10 border-b-2">
            <div className="items-center flex gap-x-4">
              <p className="text-lg leading-6 font-bold text-theme-text-primary">
                {t("admin.usersPage.title")}
              </p>
            </div>
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary">
              {t("admin.usersPage.description")}
            </p>
          </div>
          <div className="w-full justify-end flex">
            <CTAButton
              onClick={openModal}
              className="mt-3 mr-0 mb-4 md:-mb-6 z-10"
            >
              <UserPlus className="h-4 w-4" weight="bold" />{" "}
              {t("admin.usersPage.addUser")}
            </CTAButton>
          </div>
          <div className="overflow-x-auto">
            <UsersContainer />
          </div>
        </div>
        <ModalWrapper isOpen={isOpen} closeModal={closeModal}>
          <NewUserModal
            {...({
              closeModal,
              onSuccess: () => mutate(USERS_KEY),
            } as any)}
          />
        </ModalWrapper>
      </div>
    </div>
  );
}

function UsersContainer(): JSX.Element {
  const { user: currUser } = useUser();
  const { users, isLoading } = useUsers();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Skeleton
        height="80vh"
        width="100%"
        highlightColor="var(--theme-bg-primary)"
        baseColor="var(--theme-bg-secondary)"
        count={1}
        className="w-full p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm mt-8"
        containerClassName="flex w-full"
      />
    );
  }

  return (
    <table className="w-full text-xs text-left rounded-lg min-w-[640px] border-spacing-0">
      <thead className="text-theme-text-secondary text-xs leading-[18px] font-bold uppercase border-white/10 border-b">
        <tr>
          <th scope="col" className="px-6 py-3 rounded-tl-lg">
            {t("admin.usersPage.username")}
          </th>
          <th scope="col" className="px-6 py-3">
            {t("admin.usersPage.role")}
          </th>
          <th scope="col" className="px-6 py-3">
            {t("admin.usersPage.dateAdded")}
          </th>
          <th scope="col" className="px-6 py-3 rounded-tr-lg">
            {" "}
          </th>
        </tr>
      </thead>
      <tbody>
        {users.map((user: any) => (
          <UserRow key={user.id} currUser={currUser} user={user} />
        ))}
      </tbody>
    </table>
  );
}

const ROLE_HINT: Record<string, string[]> = {
  default: [
    "admin.usersPage.roleHint.default1",
    "admin.usersPage.roleHint.default2",
  ],
  manager: [
    "admin.usersPage.roleHint.manager1",
    "admin.usersPage.roleHint.manager2",
    "admin.usersPage.roleHint.manager3",
  ],
  admin: ["admin.usersPage.roleHint.admin1", "admin.usersPage.roleHint.admin2"],
};

type RoleHintDisplayProps = {
  role?: string;
};

export function RoleHintDisplay({ role }: RoleHintDisplayProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-y-1 py-1 pb-4">
      <p className="text-sm font-medium text-theme-text-primary">
        {t("admin.usersPage.permissions")}
      </p>
      <ul className="flex flex-col gap-y-1 list-disc px-4">
        {ROLE_HINT[role ?? "default"].map((hintKey, i) => {
          return (
            <li key={i} className="text-xs text-theme-text-secondary">
              {t(hintKey)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type MessageLimitInputProps = {
  enabled: boolean;
  limit: number;
  updateState: (state: any) => void;
  role?: string;
};

export function MessageLimitInput({
  enabled,
  limit,
  updateState,
  role,
}: MessageLimitInputProps): JSX.Element | null {
  const { t } = useTranslation();
  if (role === "admin") return null;
  return (
    <div className="mt-4 mb-8">
      <Toggle
        size="md"
        variant="horizontal"
        label={t("admin.usersPage.limitMessagesPerDay")}
        description={t("admin.usersPage.limitMessagesDescription")}
        enabled={enabled}
        onChange={(checked: boolean) => {
          updateState((prev: any) => ({
            ...prev,
            enabled: checked,
          }));
        }}
      />
      {enabled && (
        <div className="mt-4">
          <label className="text-white text-sm font-semibold block mb-4">
            {t("admin.usersPage.messageLimitPerDay")}
          </label>
          <div className="relative mt-2">
            <input
              type="number"
              onScroll={(e: any) => e.target.blur()}
              onChange={(e) => {
                updateState({
                  enabled: true,
                  limit: Number(e?.target?.value || 0),
                });
              }}
              value={limit}
              min={1}
              className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            />
          </div>
        </div>
      )}
    </div>
  );
}
