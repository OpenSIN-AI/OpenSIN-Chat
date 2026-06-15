// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import Toggle from "@/components/lib/Toggle";
import { useTranslation } from "react-i18next";

type CaptureAsOption = {
  labelKey: string;
  value: string;
};

const CAPTURE_AS_VALUES: CaptureAsOption[] = [
  { labelKey: "webScrapingNode.captureAs.text", value: "text" },
  { labelKey: "webScrapingNode.captureAs.html", value: "html" },
  {
    labelKey: "webScrapingNode.captureAs.querySelector",
    value: "querySelector",
  },
];

type WebScrapingNodeConfig = {
  url?: string;
  captureAs: string;
  querySelector?: string;
  enableSummarization?: boolean;
  resultVariable?: string;
};

type WebScrapingNodeProps = {
  config: WebScrapingNodeConfig;
  onConfigChange: (config: WebScrapingNodeConfig) => void;
  renderVariableSelect: (
    value: string | undefined,
    onChange: (value: string) => void,
    placeholder: string,
    allowCreate: boolean,
  ) => JSX.Element;
};

export default function WebScrapingNode({
  config,
  onConfigChange,
  renderVariableSelect,
}: WebScrapingNodeProps): JSX.Element {
  const { t } = useTranslation();
  const captureAsOptions = CAPTURE_AS_VALUES.map((opt) => ({
    label: t(opt.labelKey),
    value: opt.value,
  }));
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-text-primary mb-2">
          {t("webScrapingNode.urlLabel")}
        </label>
        <input
          type="url"
          value={config?.url || ""}
          onChange={(e) =>
            onConfigChange({
              ...config,
              url: e.target.value,
            })
          }
          className="w-full border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none p-2.5"
          placeholder={t("webScrapingNode.urlPlaceholder")}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-text-primary mb-2">
          {t("webScrapingNode.captureAsLabel")}
        </label>
        <select
          value={config.captureAs}
          onChange={(e) =>
            onConfigChange({ ...config, captureAs: e.target.value })
          }
          className="w-full border-none bg-theme-settings-input-bg text-theme-text-primary text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none p-2.5"
        >
          {captureAsOptions.map((captureAs) => (
            <option
              key={captureAs.value}
              value={captureAs.value}
              className="bg-theme-settings-input-bg"
            >
              {captureAs.label}
            </option>
          ))}
        </select>
      </div>

      {config.captureAs === "querySelector" && (
        <div>
          <label className="block text-sm font-medium text-theme-text-primary mb-2">
            {t("webScrapingNode.querySelectorLabel")}
          </label>
          <p className="text-xs text-theme-text-secondary mb-2">
            {t("webScrapingNode.querySelectorHelp")}
          </p>
          <input
            value={config.querySelector}
            onChange={(e) =>
              onConfigChange({ ...config, querySelector: e.target.value })
            }
            placeholder={t("webScrapingNode.querySelectorPlaceholder")}
            className="w-full border-none bg-theme-settings-input-bg text-theme-text-primary text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none p-2.5"
          />
        </div>
      )}

      <Toggle
        size="md"
        variant="horizontal"
        label={t("webScrapingNode.contentSummarization")}
        hint="content-summarization-tooltip"
        enabled={config.enableSummarization ?? true}
        onChange={(checked) =>
          onConfigChange({ ...config, enableSummarization: checked })
        }
      />
      <div>
        <label className="block text-sm font-medium text-theme-text-primary mb-2">
          {t("webScrapingNode.resultVariable")}
        </label>
        {renderVariableSelect(
          config.resultVariable,
          (value) => onConfigChange({ ...config, resultVariable: value }),
          t("webScrapingNode.selectOrCreateVariable"),
          true,
        )}
      </div>
    </div>
  );
}