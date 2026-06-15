// SPDX-License-Identifier: MIT
import Sidebar from "@/components/SettingsSidebar";
import { isMobile } from "react-device-detect";
import { useState, useEffect } from "react";
import CommunityHub from "@/models/communityHub";
import ContextualSaveBar from "@/components/ContextualSaveBar";
import showToast from "@/utils/toast";
import { FullScreenLoader } from "@/components/Preloader";
import paths from "@/utils/paths";
import { Info } from "@phosphor-icons/react";
import UserItems from "./UserItems";
import useCommunityHubSettings from "@/hooks/useCommunityHubSettings";
import { useTranslation } from "react-i18next";

const PERIOD = ".";

export default function CommunityHubAuthentication() {
  const { t } = useTranslation();
  const { settings, isLoading, mutate } = useCommunityHubSettings();
  const connectionKeyFromSettings = settings?.connectionKey || "";
  const [originalConnectionKey, setOriginalConnectionKey] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [connectionKey, setConnectionKey] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && connectionKeyFromSettings !== undefined) {
      setOriginalConnectionKey(connectionKeyFromSettings);
      setConnectionKey(connectionKeyFromSettings);
    }
  }, [isLoading, connectionKeyFromSettings]);

  async function resetChanges() {
    setConnectionKey(originalConnectionKey);
    setHasChanges(false);
  }

  async function onConnectionKeyChange(e) {
    const newConnectionKey = e.target.value;
    setConnectionKey(newConnectionKey);
    setHasChanges(true);
  }

  async function updateConnectionKey() {
    if (connectionKey === originalConnectionKey) return;
    setLoading(true);
    try {
      const response = await CommunityHub.updateSettings({
        hub_api_key: connectionKey,
      });
      if (!response.success)
        return showToast(t("communityHub.auth.toast.saveFailed"), "error");
      setHasChanges(false);
      showToast(t("communityHub.auth.toast.saveSuccess"), "success");
      setOriginalConnectionKey(connectionKey);
      mutate();
    } catch (error) {
      console.error(error);
      showToast(t("communityHub.auth.toast.saveFailed"), "error");
    } finally {
      setLoading(false);
    }
  }

  async function disconnectHub() {
    setLoading(true);
    try {
      const response = await CommunityHub.updateSettings({
        hub_api_key: "",
      });
      if (!response.success)
        return showToast(
          t("communityHub.auth.toast.disconnectFailed"),
          "error",
        );
      setHasChanges(false);
      showToast(t("communityHub.auth.toast.disconnectSuccess"), "success");
      setOriginalConnectionKey("");
      setConnectionKey("");
      mutate();
    } catch (error) {
      console.error(error);
      showToast(t("communityHub.auth.toast.disconnectFailed"), "error");
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) return <FullScreenLoader />;
  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      <ContextualSaveBar
        showing={hasChanges}
        onSave={updateConnectionKey}
        onCancel={resetChanges}
      />
      <div
        style={{ "--content-height": isMobile ? "100%" : "calc(100% - 32px)" }}
        className="h-[var(--content-height)] relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full overflow-y-scroll p-4 md:p-0"
      >
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[86px] md:py-6 py-16">
          <div className="w-full flex flex-col gap-y-1 pb-6 border-white light:border-theme-sidebar-border border-b-2 border-opacity-10">
            <div className="items-center">
              <p className="text-lg leading-6 font-bold text-theme-text-primary">
                {t("communityHub.auth.title")}
              </p>
            </div>
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary">
              {t("communityHub.auth.descriptionPart1")}
              <b>{t("communityHub.auth.private")}</b>
              {t("communityHub.auth.descriptionPart2")}
            </p>
          </div>

          {!connectionKey && (
            <div className="border border-theme-border my-2 flex flex-col md:flex-row md:items-center gap-x-2 text-theme-text-primary mb-4 bg-theme-settings-input-bg w-1/2 rounded-lg px-4 py-2">
              <div className="flex flex-col gap-y-2">
                <div className="gap-x-2 flex items-center">
                  <Info size={25} />
                  <h1 className="text-lg font-semibold">
                    {t("communityHub.auth.whyConnectTitle")}
                  </h1>
                </div>
                <p className="text-sm text-theme-text-secondary">
                  {t("communityHub.auth.whyConnectBodyPart1")}
                  <b>{t("communityHub.auth.private")}</b>
                  {t("communityHub.auth.whyConnectBodyPart2")}
                  <br />
                  <br />
                  <i>{t("communityHub.auth.whyConnectNote")}</i>
                </p>
              </div>
            </div>
          )}

          {/* API Key Section */}
          <div className="mt-6 mb-12">
            <div className="flex flex-col w-full max-w-[400px]">
              <label className="text-theme-text-primary text-sm font-semibold block mb-2">
                {t("communityHub.auth.apiKeyLabel")}
              </label>
              <input
                type="password"
                value={connectionKey || ""}
                onChange={onConnectionKeyChange}
                className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                placeholder={t("communityHub.auth.apiKeyPlaceholder")}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-theme-text-secondary text-xs">
                  {t("communityHub.auth.apiKeyHelp")}{" "}
                  <a
                    href={paths.communityHub.profile()}
                    className="underline text-primary-button"
                  >
                    {t("communityHub.auth.apiKeyHelpLink")}
                  </a>
                  {PERIOD}
                </p>
                {!!originalConnectionKey && (
                  <button
                    onClick={disconnectHub}
                    className="border-none text-red-500 hover:text-red-600 text-sm font-medium transition-colors duration-200"
                  >
                    {t("communityHub.auth.disconnect")}
                  </button>
                )}
              </div>
            </div>
          </div>

          {!!originalConnectionKey && (
            <div className="mt-6">
              <UserItems connectionKey={originalConnectionKey} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
