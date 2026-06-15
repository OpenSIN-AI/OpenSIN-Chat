// SPDX-License-Identifier: MIT
import CommunityHubImportItemSteps from "..";
import CTAButton from "@/components/lib/CTAButton";
import paths from "@/utils/paths";
import showToast from "@/utils/toast";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function Introduction({ settings, setSettings, setStep }) {
  const { t } = useTranslation();
  const [itemId, setItemId] = useState(settings.itemId);
  const handleContinue = () => {
    if (!itemId)
      return showToast(t("communityHub.import.intro.itemIdRequired"), "error");
    setSettings((prev) => ({ ...prev, itemId }));
    setStep(CommunityHubImportItemSteps.itemId.next());
  };

  return (
    <div className="flex-[2] flex flex-col gap-y-[18px] mt-10">
      <div className="bg-theme-bg-secondary rounded-xl flex-1 p-6">
        <div className="w-full flex flex-col gap-y-2 max-w-[700px]">
          <h2 className="text-base text-theme-text-primary font-semibold">
            {t("communityHub.import.intro.title")}
          </h2>
          <div className="flex flex-col gap-y-[25px] text-theme-text-secondary text-sm">
            <p>{t("communityHub.import.intro.description1")}</p>
            <p>{t("communityHub.import.intro.description2")}</p>
            <p>
              {t("communityHub.import.intro.description3Part1")}
              <b>{t("communityHub.import.intro.private")}</b>
              {t("communityHub.import.intro.description3Part2")}
              <b>{t("communityHub.import.intro.public")}</b>
              {t("communityHub.import.intro.description3Part3")}
            </p>

            <p className="p-4 bg-yellow-800/30 light:bg-orange-100 light:text-orange-500 light:border-orange-500 rounded-lg border border-yellow-500 text-yellow-500">
              {t("communityHub.import.intro.warningBody")}{" "}
              <a
                href={paths.communityHub.authentication()}
                className="underline text-yellow-100 light:text-orange-500 font-semibold"
              >
                {t("communityHub.import.intro.warningLink")}
              </a>
            </p>
          </div>

          <div className="flex flex-col gap-y-2 mt-4">
            <div className="w-full flex flex-col gap-y-4">
              <div className="flex flex-col w-full">
                <label className="text-theme-text-primary text-sm font-semibold block mb-3">
                  {t("communityHub.import.intro.itemIdLabel")}
                </label>
                <input
                  type="text"
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  placeholder={t("communityHub.import.intro.itemIdPlaceholder")}
                  className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                />
              </div>
            </div>
          </div>
          <CTAButton
            className="text-dark-text w-full mt-[18px] h-[34px] hover:bg-accent"
            onClick={handleContinue}
          >
            {t("communityHub.import.intro.continueButton")}
          </CTAButton>
        </div>
      </div>
    </div>
  );
}
