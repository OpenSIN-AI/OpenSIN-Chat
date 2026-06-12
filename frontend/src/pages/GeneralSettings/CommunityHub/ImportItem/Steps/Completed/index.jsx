// SPDX-License-Identifier: MIT
import CommunityHubImportItemSteps from "..";
import CTAButton from "@/components/lib/CTAButton";
import { Link } from "react-router-dom";
import paths from "@/utils/paths";
import { useTranslation } from "react-i18next";

export default function Completed({ settings, setSettings, setStep }) {
  const { t } = useTranslation();
  const item = settings?.item;
  if (!item) return null;

  return (
    <div className="flex-[2] flex flex-col gap-y-[18px] mt-10">
      <div className="bg-theme-bg-secondary rounded-xl flex-1 p-6">
        <div className="w-full flex flex-col gap-y-2 max-w-[700px]">
          <h2 className="text-base text-theme-text-primary font-semibold">
            {t("communityHub.import.completed.title")}
          </h2>
          <div className="flex flex-col gap-y-[25px] text-theme-text-secondary text-sm">
            <p>
              {t("communityHub.import.completed.successMessage", { name: item.name, itemType: item.itemType })}
            </p>
            {/* eslint-disable-next-line i18next/no-literal-string */}
            {item.itemType === "agent-flow" && (
              <Link
                to={paths.settings.agentSkills()}
                className="text-theme-text-primary hover:text-blue-500 hover:underline"
              >
                {t("communityHub.import.completed.viewInAgentSkills", { name: item.name })}
              </Link>
            )}
            <p>
              {t("communityHub.import.completed.modifyNote", { itemType: item.itemType })}
            </p>
          </div>
          <CTAButton
            className="text-dark-text w-full mt-[18px] h-[34px] hover:bg-accent"
            onClick={() => {
              setSettings({ item: null, itemId: null });
              setStep(CommunityHubImportItemSteps.itemId.key);
            }}
          >
            {t("communityHub.import.completed.importAnother")}
          </CTAButton>
        </div>
      </div>
    </div>
  );
}
