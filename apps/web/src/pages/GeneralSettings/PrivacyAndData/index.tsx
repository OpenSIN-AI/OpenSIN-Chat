// SPDX-License-Identifier: MIT
// Purpose: Admin privacy and data-handling settings page.
// Docs: index.doc.md
import Sidebar from "@/components/SettingsSidebar";
import PreLoader from "@/components/Preloader";
import { useTranslation } from "react-i18next";
import ProviderPrivacy from "@/components/ProviderPrivacy";
import useSystemSettings from "@/hooks/useSystemSettings";
import AdminContentPanel from "@/components/AdminContentPanel";
import { ShieldCheck } from "@phosphor-icons/react/dist/csr/ShieldCheck";

export default function PrivacyAndDataHandling(): JSX.Element {
  const { loading } = useSystemSettings();
  const { t } = useTranslation();

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      <AdminContentPanel className="h-[var(--content-height)] relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] light:border light:border-theme-sidebar-border bg-theme-bg-secondary w-full overflow-y-scroll p-4 md:p-0">
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
          <div className="w-full flex flex-col gap-y-1 pb-6 border-white/10 border-b-2">
            <div className="items-center flex gap-x-4">
              <p className="text-lg leading-6 font-bold text-theme-text-primary">
                {t("privacy.title")}
              </p>
            </div>
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary">
              {t("privacy.description")}
            </p>
          </div>
          {loading ? (
            <div className="h-1/2 transition-all duration-500 relative md:ml-[2px] md:mr-[8px] md:my-[16px] md:rounded-[26px] p-[18px] h-full overflow-y-scroll">
              <div className="w-full h-full flex justify-center items-center">
                <PreLoader />
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto flex flex-col gap-y-6 pt-6">
              <ProviderPrivacy />
              <TelemetryStatus />
            </div>
          )}
        </div>
      </AdminContentPanel>
    </div>
  );
}

function TelemetryStatus(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section className="relative w-full max-w-[720px]">
      <div className="flex items-start gap-x-3 rounded-lg border border-theme-sidebar-border bg-theme-bg-primary/40 p-4">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-green-400 light:text-green-700">
          <ShieldCheck size={20} weight="bold" />
        </div>
        <div className="flex flex-col gap-y-2">
          <h2 className="text-sm font-semibold leading-5 text-theme-text-primary">
            {t("privacyAndData.telemetryDisabledTitle")}
          </h2>
          <p className="text-xs leading-[18px] text-theme-text-secondary">
            {t("privacyAndData.telemetryDisabledBody")}
          </p>
          <p className="text-xs leading-[18px] text-theme-text-secondary">
            {t("privacyAndData.telemetryDisabledDetail")}
          </p>
        </div>
      </div>
    </section>
  );
}
