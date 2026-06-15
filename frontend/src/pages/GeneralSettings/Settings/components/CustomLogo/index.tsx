// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import useLogo from "@/hooks/useLogo";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { useRef, useState, ChangeEvent } from "react";
import { Plus } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import useIsDefaultLogo from "@/hooks/useIsDefaultLogo";

export default function CustomLogo(): JSX.Element {
  const { t } = useTranslation();
  const { logo: _initLogo, setLogo: _setLogo } = useLogo();
  const { isDefaultLogo: _isDefaultLogo, refresh: refreshIsDefaultLogo } =
    useIsDefaultLogo();
  const [logo, setLogo] = useState<string>("");
  const [isDefaultLogo, setIsDefaultLogo] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync from SWR hooks
  const [synced, setSynced] = useState(false);
  if (!synced && _initLogo !== undefined) {
    setLogo(_initLogo || "");
    setIsDefaultLogo(_isDefaultLogo);
    setSynced(true);
  }

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return false;

    const objectURL = URL.createObjectURL(file);
    setLogo(objectURL);

    const formData = new FormData();
    formData.append("logo", file);
    const { success, error } = await System.uploadLogo(formData);
    URL.revokeObjectURL(objectURL);
    if (!success) {
      showToast(`Failed to upload logo: ${error}`, "error");
      setLogo(_initLogo);
      return;
    }

    const { logoURL } = await System.fetchLogo();
    _setLogo(logoURL);
    refreshIsDefaultLogo();

    showToast("Image uploaded successfully.", "success");
    setIsDefaultLogo(false);
  };

  const handleRemoveLogo = async () => {
    setLogo("");
    setIsDefaultLogo(true);

    const { success, error } = await System.removeCustomLogo();
    if (!success) {
      console.error("Failed to remove logo:", error);
      showToast(`Failed to remove logo: ${error}`, "error");
      const { logoURL } = await System.fetchLogo();
      setLogo(logoURL);
      setIsDefaultLogo(false);
      return;
    }

    const { logoURL } = await System.fetchLogo();
    _setLogo(logoURL);
    refreshIsDefaultLogo();

    showToast("Image successfully removed.", "success");
  };

  const triggerFileInputClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-y-0.5 my-4">
      <p className="text-sm leading-6 font-semibold text-white">
        {t("customization.items.logo.title")}
      </p>
      <p className="text-xs text-white/60">
        {t("customization.items.logo.description")}
      </p>
      {isDefaultLogo ? (
        <div className="flex md:flex-row flex-col items-center">
          <div className="flex flex-row gap-x-8">
            <label
              className="mt-3 transition-all duration-300 hover:opacity-60"
              hidden={!isDefaultLogo}
            >
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div
                className="w-80 py-4 bg-theme-settings-input-bg rounded-2xl border-2 border-dashed border-theme-text-secondary border-opacity-60 justify-center items-center inline-flex cursor-pointer"
                htmlFor="logo-upload"
              >
                <div className="flex flex-col items-center justify-center">
                  <div className="rounded-full bg-white/40">
                    <Plus className="w-6 h-6 text-black/80 m-2" />
                  </div>
                  <div className="text-theme-text-primary text-opacity-80 text-sm font-semibold py-1">
                    {t("customization.items.logo.add")}
                  </div>
                  <div className="text-theme-text-secondary text-opacity-60 text-xs font-medium py-1">
                    {t("customization.items.logo.recommended")}
                  </div>
                </div>
              </div>
            </label>
          </div>
        </div>
      ) : (
        <div className="flex md:flex-row flex-col items-center relative">
          <div className="group w-80 h-[130px] mt-3 overflow-hidden">
            <img
              src={logo}
              alt={t("common.uploadedLogo")}
              className="w-full h-full object-cover border-2 border-theme-text-secondary border-opacity-60 p-1 rounded-2xl"
            />

            <div className="absolute w-80 top-0 left-0 right-0 bottom-0 flex flex-col gap-y-3 justify-center items-center rounded-2xl mt-3 bg-black bg-opacity-80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out border-2 border-transparent hover:border-white">
              <button
                onClick={triggerFileInputClick}
                className="text-[#FFFFFF] text-base font-medium hover:text-opacity-60 mx-2"
              >
                {t("customization.items.logo.replace")}
              </button>

              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
                ref={fileInputRef}
              />
              <button
                onClick={handleRemoveLogo}
                className="text-[#FFFFFF] text-base font-medium hover:text-opacity-60 mx-2"
              >
                {t("customization.items.logo.remove")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}