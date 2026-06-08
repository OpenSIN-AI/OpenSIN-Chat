// SPDX-License-Identifier: MIT
import React from "react";

export default function NvidiaNimTTSOptions({ settings }: any) {
  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-2">
            API Key
          </label>
          <input
            type="password"
            name="TTSNvidiaNimApiKey"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder="nvapi-..."
            defaultValue={settings?.TTSNvidiaNimApiKey ? "*".repeat(20) : ""}
            autoComplete="off"
            spellCheck={false}
            required={true}
          />
          <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
            Your NVIDIA NIM API key. Get one at{" "}
            <a
              href="https://build.nvidia.com"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              build.nvidia.com
            </a>
            .
          </p>
        </div>
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-2">
            Base URL <span className="text-white text-opacity-40 font-normal">(optional)</span>
          </label>
          <input
            type="url"
            name="TTSNvidiaNimEndpoint"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder="https://integrate.api.nvidia.com/v1"
            defaultValue={settings?.TTSNvidiaNimEndpoint}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
            Override the default NVIDIA NIM API endpoint. Leave blank to use the
            hosted NVIDIA API.
          </p>
        </div>
      </div>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            TTS Model <span className="text-white text-opacity-40 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            name="TTSNvidiaNimModel"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder="ai-magnify/arctic-tts"
            defaultValue={settings?.TTSNvidiaNimModel}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
            The NIM TTS model to use. Defaults to{" "}
            <code className="bg-theme-settings-input-bg rounded px-1">
              ai-magnify/arctic-tts
            </code>
            .
          </p>
        </div>
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            Voice <span className="text-white text-opacity-40 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            name="TTSNvidiaNimVoiceModel"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder="English-US.Female-1"
            defaultValue={settings?.TTSNvidiaNimVoiceModel}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
            The voice identifier to use. Defaults to{" "}
            <code className="bg-theme-settings-input-bg rounded px-1">
              English-US.Female-1
            </code>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
