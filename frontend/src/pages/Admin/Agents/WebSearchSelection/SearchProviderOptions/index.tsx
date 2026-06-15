// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";
const SerpApiEngines = [
  { name: "Google Search", value: "google" },
  { name: "Google Images", value: "google_images_light" },
  { name: "Google Jobs", value: "google_jobs" },
  { name: "Google Maps", value: "google_maps" },
  { name: "Google News", value: "google_news_light" },
  { name: "Google Patents", value: "google_patents" },
  { name: "Google Scholar", value: "google_scholar" },
  { name: "Google Shopping", value: "google_shopping_light" },
  { name: "Amazon", value: "amazon" },
  { name: "Baidu", value: "baidu" },
];
export function SerpApiOptions({ settings }) {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-white/60 my-2">
        {t("webSearch.getFreeApiKeySerpApi")}{" "}
        <a
          href="https://serpapi.com/"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 underline"
        >
          {t("webSearch.fromSerpApi")}
        </a>
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("common.apiKey")}
          </label>
          <input
            type="password"
            name="env::AgentSerpApiKey"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("webSearch.serpApiApiKey")}
            defaultValue={settings?.AgentSerpApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("common.engine")}
          </label>
          <select
            name="env::AgentSerpApiEngine"
            required={true}
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            defaultValue={settings?.AgentSerpApiEngine || "google"}
          >
            {SerpApiEngines.map(({ name, value }) => (
              <option key={name} value={value}>
                {name}
              </option>
            ))}
          </select>
          {/* <input
            type="text"
            name="env::AgentSerpApiEngine"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder="SerpApi engine (Google, Amazon...)"
            defaultValue={settings?.AgentSerpApiEngine || "google"}
            required={true}
            autoComplete="off"
            spellCheck={false}
          /> */}
        </div>
      </div>
    </>
  );
}

const SearchApiEngines = [
  { name: "Google Search", value: "google" },
  { name: "Google Maps", value: "google_maps" },
  { name: "Google Shopping", value: "google_shopping" },
  { name: "Google News", value: "google_news" },
  { name: "Google Jobs", value: "google_jobs" },
  { name: "Google Scholar", value: "google_scholar" },
  { name: "Google Finance", value: "google_finance" },
  { name: "Google Patents", value: "google_patents" },
  { name: "YouTube", value: "youtube" },
  { name: "Bing", value: "bing" },
  { name: "Bing News", value: "bing_news" },
  { name: "Amazon Product Search", value: "amazon_search" },
  { name: "Baidu", value: "baidu" },
];
export function SearchApiOptions({ settings }) {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-white/60 my-2">
        {t("webSearch.getFreeApiKeySearchApi")}{" "}
        <a
          href="https://www.searchapi.io/"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 underline"
        >
          {t("webSearch.fromSearchApi")}
        </a>
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("common.apiKey")}
          </label>
          <input
            type="password"
            name="env::AgentSearchApiKey"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("webSearch.searchApiApiKey")}
            defaultValue={settings?.AgentSearchApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("common.engine")}
          </label>
          <select
            name="env::AgentSearchApiEngine"
            required={true}
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            defaultValue={settings?.AgentSearchApiEngine || "google"}
          >
            {SearchApiEngines.map(({ name, value }) => (
              <option key={name} value={value}>
                {name}
              </option>
            ))}
          </select>
          {/* <input
            type="text"
            name="env::AgentSearchApiEngine"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder="SearchApi engine (Google, Bing...)"
            defaultValue={settings?.AgentSearchApiEngine || "google"}
            required={true}
            autoComplete="off"
            spellCheck={false}
          /> */}
        </div>
      </div>
    </>
  );
}

export function SerperDotDevOptions({ settings }) {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-white/60 my-2">
        {t("webSearch.getFreeApiKeySearchApi")}{" "}
        <a
          href="https://serper.dev"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 underline"
        >
          {t("webSearch.fromSerper")}
        </a>
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("common.apiKey")}
          </label>
          <input
            type="password"
            name="env::AgentSerperApiKey"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("webSearch.serperApiKey")}
            defaultValue={settings?.AgentSerperApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </>
  );
}

export function BingSearchOptions({ settings }) {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-white/60 my-2">
        {t("webSearch.getBingWebSearchSubscription")}{" "}
        <a
          href="https://portal.azure.com/"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 underline"
        >
          {t("webSearch.fromAzurePortal")}
        </a>
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("common.apiKey")}
          </label>
          <input
            type="password"
            name="env::AgentBingSearchApiKey"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("webSearch.bingWebSearchApiKey")}
            defaultValue={settings?.AgentBingSearchApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
      <p className="text-sm text-white/60 my-2">
        {t("webSearch.bingSetupTitle")}
      </p>
      <ol className="list-decimal text-sm text-white/60 ml-6">
        <li>
          {t("webSearch.bingSetupStep1")}{" "}
          <a
            href="https://portal.azure.com/"
            target="_blank"
            rel="noreferrer"
            className="text-blue-300 underline"
          >
            {t("webSearch.azurePortalUrl")}
          </a>
        </li>
        <li>{t("webSearch.bingSetupStep2")}</li>
        <li>{t("webSearch.bingSetupStep3")}</li>
        <li>{t("webSearch.bingSetupStep4")}</li>
        <li>{t("webSearch.bingSetupStep5")}</li>
        <li>{t("webSearch.bingSetupStep6")}</li>
      </ol>
    </>
  );
}

export function BaiduSearchOptions({ settings }) {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-white/60 my-2">
        {t("webSearch.getApiKey")}{" "}
        <a
          href="https://cloud.baidu.com/doc/qianfan-api/s/Wmbq4z7e5"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 underline"
        >
          {t("webSearch.fromBaidu")}
        </a>
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("common.apiKey")}
          </label>
          <input
            type="password"
            name="env::AgentBaiduSearchApiKey"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("webSearch.baiduApiKey")}
            defaultValue={
              settings?.AgentBaiduSearchApiKey ? "*".repeat(20) : ""
            }
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </>
  );
}

export function SerplySearchOptions({ settings }) {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-white/60 my-2">
        {t("webSearch.getFreeApiKeySearchApi")}{" "}
        <a
          href="https://serply.io"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 underline"
        >
          {t("webSearch.fromSerply")}
        </a>
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("common.apiKey")}
          </label>
          <input
            type="password"
            name="env::AgentSerplyApiKey"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("webSearch.serplyApiKey")}
            defaultValue={settings?.AgentSerplyApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </>
  );
}

export function SearXNGOptions({ settings }) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-x-4">
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("webSearch.searxngBaseUrl")}
        </label>
        <input
          type="url"
          name="env::AgentSearXNGApiUrl"
          className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          placeholder={t("webSearch.searxngBaseUrlPlaceholder")}
          defaultValue={settings?.AgentSearXNGApiUrl}
          required={true}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

export function TavilySearchOptions({ settings }) {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-white/60 my-2">
        {t("webSearch.getApiKey")}{" "}
        <a
          href="https://tavily.com/"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 underline"
        >
          {t("webSearch.fromTavily")}
        </a>
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("common.apiKey")}
          </label>
          <input
            type="password"
            name="env::AgentTavilyApiKey"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("webSearch.tavilyApiKey")}
            defaultValue={settings?.AgentTavilyApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </>
  );
}

export function DuckDuckGoOptions() {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-white/60 my-2">
        {t("webSearch.duckduckgoNoConfig")}
      </p>
    </>
  );
}

export function ExaSearchOptions({ settings }) {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-white/60 my-2">
        {t("webSearch.getApiKey")}{" "}
        <a
          href="https://exa.ai"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 underline"
        >
          {t("webSearch.fromExa")}
        </a>
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("common.apiKey")}
          </label>
          <input
            type="password"
            name="env::AgentExaApiKey"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("webSearch.exaApiKey")}
            defaultValue={settings?.AgentExaApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </>
  );
}

export function PerplexitySearchOptions({ settings }) {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-white/60 my-2">
        {t("webSearch.getApiKey")}{" "}
        <a
          href="https://console.perplexity.ai"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 underline"
        >
          {t("webSearch.fromPerplexity")}
        </a>
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("common.apiKey")}
          </label>
          <input
            type="password"
            name="env::AgentPerplexityApiKey"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("webSearch.perplexityApiKey")}
            defaultValue={settings?.AgentPerplexityApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </>
  );
}

export function VaneOptions() {
  const { t } = useTranslation();
  return (
    <div className="flex gap-x-4">
      <div className="flex flex-col">
        <p className="text-sm text-white/60 my-2">
          {t("webSearch.vaneNoConfig")}
        </p>
      </div>
    </div>
  );
}
