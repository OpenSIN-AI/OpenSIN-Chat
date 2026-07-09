// SPDX-License-Identifier: MIT
import { useRef, useState, useEffect } from "react";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { Cpu } from "@phosphor-icons/react/dist/csr/Cpu";
import { Circle } from "@phosphor-icons/react/dist/csr/Circle";
import { DotsThreeVertical } from "@phosphor-icons/react/dist/csr/DotsThreeVertical";
import { CloudArrowDown } from "@phosphor-icons/react/dist/csr/CloudArrowDown";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import pluralize from "pluralize";
import { titleCase } from "text-case";
import { useTranslation } from "react-i18next";
import { humanFileSize } from "@/utils/numbers";
import MonoProviderIcon from "../MonoProviderIcon";
import logger from "@/utils/logger";

/**
 * @typedef {Object} ModelDefinition
 * @property {string} id - The ID of the model.
 * @property {'CPU' | 'GPU' | 'NPU'} deviceType - The device type of the model.
 * @property {number} modelSize - The size of the model in megabytes.
 * @property {boolean} downloaded - Whether the model is downloaded.
 */

/**
 * @param {object} props - The props of the component.
 * @param {string} props.alias - The alias of the model.
 * @param {Array<ModelDefinition>} props.models - The models to display.
 * @param {(model: string, progressCallback: (percentage: number) => void) => void} props.downloadModel - The function to download the model.
 * @param {(model: string) => void} props.uninstallModel - The function to uninstall the model.
 * @param {(model: string) => void} props.setActiveModel - The function to set the active model.
 * @param {string} props.selectedModelId - The ID of the selected model.
 * @param {object} props.ui - The UI configuration.
 * @param {boolean} props.ui.showRuntime - Whether to show the runtime.
 * @returns {React.ReactNode}
 */
export default function ModelTable({
  alias = "",
  models = [] as any[],
  downloadModel = null as
    ((modelId: string, fileSize: any, cb: (p: number) => void) => void) | null,
  uninstallModel = null as ((modelId: string) => void) | null,
  setActiveModel = (_id: string) => {},
  selectedModelId = "",
  ui = {
    showRuntime: true,
  },
}) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(
    (models as any).some((model: any) => model.downloaded),
  );
  const totalModels = models.length;

  return (
    <div className="flex flex-col w-full border-b border-theme-modal-border py-[18px]">
      <button
        type="button"
        onClick={() => setShowAll(!showAll)}
        aria-label={
          showAll
            ? t("common.showLess", "Show less")
            : t("common.showAll", "Show all")
        }
        className="border-none text-theme-text-secondary text-sm font-medium hover:underline flex items-center gap-x-[8px]"
      >
        {showAll ? (
          <CaretDown
            size={16}
            weight="bold"
            className="text-theme-text-secondary"
          />
        ) : (
          <CaretRight
            size={16}
            weight="bold"
            className="text-theme-text-secondary"
          />
        )}
        <div className="flex items-center gap-x-[4px]">
          <MonoProviderIcon
            provider={alias}
            match="pattern"
            size={16}
            className="text-theme-text-primary"
          />
          <p className="flex items-center gap-x-1 text-theme-text-primary text-base font-bold">
            {titleCase(alias)}
            <span className="text-theme-text-secondary font-normal text-sm">
              {t("modelTable.modelCount", {
                count: totalModels,
                plural: pluralize("Model", totalModels),
              })}
            </span>
          </p>
        </div>
      </button>
      <div hidden={!showAll} className="mt-[16px]">
        <div className="w-full flex flex-col gap-y-[8px]">
          {(models as any).map((model) => (
            <ModelRow
              key={model.id}
              alias={alias}
              model={model}
              downloadModel={downloadModel}
              uninstallModel={uninstallModel}
              setActiveModel={setActiveModel}
              selectedModelId={selectedModelId}
              ui={ui}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DeviceTypeTagWrapper({ text, bgClass, textClass }: any) {
  return (
    <div
      className={
        bgClass + " px-1.5 py-1 rounded-full flex items-center gap-x-1 w-fit"
      }
    >
      <Cpu size={14} weight="bold" className={textClass} />
      <p className={textClass + " text-xs"}>{text}</p>
    </div>
  );
}

/**
 * @param {{deviceType: ModelDefinition["deviceType"]}} deviceType
 * @returns {React.ReactNode}
 */
function DeviceTypeTag({ deviceType }: any) {
  const { t } = useTranslation();
  switch (deviceType?.toLowerCase()) {
    case "cpu":
      return (
        <DeviceTypeTagWrapper
          text={t("modelTable.cpu")}
          bgClass="bg-zinc-800 light:bg-zinc-200"
          textClass="text-theme-text-primary"
        />
      );
    case "gpu":
      return (
        <DeviceTypeTagWrapper
          text={t("modelTable.gpu")}
          bgClass="bg-green-800 light:bg-green-200"
          textClass="text-theme-text-primary"
        />
      );
    case "npu":
      return (
        <DeviceTypeTagWrapper
          text={t("modelTable.npu")}
          bgClass="bg-indigo-800 light:bg-indigo-200"
          textClass="text-theme-text-primary"
        />
      );
    default:
      return (
        <DeviceTypeTagWrapper
          text={t("modelTable.cpu")}
          bgClass="bg-zinc-800 light:bg-zinc-200"
          textClass="text-theme-text-primary"
        />
      );
  }
}

/**
 * @param {object} props - The props of the component.
 * @param {ModelDefinition} props.model - The model to display.
 * @param {(model: string, progressCallback: (percentage: number) => void) => Promise<void>} props.downloadModel - The function to download the model.
 * @param {(model: string) => Promise<void>} props.uninstallModel - The function to uninstall the model.
 * @param {(model: string) => void} props.setActiveModel - The function to set the active model.
 * @param {string} props.selectedModelId - The ID of the selected model.
 * @param {object} props.ui - The UI configuration.
 * @param {boolean} props.ui.showRuntime - Whether to show the runtime.
 * @returns {React.ReactNode}
 */
function ModelRow({
  alias,
  model,
  downloadModel = null,
  uninstallModel = null,
  setActiveModel,
  selectedModelId,
  ui = {
    showRuntime: true,
  },
}) {
  const { t } = useTranslation();
  const modelRowRef = useRef<any>(null);
  const [showOptions, setShowOptions] = useState(false as any);
  const [processing, setProcessing] = useState(false as any);
  const [downloadPercentage, setDownloadPercentage] = useState(0 as any);
  const fileSize =
    typeof model.size === "number"
      ? humanFileSize(model.size * 1e6, true, 2)
      : (model.size ?? "Unknown size");
  const [isActiveModel, setIsActiveModel] = useState(
    selectedModelId === model.id,
  );

  async function handleSetActiveModel() {
    setDownloadPercentage(0);
    if (model.downloaded) setActiveModel(model.id);
    else {
      try {
        if (!downloadModel) return;
        setProcessing(true);
        await downloadModel(model.id, fileSize, (percentage) => {
          setDownloadPercentage(percentage);
        });
      } catch (e) {
        logger.error("Failed to download model:", e);
      } finally {
        setProcessing(false);
      }
    }
  }

  async function handleUninstallModel() {
    if (!uninstallModel) return;
    try {
      setProcessing(true);
      await uninstallModel(model.id);
    } catch (e) {
      logger.error("Failed to uninstall model:", e);
    } finally {
      setProcessing(false);
    }
  }

  useEffect(() => {
    if (selectedModelId === model.id) {
      setIsActiveModel(true);
      modelRowRef.current?.classList.add("!bg-gray-200/10");
      const timer = setTimeout(
        () => modelRowRef.current?.classList.remove("!bg-gray-200/10"),
        800,
      );
      return () => clearTimeout(timer);
    } else {
      setIsActiveModel(false);
    }
  }, [selectedModelId]);

  return (
    <div
      ref={modelRowRef}
      className="w-full grid grid-cols-[1fr_auto_1fr] items-center gap-x-4 transition-all duration-300 rounded-lg"
    >
      <button
        type="button"
        className="border-none flex items-center gap-x-[8px] whitespace-nowrap py-[8px]"
        disabled={processing}
        onClick={handleSetActiveModel}
      >
        {ui.showRuntime && <DeviceTypeTag deviceType={model.deviceType} />}
        {!ui.showRuntime &&
          model.downloaded &&
          alias === "Downloaded Models" && (
            <MonoProviderIcon
              provider={model.organization}
              match="pattern"
              size={16}
              className="text-theme-text-primary"
            />
          )}
        <p className="text-theme-text-primary text-base">{model.name}</p>
        <p className="text-theme-text-secondary opacity-70 text-base">
          {fileSize}
        </p>
      </button>

      <div className="justify-self-start">
        <RenderStatus model={model} isActiveModel={isActiveModel} />
      </div>

      <div className="relative justify-self-end">
        {uninstallModel && model.downloaded ? (
          <>
            <button
              type="button"
              aria-label={t("common.select", "Select")}
              className="border-none hover:bg-white/20 rounded-lg p-1"
              onClick={() => setShowOptions(!showOptions)}
            >
              <DotsThreeVertical
                size={22}
                weight="bold"
                className="text-theme-text-primary cursor-pointer"
              />
            </button>
            {showOptions && (
              <div className="absolute top-[20px] right-[20px] bg-theme-action-menu-bg border border-theme-modal-border rounded-lg py-2 px-4 shadow-lg">
                <button
                  type="button"
                  className="border-none font-medium group"
                  onClick={handleUninstallModel}
                >
                  <p className="text-sm text-theme-text-primary group-hover:underline group-hover:text-theme-text-secondary">
                    {t("modelTable.uninstall")}
                  </p>
                </button>
              </div>
            )}
          </>
        ) : null}
        {!model.downloaded && !processing && (
          <button
            type="button"
            data-tooltip-id="install-model-tooltip"
            data-tooltip-place="top"
            data-tooltip-delay-show={300}
            data-tooltip-content={t("modelTable.installModel", {
              organization: model.organization,
              name: model.name,
            })}
            className="border-none hover:bg-white/20 light:hover:bg-black/5 rounded-lg p-2 flex items-center gap-x-1 cursor-pointer"
            onClick={handleSetActiveModel}
          >
            <CloudArrowDown
              size={20}
              weight="bold"
              className="text-theme-text-primary"
            />
          </button>
        )}
        {!model.downloaded && processing && (
          <div className="flex items-center justify-center gap-x-[10px] whitespace-nowrap">
            {!downloadPercentage && (
              <CircleNotch
                size={16}
                weight="bold"
                className="text-theme-text-primary animate-spin"
              />
            )}
            <p className="text-theme-text-secondary text-sm">
              {downloadPercentage}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function RenderStatus({ model, isActiveModel }: any) {
  const { t } = useTranslation();
  if (isActiveModel) {
    return (
      <div className="flex items-center justify-center gap-x-[10px] whitespace-nowrap">
        <Circle size={8} weight="fill" className="text-green-500" />
        <p className="text-theme-text-primary text-sm">
          {t("modelTable.active")}
        </p>
      </div>
    );
  }

  if (!isActiveModel && model.downloaded) {
    return (
      <p className="text-theme-text-secondary text-sm italic whitespace-nowrap">
        {t("modelTable.installed")}
      </p>
    );
  }

  if (!model.downloaded) {
    return (
      <p className="text-theme-text-secondary text-sm italic whitespace-nowrap">
        {t("modelTable.notInstalled")}
      </p>
    );
  }
  return null;
}
