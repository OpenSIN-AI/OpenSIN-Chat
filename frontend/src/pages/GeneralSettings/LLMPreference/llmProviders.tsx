// SPDX-License-Identifier: MIT
import React from "react";
import OpenSINChatIcon from "@/media/logo/opensin-icon.svg";
import OpenAiLogo from "@/media/llmprovider/openai.png";
import GenericOpenAiLogo from "@/media/llmprovider/generic-openai.png";
import AnthropicLogo from "@/media/llmprovider/anthropic.png";
import GeminiLogo from "@/media/llmprovider/gemini.png";
import OllamaLogo from "@/media/llmprovider/ollama.png";
import LMStudioLogo from "@/media/llmprovider/lmstudio.png";
import FireworksAILogo from "@/media/llmprovider/fireworksai.jpeg";
import XAILogo from "@/media/llmprovider/xai.png";
import NvidiaNimLogo from "@/media/llmprovider/nvidia-nim.png";
import OpencodeZenLogo from "@/media/llmprovider/opencode-zen.png";

// Component imports
import ModelRouterOptions from "@/components/LLMSelection/ModelRouterOptions";
import OpenAiOptions from "@/components/LLMSelection/OpenAiOptions";
import GenericOpenAiOptions from "@/components/LLMSelection/GenericOpenAiOptions";
import AnthropicAiOptions from "@/components/LLMSelection/AnthropicAiOptions";
import LMStudioOptions from "@/components/LLMSelection/LMStudioOptions";
import GeminiLLMOptions from "@/components/LLMSelection/GeminiLLMOptions";
import OllamaLLMOptions from "@/components/LLMSelection/OllamaLLMOptions";
import FireworksAiOptions from "@/components/LLMSelection/FireworksAiOptions";
import XAILLMOptions from "@/components/LLMSelection/XAiLLMOptions";
import NvidiaNimOptions from "@/components/LLMSelection/NvidiaNimOptions";
import OpencodeZenOptions from "@/components/LLMSelection/OpencodeZenOptions";

export interface LLMProvider {
  name: string;
  value: string;
  logo: string;
  options: (settings: any) => React.ReactNode;
  description: string;
  requiredConfig?: string[];
  connectionConfig?: string[];
}

export const MODEL_ROUTER_PROVIDER: LLMProvider = {
  name: "Model Router",
  value: "opensin-router",
  logo: OpenSINChatIcon,
  options: (settings: any) => <ModelRouterOptions settings={settings} />,
  description:
    "Route messages to different LLM providers based on rules you define.",
  requiredConfig: [],
};

export const AVAILABLE_LLM_PROVIDERS: LLMProvider[] = [
  {
    name: "OpenAI",
    value: "openai",
    logo: OpenAiLogo,
    options: (settings: any) => <OpenAiOptions settings={settings} />,
    description: "The standard option for most non-commercial use.",
    requiredConfig: ["OpenAiKey"],
  },
  {
    name: "Anthropic",
    value: "anthropic",
    logo: AnthropicLogo,
    options: (settings: any) => <AnthropicAiOptions settings={settings} />,
    description: "A friendly AI Assistant hosted by Anthropic.",
    requiredConfig: ["AnthropicApiKey"],
  },
  {
    name: "Gemini",
    value: "gemini",
    logo: GeminiLogo,
    options: (settings: any) => <GeminiLLMOptions settings={settings} />,
    description: "Google's largest and most capable AI model",
    requiredConfig: ["GeminiLLMApiKey"],
  },
  {
    name: "NVIDIA NIM",
    value: "nvidia-nim",
    logo: NvidiaNimLogo,
    options: (settings: any) => <NvidiaNimOptions settings={settings} />,
    description:
      "Run full parameter LLMs directly on your NVIDIA RTX GPU using NVIDIA NIM.",
    requiredConfig: ["NvidiaNimLLMBasePath"],
  },
  {
    name: "OpenCode Zen",
    value: "opencode-zen",
    logo: OpencodeZenLogo,
    options: (settings: any) => <OpencodeZenOptions settings={settings} />,
    description:
      "Curated AI models gateway by OpenCode. Free models available (Nemotron, DeepSeek, MiMo).",
    requiredConfig: ["OpencodeZenBasePath"],
  },
  {
    name: "Ollama",
    value: "ollama",
    logo: OllamaLogo,
    options: (settings: any) => <OllamaLLMOptions settings={settings} />,
    description: "Run LLMs locally on your own machine.",
    requiredConfig: ["OllamaLLMBasePath"],
  },
  {
    name: "LM Studio",
    value: "lmstudio",
    logo: LMStudioLogo,
    options: (settings: any) => <LMStudioOptions settings={settings} />,
    description:
      "Discover, download, and run thousands of cutting edge LLMs in a few clicks.",
    requiredConfig: ["LMStudioBasePath"],
  },
  {
    name: "Fireworks AI",
    value: "fireworksai",
    logo: FireworksAILogo,
    options: (settings: any) => <FireworksAiOptions settings={settings} />,
    description:
      "The fastest and most efficient inference engine to build production-ready, compound AI systems.",
    requiredConfig: ["FireworksAiLLMApiKey"],
  },
  {
    name: "xAI",
    value: "xai",
    logo: XAILogo,
    options: (settings: any) => <XAILLMOptions settings={settings} />,
    description: "Run xAI's powerful LLMs like Grok-2 and more.",
    requiredConfig: ["XAIApiKey", "XAIModelPref"],
  },
  {
    name: "Generic OpenAI",
    value: "generic-openai",
    logo: GenericOpenAiLogo,
    options: (settings: any) => <GenericOpenAiOptions settings={settings} />,
    description:
      "Connect to any OpenAi-compatible service via a custom configuration",
    requiredConfig: ["GenericOpenAiBasePath", "GenericOpenAiModelPref"],
    connectionConfig: ["GenericOpenAiBasePath"],
  },
];

export const ALL_LLM_PROVIDERS: LLMProvider[] = [
  MODEL_ROUTER_PROVIDER,
  ...AVAILABLE_LLM_PROVIDERS,
];

export const LLM_PREFERENCE_CHANGED_EVENT = "llm-preference-changed";
