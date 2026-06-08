// SPDX-License-Identifier: MIT
import useProviderModels, {
  GROUPED_PROVIDERS,
  PROVIDER_DEFAULT_MODELS,
  PROVIDER_MODELS_KEY,
} from "@/hooks/useProviderModels";

export {
  GROUPED_PROVIDERS as DISABLED_PROVIDERS,
  PROVIDER_DEFAULT_MODELS,
  PROVIDER_MODELS_KEY,
};

export default function useGetProviderModels(provider: string | null = null) {
  const { defaultModels, customModels, isLoading, error, refresh, mutate } =
    useProviderModels(provider);

  return {
    defaultModels:
      provider && PROVIDER_DEFAULT_MODELS.hasOwnProperty(provider)
        ? PROVIDER_DEFAULT_MODELS[provider] ?? []
        : [],
    customModels,
    loading: isLoading,
    error,
    refresh,
    mutate,
  };
}
