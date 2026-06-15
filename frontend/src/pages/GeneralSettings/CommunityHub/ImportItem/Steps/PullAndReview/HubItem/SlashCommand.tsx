// SPDX-License-Identifier: MIT
// Purpose: Display slash command import review
// Docs: SlashCommand.doc.md
import CTAButton from "@/components/lib/CTAButton";
import CommunityHubImportItemSteps from "../..";
import showToast from "@/utils/toast";
import paths from "@/utils/paths";
import CommunityHub from "@/models/communityHub";
import { useTranslation } from "react-i18next";

interface SlashCommandProps {
  item: any;
  setStep: (step: string) => void;
}

export default function SlashCommand({
  item,
  setStep,
}: SlashCommandProps): React.ReactElement {
  const { t } = useTranslation();

  async function handleSubmit(): Promise<void> {
    try {
      const { error } = await CommunityHub.applyItem(item.importId);
      if (error) throw new Error(error);
      showToast(
        t("communityHub.import.slashCommand.toastSuccess", {
          command: item.command,
        }),
        "success",
      );
      setStep(CommunityHubImportItemSteps.completed.key);
    } catch (e: any) {
      console.error(e);
      showToast(
        t("communityHub.import.slashCommand.toastFailed", { error: e.message }),
        "error",
      );
    }
  }

  return (
    <div className="flex flex-col mt-4 gap-y-4">
      <div className="flex flex-col gap-y-1">
        <h2 className="text-base text-theme-text-primary font-semibold">
          {t("communityHub.import.slashCommand.reviewTitle", {
            name: item.name,
          })}
        </h2>
        {item.creatorUsername && (
          <p className="text-white/60 text-xs font-mono">
            {t("communityHub.import.slashCommand.createdBy")}{" "}
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
        <p>
          {t("communityHub.import.slashCommand.descriptionPart1")}
          <br />
          <br />
          {t("communityHub.import.slashCommand.descriptionPart2")}
          <code className="font-mono bg-zinc-900 light:bg-slate-200 px-1 py-0.5 rounded-md text-sm">
            {item.command}
          </code>{" "}
          {t("communityHub.import.slashCommand.descriptionPart3")}
        </p>

        <div className="flex flex-col gap-y-2 mt-2">
          <div className="w-full text-theme-text-primary text-md gap-x-2 flex items-center">
            <p className="text-white/60 light:text-theme-text-secondary w-fit font-mono bg-zinc-900 light:bg-slate-200 px-2 py-1 rounded-md text-sm whitespace-pre-line">
              {item.command}
            </p>
          </div>

          <div className="w-full text-theme-text-primary text-md flex flex-col gap-y-2">
            <p className="text-white/60 light:text-theme-text-secondary font-mono bg-zinc-900 light:bg-slate-200 p-4 rounded-md text-sm whitespace-pre-line max-h-[calc(200px)] overflow-y-auto">
              {item.prompt}
            </p>
          </div>
        </div>
      </div>
      <CTAButton
        className="text-dark-text w-full mt-[18px] h-[34px] hover:bg-accent"
        onClick={handleSubmit}
      >
        {t("communityHub.import.slashCommand.importButton")}
      </CTAButton>
    </div>
  );
}
