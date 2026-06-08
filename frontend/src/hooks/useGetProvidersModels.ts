// SPDX-License-Identifier: MIT
import System from "@/models/system";
import { useEffect, useState } from "react";

// Providers which cannot use this feature for workspace<>model selection
export const DISABLED_PROVIDERS = ["azure", "textgenwebui", "bedrock"];
const PROVIDER_DEFAULT_MODELS = {
  openai: [],
  gemini: [],
  anthropic: [],
  azure: [],
  lmstudio: [],
  localai: [],
  ollama: [],
  togetherai: [],
  fireworksai: [],
  "nvidia-nim": [],
  "opencode-zen": [
    "nemotron-3-ultra-free",
    "deepseek-v4-flash-free",
    "mimo-v2.5-free",
    "big-pickle",
    "gpt-5.5",
    "claude-sonnet-4.6",
    "gemini-3.5-flash",
    "qwen3.7-max",
    "deepseek-v4-flash",
    "kimi-k2.6",
  ],
  groq: [],
  cohere: [
    "command-r",
    "command-r-plus",
    "command",
    "command-light",
    "command-nightly",
    "command-light-nightly",
  ],
  textgenwebui: [],
  "generic-openai": [],
  bedrock: [],
  xai: ["grok-beta"],
};

// For providers with large model lists (e.g. togetherAi) - we subgroup the options
// by their creator organization (eg: Meta, Mistral, etc)
// which makes selection easier to read.
function groupModels(models) {
  return models.reduce((acc, model) => {
    acc[model.organization] = acc[model.organization] || [];
    acc[model.organization].push(model);
    return acc;
  }, {});
}

const groupedProviders = [
  "togetherai",
  "fireworksai",
  "openai",
  "novita",
  "openrouter",
  "ppio",
  "docker-model-runner",
  "sambanova",
];
export default function useGetProviderModels(provider = null) {
  const [defaultModels, setDefaultModels] = useState([] as any);
  const [customModels, setCustomModels] = useState([] as any);
  const [loading, setLoading] = useState(true as any);

  useEffect(() => {
    async function fetchProviderModels() {
      if (!provider) return;
      setLoading(true);
      const { models = [] } = await System.customModels(provider);
      if (
        PROVIDER_DEFAULT_MODELS.hasOwnProperty(provider) &&
        !groupedProviders.includes(provider)
      ) {
        setDefaultModels(PROVIDER_DEFAULT_MODELS[provider]);
      } else {
        setDefaultModels([]);
      }

      groupedProviders.includes(provider)
        ? setCustomModels(groupModels(models))
        : setCustomModels(models);
      setLoading(false);
    }
    fetchProviderModels();
  }, [provider]);

  return { defaultModels, customModels, loading };
}
