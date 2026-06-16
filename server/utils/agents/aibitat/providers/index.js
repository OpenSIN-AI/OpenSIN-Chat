// SPDX-License-Identifier: MIT
const OpenAIProvider = require("./openai.js");
const AnthropicProvider = require("./anthropic.js");
const LMStudioProvider = require("./lmstudio.js");
const OllamaProvider = require("./ollama.js");
const GroqProvider = require("./groq.js");
const TogetherAIProvider = require("./togetherai.js");
const AzureOpenAiProvider = require("./azure.js");
const KoboldCPPProvider = require("./koboldcpp.js");
const LocalAIProvider = require("./localai.js");
const OpenRouterProvider = require("./openrouter.js");
const MistralProvider = require("./mistral.js");
const GenericOpenAiProvider = require("./genericOpenAi.js");
const TextWebGenUiProvider = require("./textgenwebui.js");
const FireworksAIProvider = require("./fireworksai.js");
const DeepSeekProvider = require("./deepseek.js");
const LiteLLMProvider = require("./litellm.js");
const XAIProvider = require("./xai.js");
const ZAIProvider = require("./zai.js");
const NvidiaNimProvider = require("./nvidiaNim.js");
const GeminiProvider = require("./gemini.js");
const DockerModelRunnerProvider = require("./dockerModelRunner.js");
const MinimaxProvider = require("./minimax.js");
const OpencodeZenProvider = require("./opencodeZen.js");

module.exports = {
  OpenAIProvider,
  AnthropicProvider,
  LMStudioProvider,
  OllamaProvider,
  GroqProvider,
  TogetherAIProvider,
  AzureOpenAiProvider,
  KoboldCPPProvider,
  LocalAIProvider,
  OpenRouterProvider,
  MistralProvider,
  GenericOpenAiProvider,
  DeepSeekProvider,
  TextWebGenUiProvider,
  FireworksAIProvider,
  LiteLLMProvider,
  XAIProvider,
  ZAIProvider,
  NvidiaNimProvider,
  GeminiProvider,
  DockerModelRunnerProvider,
  MinimaxProvider,
  OpencodeZenProvider,
};
