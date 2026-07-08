// SPDX-License-Identifier: MIT
import { useState } from "react";
import { useTranslation } from "react-i18next";
import useProviderEndpointAutoDiscovery from "@/hooks/useProviderEndpointAutoDiscovery";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
import { LLM_PREFERENCE_CHANGED_EVENT } from "@/pages/GeneralSettings/LLMPreference/llmProviders";
import { DOCKER_MODEL_RUNNER_COMMON_URLS } from "@/utils/constants";
import { Tooltip } from "react-tooltip";
import { Link } from "react-router-dom";
import ModelTable from "@/components/lib/ModelTable";
import ModelTableLayout from "@/components/lib/ModelTable/layout";
import ModelTableLoadingSkeleton from "@/components/lib/ModelTable/loading";
import DMRUtils from "@/models/utils/dmrUtils";
import showToast from "@/utils/toast";
import useProviderModels from "@/hooks/useProviderModels";

export default function DockerModelRunnerOptions({ settings }: any) {
  const { t } = useTranslation();
  const {
    autoDetecting: loading,
    basePath,
    basePathValue,
    handleAutoDetectClick,
  } = useProviderEndpointAutoDiscovery({
    provider: "docker-model-runner",
    initialBasePath: settings?.DockerModelRunnerBasePath,
    ENDPOINTS: DOCKER_MODEL_RUNNER_COMMON_URLS,
  });
  const [selectedModelId, setSelectedModelId] = useState(
    settings?.DockerModelRunnerModelPref,
  );
  const [maxTokens, setMaxTokens] = useState(
    settings?.DockerModelRunnerModelTokenLimit || 4096,
  );

  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="flex gap-[36px] mt-1.5 flex-wrap">
        <div className="flex flex-col w-60">
          <div className="flex items-center gap-1 mb-3">
            <div className="flex justify-between items-center gap-x-2">
              <label className="text-theme-text-primary text-sm font-semibold">
                {t("dockerModelRunner.baseUrlLabel")}
              </label>
              {loading ? (
                <CircleNotch className="w-4 h-4 text-theme-text-secondary animate-spin" />
              ) : (
                <>
                  {!basePathValue.value && (
                    <button
                      type="button"
                      onClick={handleAutoDetectClick}
                      className="bg-primary-button text-xs font-medium px-2 py-1 rounded-lg hover:bg-secondary hover:text-theme-text-primary light:hover:text-theme-text-primary shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
                    >
                      {t("dockerModelRunner.autoDetect")}
                    </button>
                  )}
                </>
              )}
            </div>
            <Tooltip
              id="docker-model-runner-base-url"
              place="top"
              delayShow={300}
              delayHide={800}
              clickable={true}
              className="tooltip !text-xs !opacity-100 z-99 !max-w-[250px] !whitespace-normal !break-words"
            >
              {t("dockerModelRunner.baseUrlTooltip1")}
              <br />
              <br />
              {t("dockerModelRunner.baseUrlTooltip2a")}{" "}
              <b>{t("dockerModelRunner.baseUrlTooltip2b")}</b>{" "}
              {t("dockerModelRunner.baseUrlTooltip2c")}
              <br />
              <br />
              <Link
                to="https://docs.docker.com/ai/model-runner/get-started/#docker-desktop"
                target="_blank"
                className="text-blue-500 hover:underline"
              >
                {t("dockerModelRunner.learnMore")}
              </Link>
            </Tooltip>
            <div
              className="text-theme-text-secondary cursor-pointer hover:bg-theme-bg-primary flex items-center justify-center rounded-full"
              data-tooltip-id="docker-model-runner-base-url"
              data-tooltip-place="top"
              data-tooltip-delay-hide={800}
            >
              <Info size={18} className="text-theme-text-secondary" />
            </div>
          </div>

          <input
            type="url"
            name="DockerModelRunnerBasePath"
            className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("dockerModelRunner.baseUrlPlaceholder")}
            value={basePathValue.value}
            required={true}
            autoComplete="off"
            spellCheck={false}
            onChange={basePath.onChange}
            onBlur={basePath.onBlur}
          />
        </div>
        <div className="flex flex-col w-60">
          <div className="flex items-center gap-1 mb-3">
            <label className="text-theme-text-primary text-sm font-semibold block">
              {t("dockerModelRunner.modelContextWindowLabel")}
            </label>
            <Tooltip
              id="docker-model-runner-model-context-window"
              place="top"
              delayShow={300}
              delayHide={800}
              clickable={true}
              className="tooltip !text-xs !opacity-100 z-99 !max-w-[350px] !whitespace-normal !break-words"
            >
              {t("dockerModelRunner.modelContextWindowTooltip1")}
              <br />
              <br />
              {t("dockerModelRunner.modelContextWindowTooltip2a")}{" "}
              <code>
                {t("dockerModelRunner.modelContextWindowTooltipCode")}
              </code>{" "}
              {t("dockerModelRunner.modelContextWindowTooltip2b")}{" "}
              <code>
                {t("dockerModelRunner.modelContextWindowTooltipCode2")}
              </code>{" "}
              {t("dockerModelRunner.modelContextWindowTooltip2c")}
              <br />
              <br />
              {/* eslint-disable i18next/no-literal-string */}
              <code>
                docker model configure --context-size {maxTokens || 8192}{" "}
                {selectedModelId ?? "ai/qwen3:latest"}
              </code>
              {/* eslint-enable i18next/no-literal-string */}
              <br />
              <br />
              <Link
                to="https://docs.docker.com/ai/model-runner/#context-size"
                target="_blank"
                className="text-blue-500 hover:underline"
              >
                {t("dockerModelRunner.learnMore")}
              </Link>
            </Tooltip>
            <div
              className="text-theme-text-secondary cursor-pointer hover:bg-theme-bg-primary flex items-center justify-center rounded-full"
              data-tooltip-id="docker-model-runner-model-context-window"
              data-tooltip-place="top"
              data-tooltip-delay-hide={800}
            >
              <Info size={18} className="text-theme-text-secondary" />
            </div>
          </div>
          <input
            type="number"
            name="DockerModelRunnerModelTokenLimit"
            className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("dockerModelRunner.contextWindowPlaceholder")}
            min={1}
            value={maxTokens}
            onChange={(e) =>
              setMaxTokens(Number((e.target as unknown as any)?.value))
            }
            onScroll={(e) => (e.target as HTMLElement).blur()}
            required={true}
            autoComplete="off"
          />
        </div>
        <DockerModelRunnerModelSelection
          selectedModelId={selectedModelId}
          setSelectedModelId={setSelectedModelId}
          basePath={basePathValue.value}
        />
      </div>
    </div>
  );
}

function DockerModelRunnerModelSelection({
  selectedModelId,
  setSelectedModelId,
  basePath = null,
}: any) {
  const { t } = useTranslation();
  const {
    customModels: providerCustomModels,
    isLoading,
    refresh: fetchModels,
  } = useProviderModels("docker-model-runner", null, basePath);
  const [customModels, setCustomModels] = useState([]);
  const [filteredModels, setFilteredModels] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  async function downloadModel(
    modelId: any,
    fileSize: any,
    progressCallback: any,
  ) {
    try {
      if (
        !window.confirm(
          `Are you sure you want to download this model? It is ${fileSize} in size and may take a while to download.`,
        )
      )
        return;
      const { success, error } = await DMRUtils.downloadModel(
        modelId,
        basePath,
        progressCallback,
      );
      if (!success)
        throw new Error(
          error || "An error occurred while downisLoading the model",
        );
      progressCallback(100);
      handleSetActiveModel(modelId);

      const existingModels = [...providerCustomModels];
      const newModel = existingModels.find((model) => model.id === modelId);
      if (newModel) {
        newModel.downloaded = true;
        setCustomModels(existingModels);
        setFilteredModels(existingModels);
        setSearchQuery("");
      }
    } catch (e) {
      console.error("Error downisLoading model:", e);
      showToast(
        e.message || "An error occurred while downisLoading the model",
        "error",
        { clear: true },
      );
    } finally {
      setLoading(false);
    }
  }

  function groupModelsByAlias(models: any) {
    const mapping = new Map();
    mapping.set("installed", new Map());
    mapping.set("not installed", new Map());

    const customModels = models.reduce((acc, model) => {
      acc[model.organization] = acc[model.organization] || [];
      acc[model.organization].push(model);
      return acc;
    }, {});

    Object.entries(customModels).forEach(([organization, models]) => {
      const hasInstalled = (models as any).some((model) => model.downloaded);
      if (hasInstalled) {
        const installedModels = (models as any).filter(
          (model) => model.downloaded,
        );
        mapping
          .get("installed")
          .set("Downloaded Models", [
            ...(mapping.get("installed").get("Downloaded Models") || []),
            ...installedModels,
          ]);
      }
      const tags = (models as any).map((model) => ({
        ...model,
        name: model.name.split(":")[1],
      }));
      mapping.get("not installed").set(organization, tags);
    });

    const orderedMap = new Map();
    const installedMap = new Map();
    mapping
      .get("installed")
      .entries()
      .forEach(([organization, models]) =>
        installedMap.set(organization, models),
      );
    mapping
      .get("not installed")
      .entries()
      .forEach(([organization, models]) =>
        orderedMap.set(organization, models),
      );

    // Sort the models by organization/creator name alphabetically but keep the installed models at the top
    return Object.fromEntries(
      Array.from(installedMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .concat(
          Array.from(orderedMap.entries()).sort((a, b) =>
            a[0].localeCompare(b[0]),
          ),
        ),
    );
  }

  function handleSetActiveModel(modelId: any) {
    if (modelId === selectedModelId) return;
    setSelectedModelId(modelId);
    window.dispatchEvent(new Event(LLM_PREFERENCE_CHANGED_EVENT));
  }

  const groupedCustomModels = groupModelsByAlias(filteredModels);
  return (
    <ModelTableLayout
      fetchModels={fetchModels}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      isLoading={isLoading}
    >
      <Tooltip
        id="install-model-tooltip"
        place="top"
        className="tooltip !text-xs !opacity-100 z-99"
      />
      <input
        type="hidden"
        name="DockerModelRunnerModelPref"
        id="DockerModelRunnerModelPref"
        value={selectedModelId}
      />
      {isLoading ? (
        <ModelTableLoadingSkeleton />
      ) : filteredModels.length === 0 ? (
        <div className="flex flex-col w-full gap-y-2 mt-4">
          <p className="text-theme-text-secondary text-sm">
            {t("dockerModelRunner.noModelsFound")}
          </p>
        </div>
      ) : (
        Object.entries(groupedCustomModels).map(([alias, models]) => (
          <ModelTable
            key={alias}
            alias={alias}
            models={models as any[]}
            setActiveModel={handleSetActiveModel}
            downloadModel={downloadModel}
            selectedModelId={selectedModelId}
            ui={{
              showRuntime: false,
            }}
          />
        ))
      )}
    </ModelTableLayout>
  );
}
