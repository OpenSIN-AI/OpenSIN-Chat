// SPDX-License-Identifier: MIT
import PreLoader from "@/components/Preloader";
import useProviderEndpointAutoDiscovery from "@/hooks/useProviderEndpointAutoDiscovery";
import { NVIDIA_NIM_COMMON_URLS } from "@/utils/constants";
import useProviderModels from "@/hooks/useProviderModels";
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

  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <div className="flex justify-between items-center mb-2">
          <label className="text-white text-sm font-semibold">
            NVIDIA Nim Base URL
          </label>
          {loading ? (
            <PreLoader size="6" />
          ) : (
            <>
              {!basePathValue.value && (
                <button
                  onClick={handleAutoDetectClick}
                  className="bg-primary-button text-xs font-medium px-2 py-1 rounded-lg hover:bg-secondary hover:text-white shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
                >
                  Auto-Detect
                </button>
              )}
            </>
          )}
        </div>
        <input
          type="url"
          name="NvidiaNimLLMBasePath"
          className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          placeholder="http://localhost:8000/v1"
          value={basePathValue.value}
          required={true}
          autoComplete="off"
          spellCheck={false}
          onChange={basePath.onChange}
          onBlur={basePath.onBlur}
        />
        <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
          Enter the URL where NVIDIA NIM is running.
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
  const { customModels, isLoading } = useProviderModels("nvidia-nim", basePath);
  if (isLoading || customModels.length === 0) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          Chat Model Selection
        </label>
        <select
          name="NvidiaNimLLMModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} selected={true}>
            -- loading available models --
          </option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-white text-sm font-semibold block mb-3">
        Chat Model Selection
      </label>
      <select
        name="NvidiaNimLLMModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
      >
        {(customModels as any).map((model) => (
          <option
            key={model.id}
            value={model.id}
            selected={settings?.NvidiaNimLLMModelPref === model.id}
          >
            {model.name}
          </option>
        ))}
      </select>
    </div>
  );
}
