// SPDX-License-Identifier: MIT
import React, { useEffect, useState } from "react";
import Toggle from "@/components/lib/Toggle";
import { Image } from "@phosphor-icons/react";
import useSystemSettings from "@/hooks/useSystemSettings";

const IMAGE_MODELS = [
  "dall-e-3",
  "dall-e-2",
  "stable-diffusion-xl-1024-v1-0",
  "stable-image-ultra",
  "black-forest-labs/flux.1-schnell",
  "black-forest-labs/flux-pro",
];

export default function ImageGenerationSkillPanel({
  title,
  skill,
  toggleSkill,
  enabled = false,
  disabled = false,
  image,
  icon,
  settings: propSettings,
}) {
  const { settings: fetchedSettings } = useSystemSettings();
  const settings = propSettings || fetchedSettings;

  const basePath =
    settings?.image_generation_base_path ||
    settings?.ImageGenerationBasePath ||
    "";
  const currentModel =
    settings?.image_generation_model ||
    settings?.ImageGenerationModel ||
    "";

  return (
    <div className="p-2">
      <div className="flex flex-col gap-y-[18px] max-w-[500px]">
        <div className="flex w-full justify-between items-center">
          <div className="flex items-center gap-x-2">
            {icon &&
              React.createElement(icon, {
                size: 24,
                color: "var(--theme-text-primary)",
                weight: "bold",
              })}
            <label className="text-theme-text-primary text-md font-bold">
              {title}
            </label>
          </div>
          <Toggle
            size="lg"
            enabled={enabled}
            disabled={disabled}
            onChange={() => toggleSkill(skill)}
          />
        </div>

        {image && <img src={image} alt={title} className="w-full rounded-md" />}

        <p className="text-theme-text-secondary text-opacity-60 text-xs font-medium">
          Generate images using any OpenAI-compatible image generation API.
          Configure the endpoint, API key, and model below.
        </p>

        {enabled && (
          <div className="flex flex-col gap-y-4 mt-2">
            <div className="flex flex-col gap-y-1.5">
              <label className="text-theme-text-primary text-sm font-medium">
                Base URL *
              </label>
              <input
                key={basePath || "empty"}
                name="system::image_generation_base_path"
                type="url"
                defaultValue={basePath}
                placeholder="https://api.openai.com"
                className="bg-zinc-900 light:bg-white text-white light:text-zinc-900 border border-zinc-700 light:border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <p className="text-theme-text-secondary text-xs">
                Base URL for the OpenAI-compatible API (e.g.,{" "}
                <code className="bg-zinc-800 px-1 rounded">https://api.openai.com</code>
                )
              </p>
            </div>

            <div className="flex flex-col gap-y-1.5">
              <label className="text-theme-text-primary text-sm font-medium">
                API Key
              </label>
              <input
                name="system::image_generation_api_key"
                type="password"
                placeholder="sk-..."
                autoComplete="new-password"
                className="bg-zinc-900 light:bg-white text-white light:text-zinc-900 border border-zinc-700 light:border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <p className="text-theme-text-secondary text-xs">
                Leave empty to keep the existing key. The stored key is never shown in the browser.
              </p>
            </div>

            <div className="flex flex-col gap-y-1.5">
              <label className="text-theme-text-primary text-sm font-medium">
                Model
              </label>
              <input
                key={currentModel || "empty"}
                name="system::image_generation_model"
                type="text"
                defaultValue={currentModel}
                list="image-models"
                placeholder="dall-e-3"
                className="bg-zinc-900 light:bg-white text-white light:text-zinc-900 border border-zinc-700 light:border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <datalist id="image-models">
                {IMAGE_MODELS.map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
              <p className="text-theme-text-secondary text-xs">
                Model name for image generation. Common models are shown as suggestions.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
