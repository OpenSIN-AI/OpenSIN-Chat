// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import React, { useState } from "react";
import { X } from "@phosphor-icons/react/dist/csr/X";
import {
  BooleanInput,
  ChatModeSelection,
  NumberInput,
  PermittedDomains,
  WorkspaceSelection,
  enforceSubmissionSchema,
} from "../../NewEmbedModal";
import Embed from "@/models/embed";
import showToast from "@/utils/toast";
import { safeJsonParse } from "@/utils/request";
import { useTranslation } from "react-i18next";
import useEmbedConfigs from "@/hooks/useEmbedConfigs";

type EmbedModel = {
  id: string;
  workspace: { id: string };
  chat_mode: string;
  allowlist_domains: string;
  max_chats_per_day: number;
  max_chats_per_session: number;
  message_limit: number;
  allow_model_override: boolean;
  allow_temperature_override: boolean;
  allow_prompt_override: boolean;
};

type EditEmbedModalProps = {
  embed: EmbedModel;
  closeModal: () => void;
};

export default function EditEmbedModal({
  embed,
  closeModal,
}: EditEmbedModalProps): JSX.Element {
  const { t } = useTranslation();
  const { mutate: mutateEmbeds } = useEmbedConfigs();
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    setError(null);
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = enforceSubmissionSchema(form);
    const { success, error } = await Embed.updateEmbed(embed.id, data);
    if (success) {
      showToast(t("chatEmbedWidgets.editEmbed.updateSuccess"), "success", {
        clear: true,
      });
      mutateEmbeds();
      closeModal();
    } else {
      setError(error);
    }
  };

  return (
    <div className="relative w-full max-w-2xl bg-theme-bg-secondary rounded-lg shadow border-2 border-theme-modal-border">
        <div className="relative p-6 border-b rounded-t border-theme-modal-border">
          <div className="w-full flex gap-x-2 items-center">
            <h3 className="text-xl font-semibold text-white overflow-hidden overflow-ellipsis whitespace-nowrap">
              {t("chatEmbedWidgets.editEmbed.title", { id: embed.id })}
            </h3>
          </div>
          <button
            onClick={closeModal}
            type="button"
            className="absolute top-4 right-4 transition-all duration-300 bg-transparent rounded-lg text-sm p-1 inline-flex items-center hover:bg-theme-modal-border hover:border-theme-modal-border hover:border-opacity-50 border-transparent border"
          >
            <X size={24} weight="bold" className="text-white" />
          </button>
        </div>
        <div className="px-7 py-6">
          <form onSubmit={handleUpdate}>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              <WorkspaceSelection defaultValue={embed.workspace.id} />
              <ChatModeSelection defaultValue={embed.chat_mode} />
              <PermittedDomains
                defaultValue={
                  safeJsonParse(embed.allowlist_domains, null) || []
                }
              />
              <NumberInput
                name="max_chats_per_day"
                title={t("chatEmbedWidgets.editEmbed.maxChatsPerDay")}
                hint={t("chatEmbedWidgets.editEmbed.maxChatsPerDayHint")}
                defaultValue={embed.max_chats_per_day}
              />
              <NumberInput
                name="max_chats_per_session"
                title={t("chatEmbedWidgets.editEmbed.maxChatsPerSession")}
                hint={t("chatEmbedWidgets.editEmbed.maxChatsPerSessionHint")}
                defaultValue={embed.max_chats_per_session}
              />
              <NumberInput
                name="message_limit"
                title={t("chatEmbedWidgets.editEmbed.messageHistoryLimit")}
                hint={t("chatEmbedWidgets.editEmbed.messageHistoryLimitHint")}
                defaultValue={embed.message_limit}
              />
              <BooleanInput
                name="allow_model_override"
                title={t("chatEmbedWidgets.editEmbed.enableDynamicModel")}
                hint={t("chatEmbedWidgets.editEmbed.enableDynamicModelHint")}
                defaultValue={embed.allow_model_override}
              />
              <BooleanInput
                name="allow_temperature_override"
                title={t("chatEmbedWidgets.editEmbed.enableDynamicTemperature")}
                hint={t(
                  "chatEmbedWidgets.editEmbed.enableDynamicTemperatureHint",
                )}
                defaultValue={embed.allow_temperature_override}
              />
              <BooleanInput
                name="allow_prompt_override"
                title={t("chatEmbedWidgets.editEmbed.enablePromptOverride")}
                hint={t("chatEmbedWidgets.editEmbed.enablePromptOverrideHint")}
                defaultValue={embed.allow_prompt_override}
              />

              {error && (
                <p className="text-red-400 text-sm">
                  {t("chatEmbedWidgets.editEmbed.error", { error })}
                </p>
              )}
              <p className="text-white text-opacity-60 text-xs md:text-sm">
                {t("chatEmbedWidgets.editEmbed.scriptTagNotice")}
              </p>
            </div>
            <div className="flex justify-between items-center mt-6 pt-6 border-t border-theme-modal-border">
              <button
                onClick={closeModal}
                type="button"
                className="transition-all duration-300 text-white hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm"
              >
                {t("chatEmbedWidgets.editEmbed.cancel")}
              </button>
              <button
                type="submit"
                className="transition-all duration-300 bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm"
              >
                {t("chatEmbedWidgets.editEmbed.updateEmbed")}
              </button>
            </div>
          </form>
        </div>
      </div>
  );
}
