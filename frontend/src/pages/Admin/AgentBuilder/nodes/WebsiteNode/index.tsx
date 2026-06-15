// SPDX-License-Identifier: MIT
import React from "react";
import { useTranslation } from "react-i18next";

export default function WebsiteNode({
  config,
  onConfigChange,
  renderVariableSelect,
}: {
  config: {
    url?: string;
    action?: string;
    selector?: string;
    resultVariable?: string;
  };
  onConfigChange: (c: any) => void;
  renderVariableSelect: (
    value: any,
    onChange: (v: any) => void,
    placeholder: string,
    required: boolean,
  ) => React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          {t("agentBuilder.websiteNode.url")}
        </label>
        <input
          type="text"
          placeholder={t("agentBuilder.websiteNode.urlPlaceholder")}
          value={config.url}
          onChange={(e) => onConfigChange({ url: e.target.value })}
          className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-white placeholder:text-white/20 focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          {t("agentBuilder.websiteNode.action")}
        </label>
        <select
          value={config.action}
          onChange={(e) => onConfigChange({ action: e.target.value })}
          className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-white focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none"
        >
          <option value="read" className="bg-theme-bg-primary">
            {t("agentBuilder.websiteNode.readContent")}
          </option>
          <option value="click" className="bg-theme-bg-primary">
            {t("agentBuilder.websiteNode.clickElement")}
          </option>
          <option value="type" className="bg-theme-bg-primary">
            {t("agentBuilder.websiteNode.typeText")}
          </option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          {t("agentBuilder.websiteNode.cssSelector")}
        </label>
        <input
          type="text"
          placeholder={t("agentBuilder.websiteNode.cssSelectorPlaceholder")}
          value={config.selector}
          onChange={(e) => onConfigChange({ selector: e.target.value })}
          className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-white placeholder:text-white/20 focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          {t("agentBuilder.websiteNode.storeResultIn")}
        </label>
        {renderVariableSelect(
          config.resultVariable,
          (value) => onConfigChange({ resultVariable: value }),
          t("agentBuilder.websiteNode.selectOrCreateVariable"),
          false,
        )}
      </div>
    </div>
  );
}
