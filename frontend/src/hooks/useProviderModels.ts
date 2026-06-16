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
  lmstudio: [],
  localai: [],
  ollama: [],
  fireworksai: [],
  "nvidia-nim": [
    "nvidia/nemotron-3-ultra-550b-a55b",
    "nvidia/nemotron-3-super-120b-a12b",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    "nvidia/nemotron-3-nano-30b-a3b",
    "nvidia/llama-3.1-nemotron-70b-instruct",
    "nvidia/llama-3.1-nemotron-nano-8b-v1",
    "nvidia/llama-3.1-nemotron-ultra-253b-v1",
    "nvidia/llama-3.3-nemotron-super-49b-v1.5",
    "nvidia/llama-3.3-nemotron-super-49b-v1",
    "nvidia/nemotron-nano-12b-v2-vl",
    "nvidia/llama-3.2-90b-vision-instruct",
    "meta/llama-3.1-70b-instruct",
    "meta/llama-3.1-8b-instruct",
    "meta/llama-3.3-70b-instruct",
    "meta/llama-4-maverick-17b-128e-instruct",
    "microsoft/phi-4-multimodal-instruct",
    "mistralai/mistral-large-2-instruct",
    "qwen/qwen3-coder-480b-a35b-instruct",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
  ],
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
  // customModels is either a flat array (most providers) or a Record grouped
  // by organisation (GROUPED_PROVIDERS). Consumers that need .length must
  // guard with Array.isArray(). Typed as any[] here so callers don't need an
  // extra cast for the common flat-array case.
  customModels: any[];
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
    // 20s client-side timeout so the model dropdown never hangs indefinitely
    // on "waiting for models" if the backend is slow to respond.
    () => System.customModels(provider, apiKey, basePath, 20000),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      shouldRetryOnError: false,
    },
  );

  const models = data?.models ?? [];
  const hasDefaults =
    provider && PROVIDER_DEFAULT_MODELS.hasOwnProperty(provider);
  const isGrouped = provider && GROUPED_PROVIDERS.includes(provider);

  return {
    defaultModels:
      hasDefaults && !isGrouped
        ? (PROVIDER_DEFAULT_MODELS[provider!] ?? [])
        : [],
    customModels: isGrouped ? groupModels(models) : models,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}

export { GROUPED_PROVIDERS, PROVIDER_DEFAULT_MODELS };
