// SPDX-License-Identifier: MIT
import paths from "@/utils/paths";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useRedirectToHomeOnOnboardingComplete from "@/hooks/useOnboardingComplete";
import { OnboardingLogoSVG } from "./components/OnboardingLogoSVG";

export default function OnboardingHome() {
  const navigate = useNavigate();
  useRedirectToHomeOnOnboardingComplete();
  const { t } = useTranslation();

  return (
    <div className="relative w-screen h-screen flex flex-col overflow-hidden bg-zinc-950 light:bg-slate-50">
      {/* Dark mode background gradient */}
      <div className="absolute inset-0 light:hidden bg-[radial-gradient(ellipse_160%_100%_at_50%_0%,_rgba(130,_152,_178,_0.45)_0%,_rgba(60,_87,_105,_0.25)_45%,_transparent_90%)]" />
      {/* Light mode background gradient */}
      <div className="absolute inset-0 hidden light:block bg-[radial-gradient(ellipse_160%_100%_at_50%_0%,_rgba(176,_200,_224,_0.7)_0%,_rgba(195,_213,_230,_0.45)_50%,_transparent_90%)]" />

      <div className="relative z-10 flex justify-center pt-[58px]">
        <p className="text-white/80 light:text-slate-600 text-3xl font-semibold">
          OpenAfD Chat
        </p>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center -mt-8">
        <div className="absolute flex items-center justify-center w-full px-4 md:px-0 md:max-w-[852px] md:w-[56%]">
          <OnboardingLogoSVG />
        </div>

        <h1 className="relative font-medium text-white light:text-slate-700 text-[64px] md:text-[96px] lg:text-[160px] leading-none tracking-[-0.06em] select-none">
          {t("onboarding.home.welcome")}
        </h1>

        <button
          type="button"
          onClick={() => navigate(paths.onboarding.llmPreference())}
          className="relative border-none z-10 h-[36px] w-[300px] py-2.5 px-5 rounded-lg bg-slate-50 hover:bg-slate-300 font-medium text-sm mt-[42px] text-zinc-900 light:text-white light:bg-slate-900 light:hover:bg-slate-800 text-center flex justify-center items-center transition-colors duration-200"
        >
          {t("onboarding.home.getStarted")}
        </button>
      </div>
    </div>
  );
}
