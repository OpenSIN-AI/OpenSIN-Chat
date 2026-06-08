// SPDX-License-Identifier: MIT
import paths from "@/utils/paths";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useRedirectToHomeOnOnboardingComplete from "@/hooks/useOnboardingComplete";

export default function OnboardingHome() {
  const navigate = useNavigate();
  useRedirectToHomeOnOnboardingComplete();
  const { t } = useTranslation();

  return (
    <div className="relative w-screen h-screen flex flex-col overflow-hidden bg-zinc-950 light:bg-slate-50">
      {/* Dark mode background image */}
      <div
        className="absolute inset-0 light:hidden bg-no-repeat bg-center bg-cover"
        style={{ backgroundImage: "url('/onboarding/background-dark.jpeg')" }}
      />
      {/* Light mode background image */}
      <div
        className="absolute inset-0 hidden light:block bg-no-repeat bg-center bg-cover"
        style={{ backgroundImage: "url('/onboarding/background-light.jpeg')" }}
      />

      <div className="relative z-10 flex justify-center pt-[58px]">
        <p className="text-white/80 light:text-slate-600 text-3xl font-semibold drop-shadow-lg">
          OpenAfD Chat
        </p>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center -mt-8">
        <h1 className="relative font-medium text-white light:text-slate-700 text-[64px] md:text-[96px] lg:text-[160px] leading-none tracking-[-0.06em] select-none drop-shadow-lg">
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
