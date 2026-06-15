// SPDX-License-Identifier: MIT
// Docs: SystemPrompt.doc.md
import CTAButton from "@/components/lib/CTAButton";
import CommunityHubImportItemSteps from "../..";
import { useState } from "react";
import showToast from "@/utils/toast";
import paths from "@/utils/paths";
import CommunityHub from "@/models/communityHub";
import { useTranslation } from "react-i18next";
import useWorkspaces from "@/hooks/useWorkspaces";

type SystemPromptProps = {
  item: {
    importId: string;
    name: string;
    creatorUsername?: string;
    prompt: string;
  };
  setStep: (step: string) => void;
};

export default function SystemPrompt({
  item,
  setStep,
}: SystemPromptProps): JSX.Element {
  const { t } = useTranslation();
  const { workspaces } = useWorkspaces();
  const [destinationWorkspaceSlug, setDestinationWorkspaceSlug] = useState(
    () => workspaces[0]?.slug ?? null,
  );

  async function handleSubmit() {
    showToast(t("communityHub.import.systemPrompt.toastApplying"), "info");
    const { error } = await CommunityHub.applyItem(item.importId, {
      workspaceSlug: destinationWorkspaceSlug,
    });
    if (error) {
      return showToast(
        t("communityHub.import.systemPrompt.toastFailed", { error }),
        "error",
        {
          clear: true,
        },
      );
    }

    showToast(t("communityHub.import.systemPrompt.toastApplied"), "success", {
      clear: true,
    });
    setStep(CommunityHubImportItemSteps.completed.key);
  }

  return (
    <div className="flex flex-col mt-4 gap-y-4">
      <div className="flex flex-col gap-y-1">
        <h2 className="text-base text-theme-text-primary font-semibold">
          {t("communityHub.import.systemPrompt.reviewTitle", {
            name: item.name,
          })}
        </h2>
        {item.creatorUsername && (
          <p className="text-white/60 light:text-theme-text-secondary text-xs font-mono">
            {t("communityHub.import.systemPrompt.createdBy")}{" "}
            <a
              href={paths.communityHub.profile(item.creatorUsername)}
              target="_blank"
              className="hover:text-blue-500 hover:underline"
              rel="noreferrer"
            >
              {`@${item.creatorUsername}`}
            </a>
          </p>
        )}
      </div>
      <div className="flex flex-col gap-y-[25px] text-white/80 light:text-theme-text-secondary text-sm">
        <p>{t("communityHub.import.systemPrompt.description")}</p>

        <div className="flex flex-col gap-y-2">
          <p className="text-white/60 light:text-theme-text-secondary font-semibold">
            {t("communityHub.import.systemPrompt.providedPrompt")}
          </p>
          <div className="w-full text-theme-text-primary text-md flex flex-col max-h-[calc(300px)] overflow-y-auto">
            <p className="text-white/60 light:text-theme-text-secondary font-mono bg-zinc-900 light:bg-slate-200 px-2 py-1 rounded-md text-sm whitespace-pre-line">
              {item.prompt}
            </p>
          </div>
        </div>

        <div className="flex flex-col w-60">
          <label className="text-theme-text-primary text-sm font-semibold block mb-3">
            {t("communityHub.import.systemPrompt.applyToWorkspace")}
          </label>
          {workspaces.length === 0 ? (
            <p className="text-white/50 light:text-theme-text-secondary text-sm">
              {t("communityHub.import.systemPrompt.noWorkspaces")}
            </p>
          ) : (
            <select
              name="destinationWorkspaceSlug"
              required={true}
              onChange={(e) => setDestinationWorkspaceSlug(e.target.value)}
              className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
            >
              <optgroup
                label={t(
                  "communityHub.import.systemPrompt.availableWorkspaces",
                )}
              >
                {workspaces.map((workspace: any) => (
                  <option key={workspace.id} value={workspace.slug}>
                    {workspace.name}
                  </option>
                ))}
              </optgroup>
            </select>
          )}
        </div>
      </div>
      {destinationWorkspaceSlug && (
        <CTAButton
          className="text-dark-text w-full mt-[18px] h-[34px] hover:bg-accent"
          onClick={handleSubmit}
        >
          {t("communityHub.import.systemPrompt.applyButton")}
        </CTAButton>
      )}
    </div>
  );
}