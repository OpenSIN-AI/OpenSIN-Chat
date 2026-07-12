// SPDX-License-Identifier: MIT
// Purpose: Workspace chat settings management
// Docs: ChatSettings/index.doc.md
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import { castToType } from "@/utils/types";
import { useRef, useState, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { mutate } from "swr";
import { WORKSPACES_KEY } from "@/hooks/useWorkspaces";
import ChatHistorySettings from "./ChatHistorySettings";
import ChatPromptSettings from "./ChatPromptSettings";
import ChatTemperatureSettings from "./ChatTemperatureSettings";
import ChatModeSelection from "./ChatModeSelection";
import WorkspaceLLMSelection from "./WorkspaceLLMSelection";
import ChatQueryRefusalResponse from "./ChatQueryRefusalResponse";
import CTAButton from "@/components/lib/CTAButton";
import useSystemSettings from "@/hooks/useSystemSettings";
import logger from "@/utils/logger";

interface Workspace {
  slug: string;
  // Add other workspace fields as needed
}

interface ChatSettingsProps {
  workspace: Workspace;
}

export default function ChatSettings({
  workspace,
}: ChatSettingsProps): React.ReactElement | null {
  const { t } = useTranslation();
  const { settings, loading: settingsLoading } = useSystemSettings();
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const formEl = useRef<HTMLFormElement>(null);

  const handleUpdate = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    try {
      const data: Record<string, any> = {};
      const form = new FormData(formEl.current!);
      for (const [key, value] of form.entries())
        data[key] = castToType(key, value as string);

      const { workspace: updatedWorkspace, message } = await Workspace.update(
        workspace.slug,
        data,
      );
      if (updatedWorkspace) {
        showToast(t("common.workspaceUpdated"), "success", { clear: true });
        setHasChanges(false);
        mutate(WORKSPACES_KEY);
      } else {
        showToast(t("common.error", { error: message }), "error", {
          clear: true,
        });
        // Keep hasChanges true on error so user can retry
      }
    } catch (err) {
      logger.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!workspace) return null;
  return (
    <div id="workspace-chat-settings-container" className="relative">
      <form
        ref={formEl}
        onSubmit={handleUpdate}
        id="chat-settings-form"
        className="w-1/2 flex flex-col gap-y-6"
      >
        {hasChanges && (
          <div className="absolute top-0 right-0">
            <CTAButton type="submit">
              {saving ? t("common.updating") : t("common.updateWorkspace")}
            </CTAButton>
          </div>
        )}
        <WorkspaceLLMSelection
          settings={settings}
          workspace={workspace}
          setHasChanges={setHasChanges}
        />
        <ChatModeSelection
          workspace={workspace as any}
          setHasChanges={setHasChanges}
        />
        <ChatHistorySettings
          workspace={workspace as any}
          setHasChanges={setHasChanges}
        />
        <ChatPromptSettings
          workspace={workspace}
          setHasChanges={setHasChanges}
          hasChanges={hasChanges}
        />
        <ChatQueryRefusalResponse
          workspace={workspace}
          setHasChanges={setHasChanges}
        />
        <ChatTemperatureSettings
          settings={settings}
          workspace={workspace as any}
          setHasChanges={setHasChanges}
        />
      </form>
    </div>
  );
}
