// SPDX-License-Identifier: MIT
import { useState } from "react";
import useProviderModels from "@/hooks/useProviderModels";

export default function MoonshotAiOptions({ settings }: any) {
  const [inputValue, setInputValue] = useState(settings?.MoonshotAiApiKey);
  const [moonshotAiKey, setMoonshotAiKey] = useState(
    settings?.MoonshotAiApiKey,
  );

  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          API Key
        </label>
        <input
          type="password"
          name="MoonshotAiApiKey"
          className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          placeholder="Moonshot AI API Key"
          defaultValue={settings?.MoonshotAiApiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setInputValue((e.target as unknown as any)?.value)}
          onBlur={() => setMoonshotAiKey(inputValue)}
        />
      </div>
      {!settings?.credentialsOnly && (
        <MoonshotAiModelSelection settings={settings} apiKey={moonshotAiKey} />
      )}
    </div>
  );
}

function MoonshotAiModelSelection({ apiKey, settings }: any) {
  const { customModels, isLoading } = useProviderModels("moonshotai", apiKey);
  if (!apiKey) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          Chat Model Selection
        </label>
        <select
          name="MoonshotAiModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} selected={true}>
            -- Enter API key --
          </option>
        </select>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          Chat Model Selection
        </label>
        <select
          name="MoonshotAiModelPref"
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
        name="MoonshotAiModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
      >
        {(customModels as any).map((model) => (
          <option
            key={model.id}
            value={model.id}
            selected={settings?.MoonshotAiModelPref === model.id}
          >
            {model.id}
          </option>
        ))}
      </select>
    </div>
  );
}
