// SPDX-License-Identifier: MIT
import CTAButton from "@/components/lib/CTAButton";
import CommunityHubImportItemSteps from "../..";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { useTranslation } from "react-i18next";

export default function UnknownItem({
  item,
  setSettings,
  setStep,
}: {
  item: { id: string; itemType: string };
  setSettings: (s: any) => void;
  setStep: (step: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col mt-4 gap-y-4">
      <div className="w-full flex items-center gap-x-2">
        <Warning size={24} className="text-red-500" />
        <h2 className="text-base text-red-500 font-semibold">
          {t("communityHub.import.unsupported.title")}
        </h2>
      </div>
      <div className="flex flex-col gap-y-[25px] text-white/80 text-sm">
        <p>{t("communityHub.import.unsupported.description")}</p>
        <p>
          {t("communityHub.import.unsupported.itemId")} <b>{item.id}</b>
          <br />
          {t("communityHub.import.unsupported.itemType")} <b>{item.itemType}</b>
        </p>
        <p>{t("communityHub.import.unsupported.contactSupport")}</p>
      </div>
      <CTAButton
        className="text-dark-text w-full mt-[18px] h-[34px] hover:bg-accent"
        onClick={() => {
          setSettings({ itemId: null, item: null });
          setStep(CommunityHubImportItemSteps.itemId.key);
        }}
      >
        {t("communityHub.import.unsupported.tryAnother")}
      </CTAButton>
    </div>
  );
}
