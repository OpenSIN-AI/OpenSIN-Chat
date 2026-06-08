// SPDX-License-Identifier: MIT
import useSWR from "swr";
import System from "@/models/system";

export const PROVIDER_MODELS_KEY = "system/custom-models";

function groupModels(models: any[]) {
  return models.reduce((acc: Record<string, any[]>, model: any) => {
    acc[model.organization] = acc[model.organization] || [];
    acc[model.organization].push(model);
    return acc;
  }, {});
}

const GROUPED_PROVIDERS = [
  "togetherai",
  "fireworksai",
  "openai",
  "novita",
  "openrouter",
  "ppio",
  "docker-model-runner",
  "sambanova",
];

const PROVIDER_DEFAULT_MODELS: Record<string, string[]> = {
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

interface ProviderModelsResult {
  defaultModels: string[];
  customModels: any[] | Record<string, any[]>;
  isLoading: boolean;
  error: any;
  refresh: () => Promise<any>;
  mutate: any;
}

export default function useProviderModels(
  provider: string | null | undefined,
  apiKey: string | null | undefined = null,
  basePath: string | null | undefined = null,
): ProviderModelsResult {
  const { data, error, isLoading, mutate } = useSWR(
    provider ? [PROVIDER_MODELS_KEY, provider, apiKey, basePath] : null,
    () => System.customModels(provider, apiKey, basePath),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  );

  const models = data?.models ?? [];
  const hasDefaults =
    provider && PROVIDER_DEFAULT_MODELS.hasOwnProperty(provider);
  const isGrouped = provider && GROUPED_PROVIDERS.includes(provider);

  return {
    defaultModels: hasDefaults && !isGrouped
      ? PROVIDER_DEFAULT_MODELS[provider!] ?? []
      : [],
    customModels: isGrouped ? groupModels(models) : models,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}

export { GROUPED_PROVIDERS, PROVIDER_DEFAULT_MODELS };
