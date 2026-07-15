// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from "react";
import { titleCase } from "text-case";
import Admin from "@/models/admin";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { useTranslation } from "react-i18next";
import { copyText } from "@/utils/clipboard";
import showToast from "@/utils/toast";
import { mutate } from "swr";
import { INVITES_KEY } from "@/hooks/useInvites";
import useConfirm from "@/hooks/useConfirm";

const DASH = "--";

export default function InviteRow({ invite }: { invite: any }) {
  const { t } = useTranslation();
  const rowRef = useRef<HTMLTableRowElement>(null);
  const [status, setStatus] = useState(invite.status);
  const [copied, setCopied] = useState(false);
  const confirm = useConfirm();
  const handleDelete = async () => {
    if (
      !(await confirm({
        title: t("inviteRow.deactivateConfirm"),
        confirmLabel: t("common.confirm"),
        destructive: true,
      }))
    )
      return false;
    try {
      const { success, error } = await Admin.disableInvite(invite.id);
      if (!success) {
        showToast(error, "error", { clear: true });
        return;
      }
      setStatus("disabled");
      showToast(t("inviteRow.disabled"), "success", { clear: true });
      mutate(INVITES_KEY);
    } catch (e) {
      showToast(String(e), "error", { clear: true });
    }
  };
  const copyInviteLink = () => {
    if (!invite) return false;
    copyText(`${window.location.origin}/accept-invite/${invite.code}`).then(
      (ok) => {
        if (ok) {
          setCopied(true);
          showToast(t("admin.newInvite.copiedToClipboard"), "success", {
            clear: true,
          });
        } else {
          showToast(t("admin.newInvite.copyFailed"), "error");
        }
      },
    );
  };

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => {
      setCopied(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <>
      <tr
        ref={rowRef}
        className="bg-transparent text-theme-text-primary text-xs font-medium border-b border-white/10 h-10"
      >
        <td scope="row" className="px-6 whitespace-nowrap">
          {titleCase(status)}
        </td>
        <td className="px-6">
          {invite.claimedBy
            ? invite.claimedBy?.username || t("inviteRow.deletedUser")
            : DASH}
        </td>
        <td className="px-6">
          {invite.createdBy?.username || t("inviteRow.deletedUser")}
        </td>
        <td className="px-6">{invite.createdAt}</td>
        <td className="px-6 flex items-center gap-x-6 h-full mt-1">
          {status === "pending" && (
            <>
              <button
                type="button"
                onClick={copyInviteLink}
                disabled={copied}
                className="text-xs font-medium text-blue-300 rounded-lg hover:text-blue-400 hover:underline"
              >
                {copied ? t("inviteRow.copied") : t("inviteRow.copyInviteLink")}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs font-medium text-theme-text-primary light:text-black/80 hover:light:text-red-500 hover:text-red-300 rounded-lg px-2 py-1 hover:bg-white hover:light:bg-red-50 hover:bg-opacity-10"
              >
                <Trash className="h-5 w-5" />
              </button>
            </>
          )}
        </td>
      </tr>
    </>
  );
}
