// SPDX-License-Identifier: MIT
import React, { useState, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { TagsInput } from "react-tag-input-component";
import Embed from "@/models/embed";
import Toggle from "@/components/lib/Toggle";
import useWorkspaces from "@/hooks/useWorkspaces";
import useEmbedConfigs from "@/hooks/useEmbedConfigs";
import showToast from "@/utils/toast";

const SCRIPT_TAG = "<script>";

export function enforceSubmissionSchema(form: FormData) {
  const data: any = {};
  for (const [key, value] of form.entries()) {
    if (!value || value === null) continue;
    data[key] = value;
    if (value === "on") data[key] = true;
  }

  if (!data.hasOwnProperty("name")) data.name = null;
  if (!data.hasOwnProperty("allowlist_domains")) data.allowlist_domains = null;
  if (!data.hasOwnProperty("allow_model_override"))
    data.allow_model_override = false;
  if (!data.hasOwnProperty("allow_temperature_override"))
    data.allow_temperature_override = false;
  if (!data.hasOwnProperty("allow_prompt_override"))
    data.allow_prompt_override = false;
  if (!data.hasOwnProperty("message_limit")) data.message_limit = 20;
  return data;
}

export default function NewEmbedModal({
  closeModal,
}: {
  closeModal: () => void;
}) {
  const { t } = useTranslation();
  const { mutate: mutateEmbeds } = useEmbedConfigs();
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    setError(null);
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = enforceSubmissionSchema(form);
    const { embed, error } = await Embed.newEmbed(data);
    if (!!embed) {
      showToast(t("newEmbedModal.created"), "success", { clear: true });
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
            <h3 className="text-xl font-semibold text-theme-text-primary overflow-hidden overflow-ellipsis whitespace-nowrap">
              {t("newEmbedModal.title")}
            </h3>
          </div>
          <button
            onClick={closeModal}
            type="button"
            className="absolute top-4 right-4 transition-all duration-300 bg-transparent rounded-lg text-sm p-1 inline-flex items-center hover:bg-theme-modal-border hover:border-theme-modal-border hover:border-opacity-50 border-transparent border"
          >
            <X size={24} weight="bold" className="text-theme-text-primary" />
          </button>
        </div>
        <div className="px-7 py-6">
          <form onSubmit={handleCreate}>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              <NameInput />
              <WorkspaceSelection />
              <ChatModeSelection />
              <PermittedDomains />
              <NumberInput
                name="max_chats_per_day"
                title={t("newEmbedModal.maxChatsPerDay")}
                hint={t("newEmbedModal.maxChatsPerDayHint")}
              />
              <NumberInput
                name="max_chats_per_session"
                title={t("newEmbedModal.maxChatsPerSession")}
                hint={t("newEmbedModal.maxChatsPerSessionHint")}
              />
              <NumberInput
                name="message_limit"
                title={t("newEmbedModal.messageHistoryLimit")}
                hint={t("newEmbedModal.messageHistoryLimitHint")}
                defaultValue={20}
              />
              <BooleanInput
                name="allow_model_override"
                title={t("newEmbedModal.enableDynamicModel")}
                hint={t("newEmbedModal.enableDynamicModelHint")}
              />
              <BooleanInput
                name="allow_temperature_override"
                title={t("newEmbedModal.enableDynamicTemperature")}
                hint={t("newEmbedModal.enableDynamicTemperatureHint")}
              />
              <BooleanInput
                name="allow_prompt_override"
                title={t("newEmbedModal.enablePromptOverride")}
                hint={t("newEmbedModal.enablePromptOverrideHint")}
              />

              {error && (
                <p className="text-red-400 text-sm">
                  {t("newEmbedModal.error")}: {error}
                </p>
              )}
              <p className="text-theme-text-secondary text-xs md:text-sm">
                {t("newEmbedModal.afterCreateHintBefore")}
                <code className="light:bg-stone-300 bg-stone-900 text-white mx-1 px-1 rounded-sm">
                  {SCRIPT_TAG}
                </code>
                {t("newEmbedModal.afterCreateHintAfter")}
              </p>
            </div>
            <div className="flex justify-between items-center mt-6 pt-6 border-t border-theme-modal-border">
              <button
                onClick={closeModal}
                type="button"
                className="transition-all duration-300 text-theme-text-primary hover:bg-theme-modal-border px-4 py-2 rounded-lg text-sm"
              >
                {t("newEmbedModal.cancel")}
              </button>
              <button
                type="submit"
                className="transition-all duration-300 bg-primary-button text-slate-900 hover:opacity-60 px-4 py-2 rounded-lg text-sm"
              >
                {t("newEmbedModal.createEmbed")}
              </button>
            </div>
          </form>
        </div>
      </div>
  );
}

export const WorkspaceSelection = ({
  defaultValue = null,
}: {
  defaultValue?: string | null;
}) => {
  const { t } = useTranslation();
  const { workspaces } = useWorkspaces();

  return (
    <div>
      <div className="flex flex-col mb-2">
        <label
          htmlFor="workspace_id"
          className="block text-sm font-medium text-theme-text-primary"
        >
          {t("newEmbedModal.workspace")}
        </label>
        <p className="text-theme-text-secondary text-xs">
          {t("newEmbedModal.workspaceHint")}
        </p>
      </div>
      <select
        name="workspace_id"
        required={true}
        defaultValue={defaultValue ?? undefined}
        className="min-w-[15rem] rounded-lg bg-theme-settings-input-bg px-4 py-2 text-sm text-white focus:ring-blue-500 focus:border-blue-500"
      >
        {workspaces.map((workspace: any) => {
          return (
            <option
              key={workspace.id}
              value={workspace.id}
            >
              {workspace.name}
            </option>
          );
        })}
      </select>
    </div>
  );
};

export const NameInput = ({
  defaultValue = "",
}: {
  defaultValue?: string;
}) => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex flex-col mb-2">
        <label
          htmlFor="name"
          className="block text-sm font-medium text-theme-text-primary"
        >
          {t("newEmbedModal.name")}
        </label>
        <p className="text-theme-text-secondary text-xs">
          {t("newEmbedModal.nameHint")}
        </p>
      </div>
      <input
        type="text"
        name="name"
        id="name"
        defaultValue={defaultValue}
        placeholder={t("newEmbedModal.namePlaceholder")}
        className="min-w-[15rem] rounded-lg bg-theme-settings-input-bg px-4 py-2 text-sm text-white placeholder:text-theme-settings-input-placeholder focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
};

export const ChatModeSelection = ({
  defaultValue = null,
}: {
  defaultValue?: string | null;
}) => {
  const { t } = useTranslation();
  const [chatMode, setChatMode] = useState(defaultValue ?? "query");

  return (
    <div>
      <div className="flex flex-col mb-2">
        <label
          className="block text-sm font-medium text-theme-text-primary"
          htmlFor="chat_mode"
        >
          {t("newEmbedModal.allowedChatMethod")}
        </label>
        <p className="text-theme-text-secondary text-xs">
          {t("newEmbedModal.chatModeHintPart1")}
          <br />
          {t("newEmbedModal.chatModeHintPart2")}
        </p>
      </div>
      <div className="mt-2 gap-y-3 flex flex-col">
        <label
          className={`transition-all duration-300 w-full h-11 p-2.5 rounded-lg flex justify-start items-center gap-2.5 cursor-pointer border ${
            chatMode === "chat"
              ? "border-theme-sidebar-item-workspace-active bg-theme-bg-secondary"
              : "border-theme-sidebar-border hover:border-theme-sidebar-border hover:bg-theme-bg-secondary"
          } `}
        >
          <input
            type="radio"
            name="chat_mode"
            value={"chat"}
            checked={chatMode === "chat"}
            onChange={(e) => setChatMode(e.target.value)}
            className="hidden"
          />
          <div
            className={`w-4 h-4 rounded-full border-2 border-theme-sidebar-border mr-2 ${
              chatMode === "chat"
                ? "bg-[var(--theme-sidebar-item-workspace-active)]"
                : ""
            }`}
          ></div>
          <div className="text-theme-text-primary text-sm font-medium font-['Plus Jakarta Sans'] leading-tight">
            {t("newEmbedModal.chatModeChat")}
          </div>
        </label>
        <label
          className={`transition-all duration-300 w-full h-11 p-2.5 rounded-lg flex justify-start items-center gap-2.5 cursor-pointer border ${
            chatMode === "query"
              ? "border-theme-sidebar-item-workspace-active bg-theme-bg-secondary"
              : "border-theme-sidebar-border hover:border-theme-sidebar-border hover:bg-theme-bg-secondary"
          } `}
        >
          <input
            type="radio"
            name="chat_mode"
            value={"query"}
            checked={chatMode === "query"}
            onChange={(e) => setChatMode(e.target.value)}
            className="hidden"
          />
          <div
            className={`w-4 h-4 rounded-full border-2 border-theme-sidebar-border mr-2 ${
              chatMode === "query"
                ? "bg-[var(--theme-sidebar-item-workspace-active)]"
                : ""
            }`}
          ></div>
          <div className="text-theme-text-primary text-sm font-medium font-['Plus Jakarta Sans'] leading-tight">
            {t("newEmbedModal.chatModeQuery")}
          </div>
        </label>
      </div>
    </div>
  );
};

export const PermittedDomains = ({
  defaultValue = [],
}: {
  defaultValue?: string[];
}) => {
  const { t } = useTranslation();
  const [domains, setDomains] = useState<string[]>(defaultValue);
  const handleChange = (data: string[]) => {
    const validDomains = data
      .map((input) => {
        let url = input;
        if (!url.includes("http://") && !url.includes("https://"))
          url = `https://${url}`;
        try {
          new URL(url);
          return url;
        } catch {
          return null;
        }
      })
      .filter((u) => !!u);
    setDomains(validDomains as string[]);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const currentInput = event.target.value;
    if (!currentInput) return;

    const validDomains = [...domains, currentInput].map((input) => {
      let url = input;
      if (!url.includes("http://") && !url.includes("https://"))
        url = `https://${url}`;
      try {
        new URL(url);
        return url;
      } catch {
        return null;
      }
    });
    event.target.value = "";
    setDomains(validDomains.filter((u) => !!u) as string[]);
  };

  return (
    <div>
      <div className="flex flex-col mb-2">
        <label
          htmlFor="allowlist_domains"
          className="block text-sm font-medium text-theme-text-primary"
        >
          {t("newEmbedModal.restrictDomains")}
        </label>
        <p className="text-theme-text-secondary text-xs">
          {t("newEmbedModal.restrictDomainsHintPart1")}
          <br />
          {t("newEmbedModal.restrictDomainsHintPart2")}
        </p>
      </div>
      <input type="hidden" name="allowlist_domains" value={domains.join(",")} />
      <TagsInput
        value={domains}
        onChange={handleChange}
        onBlur={handleBlur}
        placeHolder={t("newEmbedModal.domainsPlaceholder")}
        classNames={{
          tag: "bg-theme-settings-input-bg light:bg-black/10 bg-blue-300/10 text-zinc-800",
          input:
            "flex p-1 !bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none",
        }}
      />
    </div>
  );
};

export const NumberInput = ({
  name,
  title,
  hint,
  defaultValue = 0,
}: {
  name: string;
  title: string;
  hint: string;
  defaultValue?: number;
}) => {
  return (
    <div>
      <div className="flex flex-col mb-2">
        <label htmlFor={name} className="block text-sm font-medium text-theme-text-primary">
          {title}
        </label>
        <p className="text-theme-text-secondary text-xs">{hint}</p>
      </div>
      <input
        type="number"
        name={name}
        className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-[15rem] p-2.5"
        min={0}
        defaultValue={defaultValue}
        onScroll={(e) => (e.target as HTMLInputElement).blur()}
      />
    </div>
  );
};

export const BooleanInput = ({
  name,
  title,
  hint,
  defaultValue = null,
}: {
  name: string;
  title: string;
  hint: string;
  defaultValue?: boolean | null;
}) => {
  const [status, setStatus] = useState(defaultValue ?? false);

  return (
    <Toggle
      name={name}
      size="md"
      variant="horizontal"
      label={title}
      description={hint}
      enabled={status}
      onChange={(checked: boolean) => setStatus(checked)}
    />
  );
};
