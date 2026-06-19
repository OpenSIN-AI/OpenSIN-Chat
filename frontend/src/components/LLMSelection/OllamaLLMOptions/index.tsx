// SPDX-License-Identifier: MIT
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { OLLAMA_COMMON_URLS } from "@/utils/constants";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretUp } from "@phosphor-icons/react/dist/csr/CaretUp";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import useProviderEndpointAutoDiscovery from "@/hooks/useProviderEndpointAutoDiscovery";
import { Tooltip } from "react-tooltip";
import { Link } from "react-router-dom";
import useProviderModels from "@/hooks/useProviderModels";

export default function OllamaLLMOptions({ settings }: any) {
  const { t } = useTranslation();
  const {
    autoDetecting: loading,
    basePath,
    basePathValue,
    authToken,
    authTokenValue,
    showAdvancedControls,
    setShowAdvancedControls,
    handleAutoDetectClick,
  } = useProviderEndpointAutoDiscovery({
    provider: "ollama",
    initialBasePath: settings?.OllamaLLMBasePath,
    ENDPOINTS: OLLAMA_COMMON_URLS,
  });
  const [maxTokens, setMaxTokens] = useState(
    settings?.OllamaLLMTokenLimit || "",
  );

  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-start gap-[36px] mt-1.5">
        <OllamaLLMModelSelection
          settings={settings}
          basePath={basePath.value}
          authToken={authToken.value}
        />
      </div>
      <div className="flex justify-start mt-4">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setShowAdvancedControls(!showAdvancedControls);
          }}
          className="border-none text-theme-text-primary hover:text-theme-text-secondary flex items-center text-sm"
        >
          {showAdvancedControls
            ? t("ollama.hideAdvanced")
            : t("ollama.showAdvanced")}{" "}
          {t("ollama.advancedSettings")}
          {showAdvancedControls ? (
            <CaretUp size={14} className="ml-1" />
          ) : (
            <CaretDown size={14} className="ml-1" />
          )}
        </button>
      </div>

      <div hidden={!showAdvancedControls}>
        <div className="flex flex-col">
          <div className="w-full flex items-start gap-4 mb-4">
            <div className="flex flex-col w-60">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-1">
                  <label className="text-white text-sm font-semibold">
                    {t("ollama.baseUrlLabel")}
                  </label>
                  <Info
                    size={18}
                    className="text-theme-text-secondary cursor-pointer"
                    data-tooltip-id="ollama-base-url"
                    data-tooltip-content={t("ollama.baseUrlTooltip")}
                  />
                  <Tooltip
                    id="ollama-base-url"
                    place="top"
                    delayShow={300}
                    className="tooltip !text-xs !opacity-100 !max-w-[250px] !whitespace-normal !break-words"
                  />
                </div>
                {loading ? (
                  <CircleNotch
                    size={16}
                    className="text-theme-text-secondary animate-spin"
                  />
                ) : (
                  <>
                    {!basePathValue.value && (
                      <button
                        type="button"
                        onClick={handleAutoDetectClick}
                        className="bg-primary-button text-xs font-medium px-2 py-1 rounded-lg hover:bg-secondary hover:text-white shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
                      >
                        {t("ollama.autoDetect")}
                      </button>
                    )}
                  </>
                )}
              </div>
              <input
                type="url"
                name="OllamaLLMBasePath"
                className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                placeholder={t("ollama.baseUrlPlaceholder")}
                value={basePathValue.value}
                required={true}
                autoComplete="off"
                spellCheck={false}
                onChange={basePath.onChange}
                onBlur={basePath.onBlur}
              />
            </div>

            <div className="flex flex-col w-60">
              <div className="flex items-center mb-2 gap-x-1">
                <label className="text-white text-sm font-semibold block">
                  {t("ollama.keepAliveLabel")}
                </label>
                <Info
                  size={18}
                  className="text-theme-text-secondary cursor-pointer"
                  data-tooltip-id="ollama-keep-alive"
                />
                <Tooltip
                  id="ollama-keep-alive"
                  place="top"
                  delayShow={300}
                  delayHide={400}
                  clickable={true}
                  className="tooltip !text-xs !opacity-100 !max-w-[250px] !whitespace-normal !break-words"
                >
                  <p className="text-xs leading-[18px] font-base">
                    {t("ollama.keepAliveTooltip")}{" "}
                    <Link
                      className="underline text-blue-300"
                      to="https://docs.ollama.com/faq#how-do-i-keep-a-model-loaded-in-memory-or-make-it-unload-immediately"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("ollama.keepAliveLearnMore")}
                    </Link>
                  </p>
                </Tooltip>
              </div>
              <select
                name="OllamaLLMKeepAliveSeconds"
                required={true}
                className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
                defaultValue={settings?.OllamaLLMKeepAliveSeconds ?? "300"}
              >
                <option value="0">{t("ollama.keepAliveNoCache")}</option>
                <option value="300">{t("ollama.keepAlive5Min")}</option>
                <option value="3600">{t("ollama.keepAlive1Hour")}</option>
                <option value="-1">{t("ollama.keepAliveForever")}</option>
              </select>
            </div>
          </div>
          <div className="w-full flex items-start gap-4">
            <div className="flex flex-col w-60">
              <div className="flex items-center mb-2 gap-x-1">
                <label className="text-white text-sm font-semibold block">
                  {t("ollama.contextWindowLabel")}
                </label>
                <Info
                  size={18}
                  className="text-theme-text-secondary cursor-pointer"
                  data-tooltip-id="ollama-model-context-window"
                />
                <Tooltip
                  id="ollama-model-context-window"
                  place="top"
                  delayShow={300}
                  delayHide={400}
                  clickable={true}
                  className="tooltip !text-xs !opacity-100 !max-w-[250px] !whitespace-normal !break-words"
                >
                  <p className="text-xs leading-[18px] font-base">
                    {t("ollama.contextWindowTooltip")}
                    <br /> <br />
                    {t("ollama.contextWindowTooltip2")}
                    <br /> <br />
                    <b>{t("ollama.contextWindowTooltipImportant")}:</b>{" "}
                    {t("ollama.contextWindowTooltipImportantText")}
                    <br /> <br />
                    {t("ollama.contextWindowTooltipFallback")}
                  </p>
                </Tooltip>
              </div>
              <input
                type="number"
                name="OllamaLLMTokenLimit"
                className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                placeholder={t("ollama.contextWindowPlaceholder")}
                min={1}
                value={maxTokens}
                onChange={(e) =>
                  setMaxTokens(
                    (e.target as unknown as any)?.value
                      ? Number((e.target as unknown as any)?.value)
                      : "",
                  )
                }
                onScroll={(e) => (e.target as HTMLElement).blur()}
                required={false}
                autoComplete="off"
              />
            </div>

            <div className="flex flex-col w-60">
              <div className="flex items-center mb-2 gap-x-1">
                <label className="text-white text-sm font-semibold">
                  {t("ollama.authTokenLabel")}
                </label>
                <Info
                  size={18}
                  className="text-theme-text-secondary cursor-pointer"
                  data-tooltip-id="ollama-authentication-token"
                />
                <Tooltip
                  id="ollama-authentication-token"
                  place="top"
                  delayShow={300}
                  delayHide={400}
                  clickable={true}
                  className="tooltip !text-xs !opacity-100 !max-w-[250px] !whitespace-normal !break-words"
                >
                  <p className="text-xs leading-[18px] font-base">
                    {t("ollama.authTokenTooltip1")}{" "}
                    <code>{t("ollama.authTokenTooltipBearer")}</code>{" "}
                    {t("ollama.authTokenTooltip1End")}
                    <br /> <br />
                    {t("ollama.authTokenTooltip2")}{" "}
                    <b>{t("ollama.authTokenTooltip2b")}</b>{" "}
                    {t("ollama.authTokenTooltip2End")}
                  </p>
                </Tooltip>
              </div>
              <input
                type="password"
                name="OllamaLLMAuthToken"
                className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg outline-none block w-full p-2.5 focus:outline-primary-button active:outline-primary-button"
                placeholder={t("ollama.authTokenPlaceholder")}
                defaultValue={
                  settings?.OllamaLLMAuthToken ? "*".repeat(20) : ""
                }
                value={authTokenValue.value}
                onChange={authToken.onChange}
                onBlur={authToken.onBlur}
                required={false}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OllamaLLMModelSelection({
  settings,
  basePath = null,
  authToken = null,
}: any) {
  const { t } = useTranslation();
  const { customModels, isLoading } = useProviderModels(
    "ollama",
    authToken,
    basePath,
  );
  if (isLoading || customModels.length === 0) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-2">
          {t("ollama.modelLabel")}
        </label>
        <select
          name="OllamaLLMModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} selected={true}>
            {!!basePath ? t("ollama.loadingModels") : t("ollama.enterUrlFirst")}
          </option>
        </select>
        <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
          {t("ollama.selectModelHelp")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-white text-sm font-semibold block mb-2">
        {t("ollama.modelLabel")}
      </label>
      <select
        name="OllamaLLMModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
      >
        {customModels.length > 0 && (
          <optgroup label={t("ollama.yourLoadedModels")}>
            {(customModels as any).map((model) => {
              return (
                <option
                  key={model.id}
                  value={model.id}
                  selected={settings.OllamaLLMModelPref === model.id}
                >
                  {model.id}
                </option>
              );
            })}
          </optgroup>
        )}
      </select>
      <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
        {t("ollama.chooseModelHelp")}
      </p>
    </div>
  );
}
