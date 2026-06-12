// SPDX-License-Identifier: MIT
import Toggle from "@/components/lib/Toggle";
import { useTranslation } from "react-i18next";

export default function WebScrapingNode({
  config,
  onConfigChange,
  renderVariableSelect,
}) {
  const { t } = useTranslation();
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
          {/* eslint-disable i18next/no-literal-string */}
          {[
            { label: t("webScrapingNode.captureAs.text"), value: "text" },
            { label: t("webScrapingNode.captureAs.html"), value: "html" },
            {
              label: t("webScrapingNode.captureAs.querySelector"),
              value: "querySelector",
            },
          ].map((captureAs) => (
            <option
              key={captureAs.value}
              value={captureAs.value}
              className="bg-theme-settings-input-bg"
            >
              {captureAs.label}
            </option>
          ))}
          {/* eslint-enable i18next/no-literal-string */}
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
