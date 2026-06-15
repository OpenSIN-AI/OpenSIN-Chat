// SPDX-License-Identifier: MIT
import PreLoader from "@/components/Preloader";
import { useTranslation } from "react-i18next";
import useVectorCount from "@/hooks/useVectorCount";

export default function VectorCount({ reload, workspace }) {
  const { t } = useTranslation();
  const { vectorCount, isLoading, mutate } = useVectorCount(workspace?.slug);

  // Re-fetch when reload prop changes
  if (reload) mutate();

  if (isLoading || vectorCount === null)
    return (
      <div>
        <h3 className="input-label">{t("general.vector.title")}</h3>
        <p className="text-white text-opacity-60 text-xs font-medium py-1">
          {t("general.vector.description")}
        </p>
        <div className="text-white text-opacity-60 text-sm font-medium">
          <PreLoader size="4" />
        </div>
      </div>
    );
  return (
    <div>
      <h3 className="input-label">{t("general.vector.title")}</h3>
      <p className="text-white text-opacity-60 text-sm font-medium">
        {vectorCount}
      </p>
    </div>
  );
}
