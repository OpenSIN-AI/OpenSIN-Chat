// SPDX-License-Identifier: MIT
import PreLoader from "@/components/Preloader";
import useProviderEndpointAutoDiscovery from "@/hooks/useProviderEndpointAutoDiscovery";
import { NVIDIA_NIM_COMMON_URLS } from "@/utils/constants";
import useProviderModels from "@/hooks/useProviderModels";
import { useTranslation } from "react-i18next";
/**
 * This component is used to select a remote NVIDIA NIM model endpoint
 * This is the default component and way to connect to NVIDIA NIM
 * as the "managed" provider can only work in the Desktop context.
 */
export default function RemoteNvidiaNimOptions({ settings }: any) {
  const {
    autoDetecting: loading,
    basePath,
    basePathValue,
    handleAutoDetectClick,
  } = useProviderEndpointAutoDiscovery({
    provider: "nvidia-nim",
    initialBasePath: settings?.NvidiaNimLLMBasePath,
    ENDPOINTS: NVIDIA_NIM_COMMON_URLS,
  });
  const { t } = useTranslation();

  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <div className="flex justify-between items-center mb-2">
          <label className="text-theme-text-primary text-sm font-semibold">
            {t("providerSettings.nvidiaNim.baseUrl")}
          </label>
          {loading ? (
            <PreLoader size="6" />
          ) : (
            <>
              {!basePathValue.value && (
                <button
                  type="button"
                  onClick={handleAutoDetectClick}
                  className="bg-primary-button text-xs font-medium px-2 py-1 rounded-lg hover:bg-secondary hover:text-theme-text-primary light:hover:text-theme-text-primary shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
                >
                  {t("providerSettings.nvidiaNim.autoDetect")}
                </button>
              )}
            </>
          )}
        </div>
        <input
          type="url"
          name="NvidiaNimLLMBasePath"
          className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          placeholder={t("providerSettings.nvidiaNim.baseUrlPlaceholder")}
          value={basePathValue.value}
          required={true}
          autoComplete="off"
          spellCheck={false}
          onChange={basePath.onChange}
          onBlur={basePath.onBlur}
        />
        <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
          {t("providerSettings.nvidiaNim.baseUrlHelp")}
        </p>
      </div>
      {!settings?.credentialsOnly && (
        <NvidiaNimModelSelection
          settings={settings}
          basePath={basePath.value}
        />
      )}
    </div>
  );
}
function NvidiaNimModelSelection({ settings, basePath }: any) {
  const { customModels, defaultModels, isLoading } = useProviderModels(
    "nvidia-nim",
    basePath,
  );
  const { t } = useTranslation();
  // Combine API-fetched models with default fallback models
  const allModels =
    (customModels as any).length > 0 ? customModels : defaultModels;
  // Show dropdown as soon as we have either loaded models OR fall back to defaults
  if (isLoading && (allModels as any).length === 0) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-theme-text-primary text-sm font-semibold block mb-3">
          {t("providerSettings.nvidiaNim.modelSelection")}
        </label>
        <select
          name="NvidiaNimLLMModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-theme-text-primary text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} value="">
            {t("providerSettings.nvidiaNim.loadingModels")}
          </option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-theme-text-primary text-sm font-semibold block mb-3">
        {t("providerSettings.nvidiaNim.modelSelection")}
      </label>
      <select
        name="NvidiaNimLLMModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-theme-text-primary text-sm rounded-lg block w-full p-2.5"
      >
        {(allModels as any).map((model) => {
          const id = typeof model === "string" ? model : model.id;
          const name =
            typeof model === "string" ? model : model.name || model.id;
          return (
            <option key={id} value={id}>
              {name}
            </option>
          );
        })}
      </select>
    </div>
  );
}
