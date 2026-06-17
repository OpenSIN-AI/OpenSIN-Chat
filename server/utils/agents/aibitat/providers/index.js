// SPDX-License-Identifier: MIT
const OpenAIProvider = require("./openai.js");
const AnthropicProvider = require("./anthropic.js");
const LMStudioProvider = require("./lmstudio.js");
const OllamaProvider = require("./ollama.js");
const GroqProvider = require("./groq.js");
const LocalAIProvider = require("./localai.js");
const MistralProvider = require("./mistral.js");
const GenericOpenAiProvider = require("./genericOpenAi.js");
const FireworksAIProvider = require("./fireworksai.js");
const LiteLLMProvider = require("./litellm.js");
const XAIProvider = require("./xai.js");
const NvidiaNimProvider = require("./nvidiaNim.js");
const GeminiProvider = require("./gemini.js");
const DockerModelRunnerProvider = require("./dockerModelRunner.js");
const OpencodeZenProvider = require("./opencodeZen.js");

module.exports = {
  OpenAIProvider,
  AnthropicProvider,
  LMStudioProvider,
  OllamaProvider,
  GroqProvider,
  LocalAIProvider,
  MistralProvider,
  GenericOpenAiProvider,
  FireworksAIProvider,
  LiteLLMProvider,
  XAIProvider,
  NvidiaNimProvider,
  GeminiProvider,
  DockerModelRunnerProvider,
  OpencodeZenProvider,
};
