// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from "react";
import { titleCase } from "text-case";
import Admin from "@/models/admin";
import { Trash } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

const DASH = "--";

export default function InviteRow({ invite }: { invite: any }) {
  const { t } = useTranslation();
  const rowRef = useRef<HTMLTableRowElement>(null);
  const [status, setStatus] = useState(invite.status);
  const [copied, setCopied] = useState(false);
  const handleDelete = async () => {
    if (!window.confirm(t("inviteRow.deactivateConfirm"))) return false;
    if (rowRef?.current && rowRef.current.children.length > 0) {
      rowRef.current.children[0].textContent = t("inviteRow.disabled");
    }
    setStatus("disabled");
    await Admin.disableInvite(invite.id);
  };
  const copyInviteLink = () => {
    if (!invite) return false;
    window.navigator.clipboard.writeText(
      `${window.location.origin}/accept-invite/${invite.code}`,
    );
    setCopied(true);
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
        className="bg-transparent text-white text-opacity-80 text-xs font-medium border-b border-white/10 h-10"
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
                onClick={copyInviteLink}
                disabled={copied}
                className="text-xs font-medium text-blue-300 rounded-lg hover:text-blue-400 hover:underline"
              >
                {copied ? t("inviteRow.copied") : t("inviteRow.copyInviteLink")}
              </button>
              <button
                onClick={handleDelete}
                className="text-xs font-medium text-white/80 light:text-black/80 hover:light:text-red-500 hover:text-red-300 rounded-lg px-2 py-1 hover:bg-white hover:light:bg-red-50 hover:bg-opacity-10"
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
