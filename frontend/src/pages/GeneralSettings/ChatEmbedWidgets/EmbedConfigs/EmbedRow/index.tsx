// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import { useRef, useState } from "react";
import { DotsThreeOutline } from "@phosphor-icons/react/dist/csr/DotsThreeOutline";
import showToast from "@/utils/toast";
import { useModal } from "@/hooks/useModal";
import ModalWrapper from "@/components/ModalWrapper";
import Embed from "@/models/embed";
import paths from "@/utils/paths";
import { nFormatter } from "@/utils/numbers";
import EditEmbedModal from "./EditEmbedModal";
import CodeSnippetModal from "./CodeSnippetModal";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
import { safeJsonParse } from "@/utils/request";
import { useTranslation } from "react-i18next";

type Workspace = {
  slug: string;
  name: string;
};

type EmbedItem = {
  id: string;
  enabled: number | boolean;
  workspace: Workspace;
  _count: { embed_chats: number };
  allowlist_domains: string;
  createdAt: string;
};

type EmbedRowProps = {
  embed: EmbedItem;
};

export default function EmbedRow({ embed }: EmbedRowProps): JSX.Element {
  const { t } = useTranslation();
  const rowRef = useRef<HTMLTableRowElement>(null);
  const [enabled, setEnabled] = useState(Number(embed.enabled) === 1);
  const {
    isOpen: isSettingsOpen,
    openModal: openSettingsModal,
    closeModal: closeSettingsModal,
  } = useModal();
  const {
    isOpen: isSnippetOpen,
    openModal: openSnippetModal,
    closeModal: closeSnippetModal,
  } = useModal();

  const handleSuspend = async () => {
    if (!window.confirm(t("embedConfigs.embedRow.disableConfirm")))
      return false;

    const { success, error } = await Embed.updateEmbed(embed.id, {
      enabled: !enabled,
    });
    if (!success) showToast(error, "error", { clear: true });
    if (success) {
      showToast(
        t("embedConfigs.embedRow.toggleStatus", {
          status: enabled
            ? t("embedConfigs.embedRow.disabled")
            : t("embedConfigs.embedRow.active"),
        }),
        "success",
        { clear: true },
      );
      setEnabled(!enabled);
    }
  };
  const handleDelete = async () => {
    if (!window.confirm(t("embedConfigs.embedRow.deleteConfirm"))) return false;
    const { success, error } = await Embed.deleteEmbed(embed.id);
    if (!success) showToast(error, "error", { clear: true });
    if (success) {
      rowRef?.current?.remove();
      showToast(t("embedConfigs.embedRow.deleted"), "success", { clear: true });
    }
  };

  return (
    <>
      <tr
        ref={rowRef}
        className="bg-transparent text-white text-opacity-80 text-xs font-medium border-b border-white/10 h-10"
      >
        <th
          scope="row"
          className="px-6 whitespace-nowrap flex item-center gap-x-1"
        >
          <a
            href={paths.workspace.chat(embed.workspace.slug)}
            target="_blank"
            rel="noreferrer"
            className="text-white flex items-center hover:underline"
          >
            {embed.workspace.name}
          </a>
        </th>
        <th scope="row" className="px-6 whitespace-nowrap">
          {nFormatter(embed._count.embed_chats)}
        </th>
        <th scope="row" className="px-6 whitespace-nowrap">
          <ActiveDomains domainList={embed.allowlist_domains} />
        </th>
        <th
          scope="row"
          className="px-6 whitespace-nowrap text-theme-text-secondary !font-normal"
        >
          {
            // If the embed was created more than a day ago, show the date, otherwise show the time ago
            dayjs(embed.createdAt).diff(dayjs(), "day") > 0
              ? dayjs(embed.createdAt).format("MMM D, YYYY") // eslint-disable-line i18next/no-literal-string
              : dayjs(embed.createdAt).fromNow()
          }
        </th>
        <td className="px-6 flex items-center gap-x-6 h-full mt-1">
          <button
            type="button"
            onClick={openSnippetModal}
            className="group text-xs font-medium text-theme-text-secondary px-2 py-1 rounded-lg hover:bg-theme-button-code-hover-bg"
          >
            <span className="group-hover:text-theme-button-code-hover-text">
              {t("embedConfigs.embedRow.code")}
            </span>
          </button>
          <button
            type="button"
            onClick={handleSuspend}
            className="group text-xs font-medium text-theme-text-secondary px-2 py-1 rounded-lg hover:bg-theme-button-disable-hover-bg"
          >
            <span className="group-hover:text-theme-button-disable-hover-text">
              {enabled
                ? t("embedConfigs.embedRow.disable")
                : t("embedConfigs.embedRow.enable")}
            </span>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="group text-xs font-medium text-theme-text-secondary px-2 py-1 rounded-lg hover:bg-theme-button-delete-hover-bg"
          >
            <span className="group-hover:text-theme-button-delete-hover-text">
              {t("embedConfigs.embedRow.delete")}
            </span>
          </button>
          <button
            type="button"
            onClick={openSettingsModal}
            className="text-xs font-medium text-theme-button-text hover:text-theme-text-secondary hover:bg-theme-hover px-2 py-1 rounded-lg"
          >
            <DotsThreeOutline weight="fill" className="h-5 w-5" />
          </button>
        </td>
      </tr>
      <ModalWrapper isOpen={isSettingsOpen} closeModal={closeSettingsModal}>
        <EditEmbedModal embed={embed as any} closeModal={closeSettingsModal} />
      </ModalWrapper>
      <ModalWrapper isOpen={isSnippetOpen} closeModal={closeSnippetModal}>
        <CodeSnippetModal embed={embed as any} closeModal={closeSnippetModal} />
      </ModalWrapper>
    </>
  );
}

type ActiveDomainsProps = {
  domainList: string;
};

function ActiveDomains({ domainList }: ActiveDomainsProps): JSX.Element {
  const { t } = useTranslation();
  const domains = safeJsonParse(domainList, []);
  if (domains.length === 0) return <p>{t("embedConfigs.embedRow.all")}</p>;
  return (
    <div className="flex flex-col gap-y-2">
      {domains.map((domain: string, index: number) => {
        return (
          <p key={index} className="font-mono !font-normal">
            {domain}
          </p>
        );
      })}
    </div>
  );
}
