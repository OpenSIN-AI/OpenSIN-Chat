// SPDX-License-Identifier: MIT
import React from "react";
import { useTranslation } from "react-i18next";

export default function FinishNode() {
  const { t } = useTranslation();
  return (
    <div className="text-sm text-theme-text-secondary">
      {t("agentBuilder.finishNodeDescription")}
    </div>
  );
}
