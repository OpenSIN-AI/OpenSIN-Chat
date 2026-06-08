// SPDX-License-Identifier: MIT
import { useState } from "react";
import useProviderModels from "@/hooks/useProviderModels";

export default function TogetherAiOptions({ settings }: any) {
  const [inputValue, setInputValue] = useState(settings?.TogetherAiApiKey);
  const [apiKey, setApiKey] = useState(settings?.TogetherAiApiKey);

  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          Together AI API Key
        </label>
        <input
          type="password"
          name="TogetherAiApiKey"
          className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          placeholder="Together AI API Key"
          defaultValue={settings?.TogetherAiApiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setInputValue(((e.target as unknown) as any)?.value)}
          onBlur={() => setApiKey(inputValue)}
        />
      </div>
      {!settings?.credentialsOnly && (
        <TogetherAiModelSelection settings={settings} apiKey={apiKey} />
      )}
    </div>
  );
}

function TogetherAiModelSelection({ settings, apiKey }: any) {
  const { customModels, isLoading } = useProviderModels("togetherai", apiKey);
  if (isLoading || Object.keys(customModels).length === 0) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          Chat Model Selection
        </label>
        <select
          name="TogetherAiModelPref"
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
        name="TogetherAiModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
      >
        {Object.keys(customModels)
          .sort()
          .map((organization) => (
            <optgroup key={organization} label={organization}>
              {customModels[organization].map((model) => (
                <option
                  key={model.id}
                  value={model.id}
                  selected={settings?.TogetherAiModelPref === model.id}
                >
                  {model.name}
                </option>
              ))}
            </optgroup>
          ))}
      </select>
    </div>
  );
}
