// SPDX-License-Identifier: MIT
// Purpose: Pull and review community hub item before import
// Docs: PullAndReview/index.doc.md
import CommunityHub from "@/models/communityHub";
import CommunityHubImportItemSteps from "..";
import CTAButton from "@/components/lib/CTAButton";
import { useEffect, useState } from "react";
import HubItemComponent from "./HubItem";
import { useTranslation } from "react-i18next";

interface PullAndReviewSettings {
  itemId: string | null;
  item: any;
}

interface UseGetCommunityHubItemProps {
  importId: string | null;
  updateSettings: (
    updater: (prev: PullAndReviewSettings) => PullAndReviewSettings,
  ) => void;
}

function useGetCommunityHubItem({
  importId,
  updateSettings,
}: UseGetCommunityHubItemProps) {
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchItem() {
      if (!importId) return;
      setLoading(true);
      const { error: fetchError, item: fetchedItem } =
        await CommunityHub.getItemFromImportId(importId);
      if (cancelled) return;
      if (fetchError) setError(fetchError);
      setItem(fetchedItem);
      updateSettings((prev) => ({ ...prev, item: fetchedItem }));
      setLoading(false);
    }
    fetchItem();
    return () => {
      cancelled = true;
    };
  }, [importId, updateSettings]);

  return { item, loading, error };
}

interface PullAndReviewProps {
  settings: PullAndReviewSettings;
  setSettings: (
    updater: (prev: PullAndReviewSettings) => PullAndReviewSettings,
  ) => void;
  setStep: (step: string) => void;
}

export default function PullAndReview({
  settings,
  setSettings,
  setStep,
}: PullAndReviewProps): React.ReactElement {
  const { t } = useTranslation();
  const { item, loading, error } = useGetCommunityHubItem({
    importId: settings.itemId,
    updateSettings: setSettings,
  });
  const ItemComponent =
    HubItemComponent[item?.itemType] || HubItemComponent["unknown"];

  return (
    <div className="flex-[2] flex flex-col gap-y-[18px] mt-10">
      <div className="bg-theme-bg-secondary rounded-xl flex-1 p-6">
        <div className="w-full flex flex-col gap-y-2 max-w-[700px]">
          <h2 className="text-base text-theme-text-primary font-semibold">
            {t("pullAndReview.title")}
          </h2>

          {loading && (
            <div className="flex h-[200px] w-full rounded-lg animate-pulse">
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-sm text-theme-text-secondary">
                  {t("pullAndReview.pulling")}
                </p>
              </div>
            </div>
          )}
          {!loading && error && (
            <>
              <div className="flex flex-col gap-y-2 mt-8">
                <p className="text-red-500">{t("pullAndReview.error")}</p>
                <p className="text-red-500/80 text-sm font-mono">{error}</p>
              </div>
              <CTAButton
                className="text-dark-text w-full mt-[18px] h-[34px] hover:bg-accent"
                onClick={() => {
                  setSettings({ itemId: null, item: null } as any);
                  setStep(CommunityHubImportItemSteps.itemId.key);
                }}
              >
                {t("pullAndReview.tryAnotherItem")}
              </CTAButton>
            </>
          )}
          {!loading && !error && item && (
            <ItemComponent
              item={item}
              settings={settings}
              setSettings={setSettings}
              setStep={setStep}
            />
          )}
        </div>
      </div>
    </div>
  );
}
