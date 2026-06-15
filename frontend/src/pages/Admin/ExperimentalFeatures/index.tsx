// SPDX-License-Identifier: MIT
import { useState } from "react";
import { useTranslation } from "react-i18next";
import Sidebar from "@/components/SettingsSidebar";
import { isMobile } from "react-device-detect";
import { FullScreenLoader } from "@/components/Preloader";
import { CaretRight, Flask } from "@phosphor-icons/react";
import { configurableFeatures } from "./features";
import ModalWrapper from "@/components/ModalWrapper";
import paths from "@/utils/paths";
import showToast from "@/utils/toast";
import useExperimentalFeatures from "@/hooks/useExperimentalFeatures";

export default function ExperimentalFeatures() {
  const { t } = useTranslation();
  const { featureFlags, isLoading, refresh } = useExperimentalFeatures();
  const [selectedFeature, setSelectedFeature] = useState(
    "experimental_live_file_sync",
  );

  if (isLoading) {
    return (
      <div
        style={{ "--content-height": isMobile ? "100%" : "calc(100% - 32px)" }}
        className="h-[var(--content-height)] relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] w-full flex justify-center items-center"
      >
        <FullScreenLoader />
      </div>
    );
  }

  return (
    <FeatureLayout>
      <div className="flex-1 flex gap-x-6 p-4 mt-10">
        <div className="flex flex-col gap-y-[18px]">
          <div className="text-white flex items-center gap-x-2">
            <Flask size={24} />
            <p className="text-lg font-medium">
              {t("experimentalFeatures.title")}
            </p>
          </div>
          <div className="bg-theme-bg-secondary text-white rounded-xl min-w-[360px] w-fit">
            {Object.values(configurableFeatures).map((feature, index) => {
              const isFirst = index === 0;
              const isLast =
                index === Object.values(configurableFeatures).length - 1;
              return (
                <FeatureItem
                  key={feature.key}
                  feature={feature}
                  isSelected={selectedFeature === feature.key}
                  isActive={featureFlags[feature.key]}
                  handleClick={setSelectedFeature}
                  borderClass={[
                    ...(isFirst ? ["rounded-t-xl"] : []),
                    ...(isLast
                      ? ["rounded-b-xl"]
                      : ["border-b border-white/10"]),
                  ].join(" ")}
                />
              );
            })}
          </div>
        </div>

        <FeatureVerification>
          <div className="flex-[2] flex flex-col gap-y-[18px] mt-10">
            <div className="bg-theme-bg-secondary text-white rounded-xl flex-1 p-4">
              {selectedFeature ? (
                <SelectedFeatureComponent
                  feature={configurableFeatures[selectedFeature]}
                  settings={featureFlags}
                  refresh={refresh}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white/60">
                  <Flask size={40} />
                  <p className="font-medium">
                    {t("experimentalFeatures.selectFeature")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </FeatureVerification>
      </div>
    </FeatureLayout>
  );
}

function FeatureLayout({ children }) {
  return (
    <div
      id="workspace-feature-settings-container"
      className="w-screen h-screen overflow-hidden bg-theme-bg-container flex md:mt-0 mt-6"
    >
      <Sidebar />
      <div
        style={{ "--content-height": isMobile ? "100%" : "calc(100% - 32px)" }}
        className="h-[var(--content-height)] relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] w-full flex"
      >
        {children}
      </div>
    </div>
  );
}

function FeatureItem({
  feature = {},
  isSelected = false,
  isActive = false,
  handleClick = () => {},
  borderClass = "border-b border-white/10",
}) {
  const { t } = useTranslation();
  return (
    <div
      key={feature.key}
      className={`py-3 px-4 flex items-center justify-between cursor-pointer transition-all duration-300 hover:bg-white/5 ${borderClass} ${
        isSelected ? "bg-white/10 light:bg-theme-bg-sidebar" : ""
      }`}
      onClick={() => {
        if (feature?.href) window.location = feature.href;
        else handleClick?.(feature.key);
      }}
    >
      <div className="text-sm font-light">{feature.title}</div>
      <div className="flex items-center gap-x-2">
        {feature.autoEnabled ? (
          <>
            <div className="text-sm text-theme-text-secondary font-medium">
              {t("common.on")}
            </div>
            <div className="w-[14px]" />
          </>
        ) : (
          <>
            <div className="text-sm text-theme-text-secondary font-medium">
              {isActive ? t("common.on") : t("common.off")}
            </div>
            <CaretRight
              size={14}
              weight="bold"
              className="text-theme-text-secondary"
            />
          </>
        )}
      </div>
    </div>
  );
}

function SelectedFeatureComponent({ feature, settings, refresh }) {
  const Component = feature?.component;
  return Component ? (
    <Component
      enabled={settings[feature.key]}
      feature={feature.key}
      onToggle={refresh}
    />
  ) : null;
}

function FeatureVerification({ children }) {
  const { t } = useTranslation();
  if (!window.localStorage.getItem("openafd_tos_experimental_feature_set")) {
    function acceptTos(e) {
      e.preventDefault();

      window.localStorage.setItem(
        "openafd_tos_experimental_feature_set",
        "accepted",
      );
      showToast(t("experimentalFeatures.toastEnabled"), "success");
      setTimeout(() => {
        window.location.reload();
      }, 2_500);
      return;
    }

    return (
      <>
        <ModalWrapper isOpen={true}>
          <div className="w-full max-w-2xl bg-theme-bg-secondary rounded-lg shadow border-2 border-theme-modal-border overflow-hidden">
            <div className="relative p-6 border-b rounded-t border-theme-modal-border">
              <div className="flex items-center gap-2">
                <Flask size={24} className="text-theme-text-primary" />
                <h3 className="text-xl font-semibold text-white">
                  {t("experimentalFeatures.termsTitle")}
                </h3>
              </div>
            </div>
            <form onSubmit={acceptTos}>
              <div className="py-7 px-9 space-y-4 flex-col">
                <div className="w-full text-white text-md flex flex-col gap-y-4">
                  <p>{t("experimentalFeatures.termsP1")}</p>

                  <div>
                    <p>{t("experimentalFeatures.termsP2")}</p>
                    <ul className="list-disc ml-6 text-sm font-mono mt-2">
                      <li>{t("experimentalFeatures.termsLi1")}</li>
                      <li>{t("experimentalFeatures.termsLi2")}</li>
                      <li>{t("experimentalFeatures.termsLi3")}</li>
                      <li>{t("experimentalFeatures.termsLi4")}</li>
                      <li>{t("experimentalFeatures.termsLi5")}</li>
                      <li>{t("experimentalFeatures.termsLi6")}</li>
                    </ul>
                  </div>

                  <div>
                    <p>{t("experimentalFeatures.termsP3")}</p>
                    <ul className="list-disc ml-6 text-sm font-mono mt-2">
                      <li>{t("experimentalFeatures.termsLi7")}</li>
                      <li>{t("experimentalFeatures.termsLi8")}</li>
                      <li>{t("experimentalFeatures.termsLi9")}</li>
                      <li>{t("experimentalFeatures.termsLi10")}</li>
                      <li>{t("experimentalFeatures.termsLi11")}</li>
                    </ul>
                  </div>

                  <p>{t("experimentalFeatures.termsP4")}</p>
                </div>
              </div>
              <div className="flex w-full justify-between items-center p-6 space-x-2 border-t border-theme-modal-border rounded-b">
                <a
                  href={paths.home()}
                  className="transition-all duration-300 bg-transparent text-white hover:bg-red-500/50 light:hover:bg-red-300/50 px-4 py-2 rounded-lg text-sm border border-theme-modal-border"
                >
                  {t("experimentalFeatures.reject")}
                </a>
                <button
                  type="submit"
                  className="transition-all duration-300 bg-white text-black hover:opacity-60 px:4 py-2 rounded-lg text-sm border border-theme-modal-border"
                >
                  {t("experimentalFeatures.accept")}
                </button>
              </div>
            </form>
          </div>
        </ModalWrapper>
        {children}
      </>
    );
  }
  return <>{children}</>;
}
