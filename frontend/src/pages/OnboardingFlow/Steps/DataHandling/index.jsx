// SPDX-License-Identifier: MIT
import { useEffect, useCallback } from "react";
import paths from "@/utils/paths";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ProviderPrivacy from "@/components/ProviderPrivacy";
import System from "@/models/system";

export default function DataHandling({ setHeader, setForwardBtn, setBackBtn }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const TITLE = t("onboarding.data.title");
  const DESCRIPTION = t("onboarding.data.description");

  const handleForward = useCallback(() => {
    System.markOnboardingComplete().finally(() => {
      navigate(paths.home());
    });
  }, [navigate]);

  const handleBack = useCallback(() => {
    navigate(paths.onboarding.userSetup());
  }, [navigate]);

  useEffect(() => {
    setHeader({ title: TITLE, description: DESCRIPTION });
    setForwardBtn({ showing: true, disabled: false, onClick: handleForward });
    setBackBtn({ showing: false, disabled: false, onClick: handleBack });
  }, [
    TITLE,
    DESCRIPTION,
    setHeader,
    setForwardBtn,
    setBackBtn,
    handleForward,
    handleBack,
  ]);

  return (
    <div className="w-full flex items-center justify-center flex-col gap-y-6">
      <ProviderPrivacy />
      <p className="text-theme-text-secondary text-sm font-medium py-1">
        {t("onboarding.data.settingsHint")}
      </p>
    </div>
  );
}
