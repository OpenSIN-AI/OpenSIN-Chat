// SPDX-License-Identifier: MIT
import PreLoader from "@/components/Preloader";
import { useTranslation } from "react-i18next";
import useVectorCount from "@/hooks/useVectorCount";
import { useEffect } from "react";

export default function VectorCount({
  reload,
  workspace,
}: {
  reload: boolean;
  workspace?: { slug: string };
}) {
  const { t } = useTranslation();
  const { vectorCount, isLoading, mutate } = useVectorCount(workspace?.slug);

  // Re-fetch when reload prop changes
  useEffect(() => {
    if (reload) mutate();
  }, [reload, mutate]);

  if (isLoading || vectorCount === null)
    return (
      <div>
        <h3 className="input-label">{t("general.vector.title")}</h3>
        <p className="text-theme-text-secondary text-xs font-medium py-1">
          {t("general.vector.description")}
        </p>
        <div className="text-theme-text-secondary text-sm font-medium">
          <PreLoader size="4" />
        </div>
      </div>
    );
  return (
    <div>
      <h3 className="input-label">{t("general.vector.title")}</h3>
      <p className="text-theme-text-secondary text-sm font-medium">
        {vectorCount}
      </p>
    </div>
  );
}
