// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import { X } from "@phosphor-icons/react/dist/csr/X";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import Telegram from "@/models/telegram";
import showToast from "@/utils/toast";
import { useTranslation } from "react-i18next";

type TelegramUser = {
  chatId: string;
  telegramUsername?: string;
  username?: string;
  firstName?: string;
  code?: string;
};

type UsersSectionProps = {
  pendingUsers: TelegramUser[];
  approvedUsers: TelegramUser[];
  fetchUsers: () => void;
};

export default function UsersSection({
  pendingUsers,
  approvedUsers,
  fetchUsers,
}: UsersSectionProps): JSX.Element {
  const { t } = useTranslation();

  async function handleApprove(chatId: string) {
    const res = await Telegram.approveUser(chatId);
    if (!res.success) {
      showToast(
        res.error || t("telegram.connected.toast-approve-failed"),
        "error",
      );
      return;
    }
    fetchUsers();
  }

  async function handleDeny(chatId: string) {
    const res = await Telegram.denyUser(chatId);
    if (!res.success) {
      showToast(
        res.error || t("telegram.connected.toast-deny-failed"),
        "error",
      );
      return;
    }
    fetchUsers();
  }

  async function handleRevoke(chatId: string) {
    const res = await Telegram.revokeUser(chatId);
    if (!res.success) {
      showToast(
        res.error || t("telegram.connected.toast-revoke-failed"),
        "error",
      );
      return;
    }
    fetchUsers();
  }

  const hasPending = pendingUsers.length > 0;
  const hasApproved = approvedUsers.length > 0;
  if (!hasPending && !hasApproved) return null;

  return (
    <div className="flex flex-col gap-y-[18px] w-[700px]">
      <div className="flex flex-col gap-y-2">
        <p className="text-base font-semibold text-white light:text-slate-900">
          {t("common.users")}
        </p>
        <p className="text-xs text-zinc-400 light:text-slate-600">
          {t("telegram.users.pending-description")}
        </p>
      </div>
      <div className="border-t border-zinc-700 light:border-slate-200" />
      <div className="flex flex-col gap-y-2">
        {pendingUsers.map((user) => (
          <UserRow
            key={user.chatId || (user as any)}
            user={user}
            isPending
            onApprove={handleApprove}
            onDeny={handleDeny}
          />
        ))}
        {approvedUsers.map((user) => (
          <UserRow
            key={user.chatId || (user as any)}
            user={user}
            onRevoke={handleRevoke}
          />
        ))}
      </div>
    </div>
  );
}

type UserRowProps = {
  user: TelegramUser;
  isPending?: boolean;
  onApprove?: (chatId: string) => void;
  onDeny?: (chatId: string) => void;
  onRevoke?: (chatId: string) => void;
};

function UserRow({
  user,
  isPending = false,
  onApprove,
  onDeny,
  onRevoke,
}: UserRowProps): JSX.Element {
  const { t } = useTranslation();
  const chatId = typeof user === "string" ? user : user.chatId;
  const username = user.telegramUsername || user.username || null;
  const firstName = user.firstName || null;
  const displayName = username
    ? `@${username}`
    : firstName || t("telegram.users.unknown");
  const initial = (username || firstName || "?")[0].toUpperCase();
  const code = user.code;

  return (
    <>
      <div className="flex items-center">
        <div className="flex items-center gap-x-3 flex-1 min-w-0">
          <div className="bg-zinc-800 light:bg-slate-300 size-8 rounded-full flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-white light:text-slate-900">
              {initial}
            </span>
          </div>
          <span className="text-sm font-medium text-white light:text-slate-900 truncate">
            {displayName}
          </span>
        </div>
        <div className="w-[60px] flex items-center justify-center shrink-0 mr-36">
          {isPending && code && (
            <div className="bg-zinc-950 light:bg-slate-200 h-[26px] w-[60px] flex items-center justify-center rounded">
              <span className="text-sm text-white/80 light:text-slate-900 text-center">
                {code}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-x-3 w-[80px] shrink-0">
          {isPending ? (
            <>
              <button
                type="button"
                onClick={() => onDeny?.(chatId)}
                className="text-zinc-400 light:text-slate-400 hover:text-red-400 light:hover:text-red-500 transition-colors"
              >
                <X className="h-4 w-4" weight="bold" />
              </button>
              <button
                type="button"
                onClick={() => onApprove?.(chatId)}
                className="text-zinc-400 light:text-slate-400 hover:text-green-400 light:hover:text-green-500 transition-colors"
              >
                <Check className="h-4 w-4" weight="bold" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onRevoke?.(chatId)}
              className="text-sm text-white/80 light:text-slate-500 hover:text-white light:hover:text-slate-700 transition-colors"
            >
              {t("common.remove")}
            </button>
          )}
        </div>
      </div>
      <div className="border-t border-zinc-800 light:border-slate-200" />
    </>
  );
}
