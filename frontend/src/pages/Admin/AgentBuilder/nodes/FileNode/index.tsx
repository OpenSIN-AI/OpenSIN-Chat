// SPDX-License-Identifier: MIT
import React from "react";
import { useTranslation } from "react-i18next";

export default function FileNode({
  config,
  onConfigChange,
  renderVariableSelect,
}: {
  config: {
    operation?: string;
    path?: string;
    content?: string;
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
          {t("agentBuilder.fileNode.operation")}
        </label>
        <select
          value={config.operation}
          onChange={(e) => onConfigChange({ operation: e.target.value })}
          className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-white focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none"
        >
          <option value="read" className="bg-theme-bg-primary">
            {t("agentBuilder.fileNode.readFile")}
          </option>
          <option value="write" className="bg-theme-bg-primary">
            {t("agentBuilder.fileNode.writeFile")}
          </option>
          <option value="append" className="bg-theme-bg-primary">
            {t("agentBuilder.fileNode.appendToFile")}
          </option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          {t("agentBuilder.fileNode.filePath")}
        </label>
        <input
          type="text"
          placeholder={t("agentBuilder.fileNode.filePathPlaceholder")}
          value={config.path}
          onChange={(e) => onConfigChange({ path: e.target.value })}
          className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-white placeholder:text-theme-placeholder focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {config.operation !== "read" && (
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            {t("agentBuilder.fileNode.content")}
          </label>
          <textarea
            placeholder={t("agentBuilder.fileNode.contentPlaceholder")}
            value={config.content}
            onChange={(e) => onConfigChange({ content: e.target.value })}
            className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-white placeholder:text-theme-placeholder focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none"
            rows={3}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          {t("agentBuilder.fileNode.storeResultIn")}
        </label>
        {renderVariableSelect(
          config.resultVariable,
          (value) => onConfigChange({ resultVariable: value }),
          t("agentBuilder.fileNode.selectOrCreateVariable"),
          false,
        )}
      </div>
    </div>
  );
}
