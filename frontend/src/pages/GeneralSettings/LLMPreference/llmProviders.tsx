// SPDX-License-Identifier: MIT
import OpenSINChatIcon from "@/media/logo/openafd-icon.svg";
import OpenAiLogo from "@/media/llmprovider/openai.png";
import GenericOpenAiLogo from "@/media/llmprovider/generic-openai.png";
import AnthropicLogo from "@/media/llmprovider/anthropic.png";
import GeminiLogo from "@/media/llmprovider/gemini.png";
import OllamaLogo from "@/media/llmprovider/ollama.png";
import NovitaLogo from "@/media/llmprovider/novita.png";
import LMStudioLogo from "@/media/llmprovider/lmstudio.png";
import LocalAiLogo from "@/media/llmprovider/localai.png";
import FireworksAILogo from "@/media/llmprovider/fireworksai.jpeg";
import MistralLogo from "@/media/llmprovider/mistral.jpeg";
import HuggingFaceLogo from "@/media/llmprovider/huggingface.png";
import PerplexityLogo from "@/media/llmprovider/perplexity.png";
import OpenRouterLogo from "@/media/llmprovider/openrouter.jpeg";
import GroqLogo from "@/media/llmprovider/groq.png";
import TextGenWebUILogo from "@/media/llmprovider/text-generation-webui.png";
import CohereLogo from "@/media/llmprovider/cohere.png";
import LiteLLMLogo from "@/media/llmprovider/litellm.png";
import AWSBedrockLogo from "@/media/llmprovider/bedrock.png";
import DeepSeekLogo from "@/media/llmprovider/deepseek.png";
import APIPieLogo from "@/media/llmprovider/apipie.png";
import XAILogo from "@/media/llmprovider/xai.png";
import ZAiLogo from "@/media/llmprovider/zai.png";
import NvidiaNimLogo from "@/media/llmprovider/nvidia-nim.png";
import OpencodeZenLogo from "@/media/llmprovider/opencode-zen.png";
import PPIOLogo from "@/media/llmprovider/ppio.png";
import DellProAiStudioLogo from "@/media/llmprovider/dpais.png";
import MoonshotAiLogo from "@/media/llmprovider/moonshotai.png";
import CometApiLogo from "@/media/llmprovider/cometapi.png";
import FoundryLogo from "@/media/llmprovider/foundry-local.png";
import GiteeAILogo from "@/media/llmprovider/giteeai.png";
import DockerModelRunnerLogo from "@/media/llmprovider/docker-model-runner.png";
import PrivateModeLogo from "@/media/llmprovider/privatemode.png";
import SambaNovaLogo from "@/media/llmprovider/sambanova.png";
import LemonadeLogo from "@/media/llmprovider/lemonade.png";
import MinimaxLogo from "@/media/llmprovider/minimax.png";
import CerebrasLogo from "@/media/llmprovider/cerebras.png";

// Component imports
import ModelRouterOptions from "@/components/LLMSelection/ModelRouterOptions";
import OpenAiOptions from "@/components/LLMSelection/OpenAiOptions";
import GenericOpenAiOptions from "@/components/LLMSelection/GenericOpenAiOptions";
import AnthropicAiOptions from "@/components/LLMSelection/AnthropicAiOptions";
import LMStudioOptions from "@/components/LLMSelection/LMStudioOptions";
import LocalAiOptions from "@/components/LLMSelection/LocalAiOptions";
import GeminiLLMOptions from "@/components/LLMSelection/GeminiLLMOptions";
import OllamaLLMOptions from "@/components/LLMSelection/OllamaLLMOptions";
import NovitaLLMOptions from "@/components/LLMSelection/NovitaLLMOptions";
import CometApiLLMOptions from "@/components/LLMSelection/CometApiLLMOptions";
import FireworksAiOptions from "@/components/LLMSelection/FireworksAiOptions";
import MistralOptions from "@/components/LLMSelection/MistralOptions";
import HuggingFaceOptions from "@/components/LLMSelection/HuggingFaceOptions";
import PerplexityOptions from "@/components/LLMSelection/PerplexityOptions";
import OpenRouterOptions from "@/components/LLMSelection/OpenRouterOptions";
import GroqAiOptions from "@/components/LLMSelection/GroqAiOptions";
import CohereAiOptions from "@/components/LLMSelection/CohereAiOptions";
import TextGenWebUIOptions from "@/components/LLMSelection/TextGenWebUIOptions";
import LiteLLMOptions from "@/components/LLMSelection/LiteLLMOptions";
import AWSBedrockLLMOptions from "@/components/LLMSelection/AwsBedrockLLMOptions";
import DeepSeekOptions from "@/components/LLMSelection/DeepSeekOptions";
import ApiPieLLMOptions from "@/components/LLMSelection/ApiPieOptions";
import XAILLMOptions from "@/components/LLMSelection/XAiLLMOptions";
import ZAiLLMOptions from "@/components/LLMSelection/ZAiLLMOptions";
import NvidiaNimOptions from "@/components/LLMSelection/NvidiaNimOptions";
import OpencodeZenOptions from "@/components/LLMSelection/OpencodeZenOptions";
import PPIOLLMOptions from "@/components/LLMSelection/PPIOLLMOptions";
import DellProAiStudioOptions from "@/components/LLMSelection/DPAISOptions";
import MoonshotAiOptions from "@/components/LLMSelection/MoonshotAiOptions";
import FoundryOptions from "@/components/LLMSelection/FoundryOptions";
import GiteeAIOptions from "@/components/LLMSelection/GiteeAIOptions";
import DockerModelRunnerOptions from "@/components/LLMSelection/DockerModelRunnerOptions";
import PrivateModeOptions from "@/components/LLMSelection/PrivateModeOptions";
import SambaNovaOptions from "@/components/LLMSelection/SambaNovaOptions";
import LemonadeOptions from "@/components/LLMSelection/LemonadeOptions";
import MinimaxOptions from "@/components/LLMSelection/MinimaxOptions";
import CerebrasLLMOptions from "@/components/LLMSelection/CerebrasLLMOptions";

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
  value: "openafd-router",
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
    name: "HuggingFace",
    value: "huggingface",
    logo: HuggingFaceLogo,
    options: (settings: any) => <HuggingFaceOptions settings={settings} />,
    description:
      "Access 150,000+ open-source LLMs and the world's AI community",
    requiredConfig: [
      "HuggingFaceLLMEndpoint",
      "HuggingFaceLLMAccessToken",
      "HuggingFaceLLMTokenLimit",
    ],
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
    name: "Dell Pro AI Studio",
    value: "dpais",
    logo: DellProAiStudioLogo,
    options: (settings: any) => <DellProAiStudioOptions settings={settings} />,
    description:
      "Run powerful LLMs quickly on NPU powered by Dell Pro AI Studio.",
    requiredConfig: [
      "DellProAiStudioBasePath",
      "DellProAiStudioModelPref",
      "DellProAiStudioTokenLimit",
    ],
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
    name: "Docker Model Runner",
    value: "docker-model-runner",
    logo: DockerModelRunnerLogo,
    options: (settings: any) => (
      <DockerModelRunnerOptions settings={settings} />
    ),
    description: "Run LLMs using Docker Model Runner.",
    requiredConfig: [
      "DockerModelRunnerBasePath",
      "DockerModelRunnerModelPref",
      "DockerModelRunnerModelTokenLimit",
    ],
  },
  {
    name: "Lemonade",
    value: "lemonade",
    logo: LemonadeLogo,
    options: (settings: any) => <LemonadeOptions settings={settings} />,
    description:
      "Run local LLMs, ASR, TTS, and more in a single unified AI runtime.",
    requiredConfig: ["LemonadeLLMBasePath"],
  },
  {
    name: "SambaNova",
    value: "sambanova",
    logo: SambaNovaLogo,
    options: (settings: any) => <SambaNovaOptions settings={settings} />,
    description: "Run open source models from SambaNova.",
    requiredConfig: ["SambaNovaLLMApiKey"],
  },
  {
    name: "Local AI",
    value: "localai",
    logo: LocalAiLogo,
    options: (settings: any) => <LocalAiOptions settings={settings} />,
    description: "Run LLMs locally on your own machine.",
    requiredConfig: ["LocalAiApiKey", "LocalAiBasePath", "LocalAiTokenLimit"],
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
    name: "Mistral",
    value: "mistral",
    logo: MistralLogo,
    options: (settings: any) => <MistralOptions settings={settings} />,
    description: "Run open source models from Mistral AI.",
    requiredConfig: ["MistralApiKey"],
  },
  {
    name: "Perplexity AI",
    value: "perplexity",
    logo: PerplexityLogo,
    options: (settings: any) => <PerplexityOptions settings={settings} />,
    description:
      "Run powerful and internet-connected models hosted by Perplexity AI.",
    requiredConfig: ["PerplexityApiKey"],
  },
  {
    name: "OpenRouter",
    value: "openrouter",
    logo: OpenRouterLogo,
    options: (settings: any) => <OpenRouterOptions settings={settings} />,
    description: "A unified interface for LLMs.",
    requiredConfig: ["OpenRouterApiKey"],
  },
  {
    name: "Groq",
    value: "groq",
    logo: GroqLogo,
    options: (settings: any) => <GroqAiOptions settings={settings} />,
    description:
      "The fastest LLM inferencing available for real-time AI applications.",
    requiredConfig: ["GroqApiKey"],
  },
  {
    name: "Oobabooga Web UI",
    value: "textgenwebui",
    logo: TextGenWebUILogo,
    options: (settings: any) => <TextGenWebUIOptions settings={settings} />,
    description: "Run local LLMs using Oobabooga's Text Generation Web UI.",
    requiredConfig: ["TextGenWebUIBasePath", "TextGenWebUITokenLimit"],
  },
  {
    name: "Cohere",
    value: "cohere",
    logo: CohereLogo,
    options: (settings: any) => <CohereAiOptions settings={settings} />,
    description: "Run Cohere's powerful Command models.",
    requiredConfig: ["CohereApiKey"],
  },
  {
    name: "LiteLLM",
    value: "litellm",
    logo: LiteLLMLogo,
    options: (settings: any) => <LiteLLMOptions settings={settings} />,
    description: "Run LiteLLM's OpenAI compatible proxy for various LLMs.",
    requiredConfig: ["LiteLLMBasePath"],
  },
  {
    name: "DeepSeek",
    value: "deepseek",
    logo: DeepSeekLogo,
    options: (settings: any) => <DeepSeekOptions settings={settings} />,
    description: "Run DeepSeek's powerful LLMs.",
    requiredConfig: ["DeepSeekApiKey"],
  },
  {
    name: "PPIO",
    value: "ppio",
    logo: PPIOLogo,
    options: (settings: any) => <PPIOLLMOptions settings={settings} />,
    description:
      "Run stable and cost-efficient open-source LLM APIs, such as DeepSeek, Llama, Qwen etc.",
    requiredConfig: ["PPIOApiKey"],
  },
  {
    name: "AWS Bedrock",
    value: "bedrock",
    logo: AWSBedrockLogo,
    options: (settings: any) => <AWSBedrockLLMOptions settings={settings} />,
    description: "Run powerful foundation models privately with AWS Bedrock.",
    requiredConfig: [
      "AwsBedrockLLMAccessKeyId",
      "AwsBedrockLLMAccessKey",
      "AwsBedrockLLMRegion",
      "AwsBedrockLLMModel",
    ],
  },
  {
    name: "APIpie",
    value: "apipie",
    logo: APIPieLogo,
    options: (settings: any) => <ApiPieLLMOptions settings={settings} />,
    description: "A unified API of AI services from leading providers",
    requiredConfig: ["ApipieLLMApiKey", "ApipieLLMModelPref"],
  },
  {
    name: "Moonshot AI",
    value: "moonshotai",
    logo: MoonshotAiLogo,
    options: (settings: any) => <MoonshotAiOptions settings={settings} />,
    description: "Run Moonshot AI's powerful LLMs.",
    requiredConfig: ["MoonshotAiApiKey"],
  },
  {
    name: "Privatemode",
    value: "privatemode",
    logo: PrivateModeLogo,
    options: (settings: any) => <PrivateModeOptions settings={settings} />,
    description: "Run LLMs with end-to-end encryption.",
    requiredConfig: ["PrivateModeBasePath"],
  },
  {
    name: "Novita AI",
    value: "novita",
    logo: NovitaLogo,
    options: (settings: any) => <NovitaLLMOptions settings={settings} />,
    description:
      "Reliable, Scalable, and Cost-Effective for LLMs from Novita AI",
    requiredConfig: ["NovitaLLMApiKey"],
  },
  {
    name: "CometAPI",
    value: "cometapi",
    logo: CometApiLogo,
    options: (settings: any) => <CometApiLLMOptions settings={settings} />,
    description: "500+ AI Models all in one API.",
    requiredConfig: ["CometApiLLMApiKey"],
  },
  {
    name: "Microsoft Foundry Local",
    value: "foundry",
    logo: FoundryLogo,
    options: (settings: any) => <FoundryOptions settings={settings} />,
    description: "Run Microsoft's Foundry models locally.",
    requiredConfig: [
      "FoundryBasePath",
      "FoundryModelPref",
      "FoundryModelTokenLimit",
    ],
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
    name: "Z.AI",
    value: "zai",
    logo: ZAiLogo,
    options: (settings: any) => <ZAiLLMOptions settings={settings} />,
    description: "Run Z.AI's powerful GLM models.",
    requiredConfig: ["ZAiApiKey"],
  },
  {
    name: "GiteeAI",
    value: "giteeai",
    logo: GiteeAILogo,
    options: (settings: any) => <GiteeAIOptions settings={settings} />,
    description: "Run GiteeAI's powerful LLMs.",
    requiredConfig: ["GiteeAIApiKey"],
  },
  {
    name: "Minimax",
    value: "minimax",
    logo: MinimaxLogo,
    options: (settings: any) => <MinimaxOptions settings={settings} />,
    description: "Run Minimax's powerful M2 LLMs.",
    requiredConfig: ["MinimaxApiKey"],
  },
  {
    name: "Cerebras",
    value: "cerebras",
    logo: CerebrasLogo,
    options: (settings: any) => <CerebrasLLMOptions settings={settings} />,
    description: "Run models at instant speed on Cerebras inference.",
    requiredConfig: ["CerebrasApiKey"],
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
