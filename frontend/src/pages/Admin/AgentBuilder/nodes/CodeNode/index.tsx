// SPDX-License-Identifier: MIT
import React from "react";
import { useTranslation } from "react-i18next";

export default function CodeNode({
  config,
  onConfigChange,
  renderVariableSelect,
}: {
  config: { language?: string; code?: string; resultVariable?: string };
  onConfigChange: (c: any) => void;
  renderVariableSelect: (value: any, onChange: (v: any) => void, placeholder: string, required: boolean) => React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          {t("agentBuilder.codeNode.language")}
        </label>
        <select
          value={config.language}
          onChange={(e) => onConfigChange({ language: e.target.value })}
          className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-white focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none"
        >
          <option value="javascript" className="bg-theme-bg-primary">
            {t("agentBuilder.codeNode.javascript")}
          </option>
          <option value="python" className="bg-theme-bg-primary">
            {t("agentBuilder.codeNode.python")}
          </option>
          <option value="shell" className="bg-theme-bg-primary">
            {t("agentBuilder.codeNode.shell")}
          </option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          {t("agentBuilder.codeNode.code")}
        </label>
        <textarea
          placeholder={t("agentBuilder.codeNode.codePlaceholder")}
          value={config.code}
          onChange={(e) => onConfigChange({ code: e.target.value })}
          className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-white placeholder:text-white/20 focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none font-mono"
          rows={5}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          {t("agentBuilder.codeNode.storeResultIn")}
        </label>
        {renderVariableSelect(
          config.resultVariable,
          (value) => onConfigChange({ resultVariable: value }),
          t("agentBuilder.codeNode.selectOrCreateVariable"),
          false,
        )}
      </div>
    </div>
  );
}
