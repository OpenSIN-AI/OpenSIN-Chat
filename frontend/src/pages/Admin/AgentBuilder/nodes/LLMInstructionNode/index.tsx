// SPDX-License-Identifier: MIT
import React from "react";
import { useTranslation } from "react-i18next";

export default function LLMInstructionNode({
  config,
  onConfigChange,
  renderVariableSelect,
}: {
  config?: { instruction?: string; resultVariable?: string };
  onConfigChange: (c: any) => void;
  renderVariableSelect: (value: any, onChange: (v: any) => void, placeholder: string, required: boolean) => React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-text-primary mb-2">
          {t("agentBuilder.nodes.llmInstruction.instruction")}
        </label>
        <textarea
          value={config?.instruction || ""}
          onChange={(e) =>
            onConfigChange({
              ...config,
              instruction: e.target.value,
            })
          }
          className="w-full border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none p-2.5"
          rows={3}
          placeholder={t(
            "agentBuilder.nodes.llmInstruction.instructionPlaceholder",
          )}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-text-primary mb-2">
          {t("agentBuilder.nodes.llmInstruction.resultVariable")}
        </label>
        {renderVariableSelect(
          config?.resultVariable,
          (value) => onConfigChange({ ...config, resultVariable: value }),
          t("agentBuilder.nodes.llmInstruction.selectOrCreateVariable"),
          true,
        )}
      </div>
    </div>
  );
}
