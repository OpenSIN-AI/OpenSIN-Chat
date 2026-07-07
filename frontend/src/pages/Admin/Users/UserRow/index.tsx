// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import { useRef, useState } from "react";
import { titleCase } from "text-case";
import Admin from "@/models/admin";
import EditUserModal from "./EditUserModal";
import showToast from "@/utils/toast";
import { useModal } from "@/hooks/useModal";
import ModalWrapper from "@/components/ModalWrapper";
import { useTranslation } from "react-i18next";
import { mutate } from "swr";
import { USERS_KEY } from "@/hooks/useUsers";

const ModMap: Record<string, string[]> = {
  admin: ["admin", "manager", "default"],
  manager: ["manager", "default"],
  default: [],
};

type UserRowProps = {
  currUser: any;
  user: any;
};

export default function UserRow({ currUser, user }: UserRowProps): JSX.Element {
  const { t } = useTranslation();
  const rowRef = useRef<HTMLTableRowElement>(null);
  const canModify = ModMap[currUser?.role || "default"].includes(user.role);
  const [suspended, setSuspended] = useState(user.suspended === 1);
  const { isOpen, openModal, closeModal } = useModal();
  const handleSuspend = async () => {
    if (
      !window.confirm(t("userRow.confirmSuspend", { username: user.username }))
    )
      return false;

    try {
      const { success, error } = await Admin.updateUser(user.id, {
        suspended: suspended ? 0 : 1,
      });
      if (!success) showToast(error, "error", { clear: true });
      if (success) {
        showToast(
          !suspended ? t("userRow.suspended") : t("userRow.unsuspended"),
          "success",
          { clear: true },
        );
        setSuspended(!suspended);
      }
    } catch (e) {
      showToast(String(e), "error", { clear: true });
    }
  };
  const handleDelete = async () => {
    if (
      !window.confirm(t("userRow.confirmDelete", { username: user.username }))
    )
      return false;
    try {
      const { success, error } = await Admin.deleteUser(user.id);
      if (!success) showToast(error, "error", { clear: true });
      if (success) {
        showToast(t("userRow.deleteSuccess"), "success", { clear: true });
        mutate(USERS_KEY);
      }
    } catch (e) {
      showToast(String(e), "error", { clear: true });
    }
  };

  return (
    <>
      <tr
        ref={rowRef}
        className="bg-transparent text-white text-opacity-80 text-xs font-medium border-b border-white/10 h-10"
      >
        <th scope="row" className="px-6 whitespace-nowrap">
          {user.username}
        </th>
        <td className="px-6">{titleCase(user.role)}</td>
        <td className="px-6">{user.createdAt}</td>
        <td className="px-6 flex items-center gap-x-6 h-full mt-2">
          {canModify && (
            <button
              type="button"
              onClick={openModal}
              className="text-xs font-medium text-theme-text-primary light:text-black/80 rounded-lg hover:text-white hover:light:text-gray-500 px-2 py-1 hover:bg-white hover:bg-opacity-10"
            >
              {t("userRow.edit")}
            </button>
          )}
          {currUser?.id !== user.id && canModify && (
            <>
              <button
                type="button"
                onClick={handleSuspend}
                className="text-xs font-medium text-theme-text-primary light:text-black/80 hover:light:text-orange-500 hover:text-orange-300 rounded-lg px-2 py-1 hover:bg-white hover:light:bg-orange-50 hover:bg-opacity-10"
              >
                {suspended ? t("userRow.unsuspend") : t("userRow.suspend")}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs font-medium text-theme-text-primary light:text-black/80 hover:light:text-red-500 hover:text-red-300 rounded-lg px-2 py-1 hover:bg-white hover:light:bg-red-50 hover:bg-opacity-10"
              >
                {t("userRow.delete")}
              </button>
            </>
          )}
        </td>
      </tr>
      <ModalWrapper isOpen={isOpen} closeModal={closeModal}>
        <EditUserModal
          currentUser={currUser}
          user={user}
          closeModal={closeModal}
        />
      </ModalWrapper>
    </>
  );
}
