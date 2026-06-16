// SPDX-License-Identifier: MIT
/**
 * Central registry of local/self-hosted LLM providers and their API-key
 * fallback behavior (issues #112/#116). Single source of truth for which
 * env var each provider reads and which placeholder it falls back to —
 * keep in sync with server/utils/agents/aibitat/providers/*.js and
 * the matching cases in ai-provider.js.
 */
const LOCAL_PROVIDERS = [
  {
    provider: "koboldcpp",
    name: "KoboldCPP",
    envKey: "KOBOLD_CPP_API_KEY",
    basePathKey: "KOBOLD_CPP_BASE_PATH",
    placeholder: "kobold-cpp",
  },
  {
    provider: "nvidia-nim",
    name: "NVIDIA NIM",
    envKey: "NVIDIA_NIM_LLM_API_KEY",
    basePathKey: "NVIDIA_NIM_LLM_BASE_PATH",
    placeholder: "nvidia-nim",
  },
  {
    provider: "docker-model-runner",
    name: "Docker Model Runner",
    envKey: "DOCKER_MODEL_RUNNER_API_KEY",
    basePathKey: "DOCKER_MODEL_RUNNER_BASE_PATH",
    placeholder: "docker-model-runner",
  },
];

/**
 * Whether an env value counts as a real, user-provided key.
 * @param {string|undefined} value
 * @returns {boolean}
 */
function hasRealKey(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Compute the key/fallback status for every registered local provider.
 * Never returns key material — only booleans and metadata, so the
 * response is safe to ship to the frontend.
 * @returns {Array<{provider: string, name: string, envKey: string,
 *           configured: boolean, keySet: boolean, fallbackActive: boolean}>}
 */
function getProviderKeyStatuses() {
  return LOCAL_PROVIDERS.map(({ provider, name, envKey, basePathKey }) => {
    const configured = hasRealKey(process.env[basePathKey]);
    const keySet = hasRealKey(process.env[envKey]);
    return {
      provider,
      name,
      envKey,
      configured,
      keySet,
      fallbackActive: configured && !keySet,
    };
  });
}

module.exports = { LOCAL_PROVIDERS, getProviderKeyStatuses, hasRealKey };
