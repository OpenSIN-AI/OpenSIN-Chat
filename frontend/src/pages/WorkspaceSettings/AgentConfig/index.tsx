// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import { castToType } from "@/utils/types";
import { useRef, useState } from "react";
import AgentLLMSelection from "./AgentLLMSelection";
import Admin from "@/models/admin";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import paths from "@/utils/paths";
import useUser from "@/hooks/useUser";
import useSystemSettings from "@/hooks/useSystemSettings";
import System from "@/models/system";
import { useTranslation } from "react-i18next";

type WorkspaceAgentConfigurationProps = {
  workspace?: any;
};

export default function WorkspaceAgentConfiguration({
  workspace,
}: WorkspaceAgentConfigurationProps): JSX.Element {
  const { t } = useTranslation();
  const { user } = useUser();
  const { settings, loading } = useSystemSettings();
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const formEl = useRef<HTMLFormElement>(null);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data: {
        workspace: Record<string, any>;
        system: Record<string, any>;
        env: Record<string, any>;
      } = {
        workspace: {},
        system: {},
        env: {},
      };

      const form = new FormData(formEl.current!);
      for (const [key, value] of form.entries()) {
        if (key.startsWith("system::")) {
          const [, label] = key.split("system::");
          data.system[label] = String(value);
          continue;
        }

        if (key.startsWith("env::")) {
          const [, label] = key.split("env::");
          data.env[label] = String(value);
          continue;
        }

        data.workspace[key] = castToType(key, value);
      }

      const { workspace: updatedWorkspace, message } = await Workspace.update(
        workspace.slug,
        data.workspace,
      );
      await Admin.updateSystemPreferences(data.system);
      await System.updateSystem(data.env);

      if (!!updatedWorkspace) {
        showToast(t("agentConfig.workspaceUpdated"), "success", {
          clear: true,
        });
        setHasChanges(false);
      } else {
        showToast(t("agentConfig.error", { message }), "error", {
          clear: true,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!workspace || loading) return <LoadingSkeleton />;
  return (
    <div id="workspace-agent-settings-container">
      <form
        ref={formEl}
        onSubmit={handleUpdate}
        onChange={() => setHasChanges(true)}
        id="agent-settings-form"
        className="w-1/2 flex flex-col gap-y-6"
      >
        <AgentLLMSelection
          settings={settings}
          workspace={workspace}
          setHasChanges={setHasChanges}
        />
        {(!user || user?.role === "admin") && (
          <>
            {!hasChanges && (
              <div className="flex flex-col gap-y-4">
                <a
                  className="w-fit transition-all duration-300 border border-slate-200 px-5 py-2.5 rounded-lg text-white text-sm items-center flex gap-x-2 hover:bg-slate-200 hover:text-slate-800 focus:ring-gray-800"
                  href={paths.settings.agentSkills()}
                >
                  {t("agentConfig.configureAgentSkills")}
                </a>
                <p className="text-theme-text-secondary text-xs font-medium">
                  {t("agentConfig.configureDescription")}
                </p>
              </div>
            )}
          </>
        )}

        {hasChanges && (
          <button
            type="submit"
            form="agent-settings-form"
            className="w-fit transition-all duration-300 border border-slate-200 px-5 py-2.5 rounded-lg text-white text-sm items-center flex gap-x-2 hover:bg-slate-200 hover:text-slate-800 focus:ring-gray-800"
          >
            {saving
              ? t("agentConfig.updatingAgent")
              : t("agentConfig.updateWorkspaceAgent")}
          </button>
        )}
      </form>
    </div>
  );
}

function LoadingSkeleton(): JSX.Element {
  return (
    <div id="workspace-agent-settings-container">
      <div className="w-1/2 flex flex-col gap-y-6">
        <Skeleton
          height={100}
          width="100%"
          count={2}
          highlightColor="var(--theme-bg-primary)"
          baseColor="var(--theme-bg-secondary)"
          enableAnimation={true}
          containerClassName="flex flex-col gap-y-1"
        />
        <div className="bg-white/10 h-[1px] w-full" />
        <Skeleton
          height={100}
          width="100%"
          count={2}
          highlightColor="var(--theme-bg-primary)"
          baseColor="var(--theme-bg-secondary)"
          enableAnimation={true}
          containerClassName="flex flex-col gap-y-1 mt-4"
        />
      </div>
    </div>
  );
}
