// SPDX-License-Identifier: MIT
/**
 * Maps provider slugs → all valid system_settings label candidates.
 *
 * Used by getProviderModelPreference() (issue #100) to look up the user's
 * preferred model for a provider in the DB. We try every alias in order
 * so that legacy labels (e.g. snake_case) keep working after migrations.
 *
 * Adding a new provider?
 *   1. Add an entry here with the canonical label and any aliases
 *   2. Mirror the ENV variable in getBaseLLMProviderModel()
 *   3. Add the provider to the orchestrator AgentPlugins list if it
 *      supports tool-calling.
 */

const KEY_MAPPING = {
  openai: ["OpenAiModelPref", "open_ai_model_pref", "OPEN_MODEL_PREF"],
  "opencode-zen": ["opencode_zen_model_pref", "OPENCODE_ZEN_MODEL_PREF"],
  "nvidia-nim": [
    "NvidiaNimLLMModelPref",
    "nvidia_nim_model_pref",
    "NVIDIA_NIM_LLM_MODEL_PREF",
  ],
  anthropic: ["anthropic_model_pref", "ANTHROPIC_MODEL_PREF"],
  gemini: ["gemini_llm_model_pref", "GEMINI_LLM_MODEL_PREF"],
  ollama: ["ollama_model_pref", "OLLAMA_MODEL_PREF"],
  lmstudio: ["lmstudio_model_pref", "LMSTUDIO_MODEL_PREF"],
  "generic-openai": [
    "generic_open_ai_model_pref",
    "GENERIC_OPEN_AI_MODEL_PREF",
  ],
  xai: ["xai_llm_model_pref", "XAI_LLM_MODEL_PREF"],
  fireworksai: ["fireworks_ai_llm_model_pref", "FIREWORKS_AI_LLM_MODEL_PREF"],
  docker_model_runner: [
    "docker_model_runner_llm_model_pref",
    "DOCKER_MODEL_RUNNER_LLM_MODEL_PREF",
  ],
};

/**
 * Returns every label candidate (canonical + aliases) for a given provider.
 * The first match wins in getProviderModelPreference().
 *
 * @param {string} provider
 * @returns {string[]}
 */
function validLabelsForProvider(provider) {
  if (!provider) return [];
  const direct = KEY_MAPPING[provider];
  if (direct) return direct;
  // Try the legacy lookup shape (env-key style) as a final fallback
  return [provider.replace(/-/g, "_") + "_model_pref"];
}

module.exports = {
  KEY_MAPPING,
  validLabelsForProvider,
};
