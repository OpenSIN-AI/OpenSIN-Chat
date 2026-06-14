import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Toggle from "@/components/lib/Toggle";
import useSystemSettings from "@/hooks/useSystemSettings";

const IMAGE_MODELS = [
  "dall-e-3",
  "dall-e-2",
  "gpt-image-1",
  "stable-image-ultra",
  "black-forest-labs/flux.1-schnell",
  "black-forest-labs/flux-pro",
];

const INPUT_CLASSES =
  "bg-zinc-900 light:bg-white text-white light:text-zinc-900 border border-zinc-700 light:border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";

function isValidBaseUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return /^https?:$/i.test(url.protocol);
  } catch {
    return false;
  }
}

export default function ImageGenerationSkillPanel({
  skill,
  toggleSkill,
  enabled = false,
  disabled = false,
  image,
  icon,
  settings: propSettings,
}) {
  const { t } = useTranslation();
  const { settings: fetchedSettings } = useSystemSettings();
  const settings = propSettings || fetchedSettings;
  const [clearKey, setClearKey] = useState(false);
  const [urlError, setUrlError] = useState(false);

  const basePath =
    settings?.image_generation_base_path ||
    settings?.ImageGenerationBasePath ||
    "";
  const currentModel =
    settings?.image_generation_model || settings?.ImageGenerationModel || "";
  const title = t("agent.skill.image_generation.title");

  return (
    <div className="p-2">
      <div className="flex flex-col gap-y-[18px] max-w-[500px]">
        <div className="flex w-full justify-between items-center">
          <div className="flex items-center gap-x-2">
            {icon &&
              React.createElement(icon, {
                size: 24,
                color: "var(--theme-text-primary)", // eslint-disable-line i18next/no-literal-string
                weight: "bold", // eslint-disable-line i18next/no-literal-string
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
          {t("agent.skill.image_generation.description")}
        </p>

        {enabled && (
          <div className="flex flex-col gap-y-4 mt-2">
            <div className="flex flex-col gap-y-1.5">
              <label className="text-theme-text-primary text-sm font-medium">
                {t("agent.skill.image_generation.base_url.label")}
              </label>
              <input
                key={basePath || "empty"}
                name="system::image_generation_base_path"
                type="url"
                defaultValue={basePath}
                placeholder="https://api.openai.com"
                aria-invalid={urlError}
                onBlur={(e) => setUrlError(!isValidBaseUrl(e.target.value))}
                onChange={(e) => {
                  if (urlError && isValidBaseUrl(e.target.value))
                    setUrlError(false);
                }}
                className={`${INPUT_CLASSES} ${urlError ? "border-red-500 focus:ring-red-500" : ""}`}
              />
              {urlError ? (
                <p className="text-red-400 text-xs" role="alert">
                  {t("agent.skill.image_generation.base_url.invalid")}
                </p>
              ) : (
                <p className="text-theme-text-secondary text-xs">
                  {t("agent.skill.image_generation.base_url.help")}{" "}
                  <code className="bg-zinc-800 px-1 rounded">
                    https://api.openai.com
                  </code>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-y-1.5">
              <label className="text-theme-text-primary text-sm font-medium">
                {t("agent.skill.image_generation.api_key.label")}
              </label>
              {clearKey ? (
                <input
                  type="hidden"
                  name="system::image_generation_api_key"
                  value="-CLEAR-"
                />
              ) : (
                <input
                  name="system::image_generation_api_key"
                  type="password"
                  placeholder="sk-..."
                  autoComplete="new-password"
                  className={INPUT_CLASSES}
                />
              )}
              <p className="text-theme-text-secondary text-xs">
                {t("agent.skill.image_generation.api_key.help")}
              </p>
              <label className="flex items-center gap-x-2 text-theme-text-secondary text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={clearKey}
                  onChange={(e) => setClearKey(e.target.checked)}
                  className="rounded border-zinc-600"
                />
                {t("agent.skill.image_generation.api_key.clear")}
              </label>
            </div>

            <div className="flex flex-col gap-y-1.5">
              <label className="text-theme-text-primary text-sm font-medium">
                {t("agent.skill.image_generation.model.label")}
              </label>
              <input
                key={currentModel || "empty"}
                name="system::image_generation_model"
                type="text"
                defaultValue={currentModel}
                list="image-models"
                placeholder="dall-e-3"
                className={INPUT_CLASSES}
              />
              <datalist id="image-models">
                {IMAGE_MODELS.map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
              <p className="text-theme-text-secondary text-xs">
                {t("agent.skill.image_generation.model.help")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
