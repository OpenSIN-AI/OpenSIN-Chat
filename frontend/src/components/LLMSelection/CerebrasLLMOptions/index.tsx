// SPDX-License-Identifier: MIT
import { useState } from "react";
import useProviderModels from "@/hooks/useProviderModels";

export default function CerebrasLLMOptions({ settings }: any) {
  const [inputValue, setInputValue] = useState(settings?.CerebrasApiKey);
  const [apiKey, setApiKey] = useState(settings?.CerebrasApiKey);

  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          Cerebras API Key
        </label>
        <input
          type="password"
          name="CerebrasApiKey"
          className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          placeholder="Cerebras API Key"
          defaultValue={settings?.CerebrasApiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setInputValue((e.target as unknown as any)?.value)}
          onBlur={() => setApiKey(inputValue)}
        />
      </div>

      {!settings?.credentialsOnly && (
        <CerebrasModelSelection settings={settings} apiKey={apiKey} />
      )}
    </div>
  );
}

/**
 * Cerebras model selection component
 * @param {Object} props - The component props
 * @param {string} props.apiKey - The Cerebras API key (not used since we only need public models for now)
 * @param {Object} props.settings - The system settings
 * @returns {JSX.Element} The Cerebras model selection component
 */
function CerebrasModelSelection({ apiKey: _apiKey, settings }: any) {
  const { customModels, isLoading } = useProviderModels("cerebras", _apiKey);
  if (isLoading) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          Chat Model Selection
        </label>
        <select
          name="CerebrasModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} selected={true}>
            -- loading available models --
          </option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <label className="text-white text-sm font-semibold block mb-3">
        Chat Model Selection
      </label>
      <select
        name="CerebrasModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
      >
        {customModels.length > 0 && (
          <optgroup label="Available models">
            {(customModels as any).map((model) => {
              return (
                <option
                  key={model.id}
                  value={model.id}
                  selected={settings?.CerebrasModelPref === model.id}
                >
                  {model.name}
                </option>
              );
            })}
          </optgroup>
        )}
      </select>
    </div>
  );
}
