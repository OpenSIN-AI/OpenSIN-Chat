// SPDX-License-Identifier: MIT
// Purpose: Configuration node for making an HTTP API call within an agent flow.
// Docs: ApiCallNode.doc.md
/* eslint-disable react-hooks/refs */
import React, { useRef, useState } from "react";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { useTranslation } from "react-i18next";
import type { BlockConfig } from "../../BlockList";

interface HeaderItem {
  key: string;
  value: string;
}

interface FormDataItem {
  key: string;
  value: string;
}

interface ApiCallNodeProps {
  config: BlockConfig;
  onConfigChange: (config: Partial<BlockConfig>) => void;
  renderVariableSelect: (
    value: any,
    onChange: (value: string) => void,
    placeholder?: string,
    isMenu?: boolean,
  ) => React.ReactNode;
}

const API_METHODS = ["GET", "POST", "DELETE", "PUT", "PATCH"];

export default function ApiCallNode({
  config,
  onConfigChange,
  renderVariableSelect,
}: ApiCallNodeProps): JSX.Element {
  const { t } = useTranslation();
  const urlInputRef = useRef<HTMLInputElement | null>(null);
  const [showVarMenu, setShowVarMenu] = useState(false);
  const varButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleHeaderChange = (
    index: number,
    field: keyof HeaderItem,
    value: string,
  ) => {
    const newHeaders = [...(config.headers || [])];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    onConfigChange({ headers: newHeaders });
  };

  const addHeader = () => {
    const newHeaders = [...(config.headers || []), { key: "", value: "" }];
    onConfigChange({ headers: newHeaders });
  };

  const removeHeader = (index: number) => {
    const newHeaders = [...(config.headers || [])].filter(
      (_, i) => i !== index,
    );
    onConfigChange({ headers: newHeaders });
  };

  const insertVariableAtCursor = (variableName: string) => {
    if (!urlInputRef.current) return;

    const input = urlInputRef.current;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const currentValue = config.url as string;

    const newValue =
      currentValue.substring(0, start) +
      "${" +
      variableName +
      "}" +
      currentValue.substring(end);

    onConfigChange({ url: newValue });
    setShowVarMenu(false);

    // Set cursor position after the inserted variable
    setTimeout(() => {
      const newPosition = start + variableName.length + 3; // +3 for ${}
      input.setSelectionRange(newPosition, newPosition);
      input.focus();
    }, 0);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-text-primary mb-2">
          {t("apiCallNode.url")}
        </label>
        <div className="flex gap-2">
          <input
            ref={urlInputRef}
            type="text"
            placeholder={t("apiCallNode.urlPlaceholder")}
            value={config.url as string}
            onChange={(e) => onConfigChange({ url: e.target.value })}
            className="flex-1 border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none p-2.5"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="relative">
            <button
              type="button"
              ref={varButtonRef}
              onClick={() => setShowVarMenu(!showVarMenu)}
              className="h-full px-3 rounded-lg border-none bg-theme-settings-input-bg text-theme-text-primary hover:bg-theme-action-menu-item-hover transition-colors duration-300 flex items-center gap-1"
              title={t("apiCallNode.insertVariable")}
            >
              <Plus className="w-4 h-4" />
              <CaretDown className="w-3 h-3" />
            </button>
            {showVarMenu && (
              <div className="absolute right-0 top-[calc(100%+4px)] w-48 bg-theme-settings-input-bg border-none rounded-lg shadow-lg z-10">
                {renderVariableSelect(
                  "",
                  insertVariableAtCursor,
                  t("apiCallNode.selectVariableToInsert"),
                  true,
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-text-primary mb-2">
          {t("apiCallNode.method")}
        </label>
        <select
          value={config.method as string}
          onChange={(e) => onConfigChange({ method: e.target.value })}
          className="w-full border-none bg-theme-settings-input-bg text-theme-text-primary text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none p-2.5"
        >
          {API_METHODS.map((method) => (
            <option
              key={method}
              value={method}
              className="bg-theme-settings-input-bg"
            >
              {method}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-theme-text-primary">
            {t("apiCallNode.headers")}
          </label>
          <button
            type="button"
            onClick={addHeader}
            className="p-1.5 rounded-lg border-none bg-theme-settings-input-bg text-theme-text-primary hover:bg-theme-action-menu-item-hover transition-colors duration-300"
            title={t("apiCallNode.addHeader")}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-2">
          {(config.headers || []).map((header: HeaderItem, index: number) => (
            <div key={`header-${header.key}-${index}`} className="flex gap-2">
              <input
                type="text"
                placeholder={t("apiCallNode.headerName")}
                value={header.key}
                onChange={(e) =>
                  handleHeaderChange(index, "key", e.target.value)
                }
                className="flex-1 border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none p-2.5"
                autoComplete="off"
                spellCheck={false}
              />
              <input
                type="text"
                placeholder={t("apiCallNode.headerValue")}
                value={header.value}
                onChange={(e) =>
                  handleHeaderChange(index, "value", e.target.value)
                }
                className="flex-1 border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none p-2.5"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => removeHeader(index)}
                className="p-2.5 rounded-lg border-none bg-theme-settings-input-bg text-theme-text-primary hover:text-red-500 hover:border-red-500/20 hover:bg-red-500/10 transition-colors duration-300"
                title={t("apiCallNode.removeHeader")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {["POST", "PUT", "PATCH"].includes(config.method as string) && (
        <div>
          <label className="block text-sm font-medium text-theme-text-primary mb-2">
            {t("apiCallNode.requestBody")}
          </label>
          <div className="space-y-2">
            <select
              value={config.bodyType || "json"}
              onChange={(e) => onConfigChange({ bodyType: e.target.value })}
              className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-theme-text-primary focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none light:bg-theme-settings-input-bg light:border-black/10"
            >
              <option
                value="json"
                className="bg-theme-bg-primary light:bg-theme-settings-input-bg"
              >
                {t("apiCallNode.json")}
              </option>
              <option
                value="text"
                className="bg-theme-bg-primary light:bg-theme-settings-input-bg"
              >
                {t("apiCallNode.rawText")}
              </option>
              <option
                value="form"
                className="bg-theme-bg-primary light:bg-theme-settings-input-bg"
              >
                {t("apiCallNode.formData")}
              </option>
            </select>
            {config.bodyType === "json" ? (
              <textarea
                placeholder={t("apiCallNode.jsonPlaceholder")}
                value={config.body as string}
                onChange={(e) => onConfigChange({ body: e.target.value })}
                className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-theme-text-primary placeholder:text-theme-text-secondary/20 focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none light:bg-theme-settings-input-bg light:border-black/10 font-mono"
                rows={4}
                autoComplete="off"
                spellCheck={false}
              />
            ) : config.bodyType === "form" ? (
              <div className="space-y-2">
                {(config.formData || []).map(
                  (item: FormDataItem, index: number) => (
                    <div
                      key={`form-${item.key}-${index}`}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        placeholder={t("apiCallNode.formKey")}
                        value={item.key}
                        onChange={(e) => {
                          const newFormData = [...(config.formData || [])];
                          newFormData[index] = { ...item, key: e.target.value };
                          onConfigChange({ formData: newFormData });
                        }}
                        className="flex-1 p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-theme-text-primary placeholder:text-theme-text-secondary/20 focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none light:bg-theme-settings-input-bg light:border-black/10"
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <input
                        type="text"
                        placeholder={t("apiCallNode.formValue")}
                        value={item.value}
                        onChange={(e) => {
                          const newFormData = [...(config.formData || [])];
                          newFormData[index] = {
                            ...item,
                            value: e.target.value,
                          };
                          onConfigChange({ formData: newFormData });
                        }}
                        className="flex-1 p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-theme-text-primary placeholder:text-theme-text-secondary/20 focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none light:bg-theme-settings-input-bg light:border-black/10"
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newFormData = [
                            ...(config.formData || []),
                          ].filter((_, i) => i !== index);
                          onConfigChange({ formData: newFormData });
                        }}
                        className="p-2.5 rounded-lg bg-theme-bg-primary border border-white/5 text-theme-text-primary hover:text-red-500 hover:border-red-500/20 hover:bg-red-500/10 transition-colors duration-300 light:bg-theme-settings-input-bg light:border-black/10"
                        title={t("apiCallNode.removeField")}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ),
                )}
                <button
                  type="button"
                  onClick={() => {
                    const newFormData = [
                      ...(config.formData || []),
                      { key: "", value: "" },
                    ];
                    onConfigChange({ formData: newFormData });
                  }}
                  className="w-full p-2.5 rounded-lg border-none bg-theme-settings-input-bg text-theme-text-primary hover:bg-theme-action-menu-item-hover transition-colors duration-300 text-sm"
                >
                  {t("apiCallNode.addFormField")}
                </button>
              </div>
            ) : (
              <textarea
                placeholder={t("apiCallNode.rawRequestBody")}
                value={config.body as string}
                onChange={(e) => onConfigChange({ body: e.target.value })}
                className="w-full border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none p-2.5"
                rows={4}
                autoComplete="off"
                spellCheck={false}
              />
            )}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-theme-text-primary mb-2">
          {t("apiCallNode.storeResponseIn")}
        </label>
        {renderVariableSelect(
          config.responseVariable,
          (value) => onConfigChange({ responseVariable: value }),
          t("apiCallNode.selectOrCreateVariable"),
        )}
      </div>
    </div>
  );
}
