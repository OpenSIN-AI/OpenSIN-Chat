// SPDX-License-Identifier: MIT
import OpenSINChatIcon from "@/media/logo/opensin-icon.svg";
import OpenAiLogo from "@/media/llmprovider/openai.png";
import GenericOpenAiLogo from "@/media/llmprovider/generic-openai.png";
import AnthropicLogo from "@/media/llmprovider/anthropic.png";
import GeminiLogo from "@/media/llmprovider/gemini.png";
import OllamaLogo from "@/media/llmprovider/ollama.png";
import FireworksAILogo from "@/media/llmprovider/fireworksai.jpeg";
import NvidiaNimLogo from "@/media/llmprovider/nvidia-nim.png";
import OpencodeZenLogo from "@/media/llmprovider/opencode-zen.png";
import LMStudioLogo from "@/media/llmprovider/lmstudio.png";
import LocalAiLogo from "@/media/llmprovider/localai.png";
import MistralLogo from "@/media/llmprovider/mistral.jpeg";
import HuggingFaceLogo from "@/media/llmprovider/huggingface.png";
import GroqLogo from "@/media/llmprovider/groq.png";
import LiteLLMLogo from "@/media/llmprovider/litellm.png";
import XAILogo from "@/media/llmprovider/xai.png";
import LanceDbLogo from "@/media/vectordbs/lancedb.png";
import ChromaLogo from "@/media/vectordbs/chroma.png";
import VoyageAiLogo from "@/media/embeddingprovider/voyageai.png";
import PGVectorLogo from "@/media/vectordbs/pgvector.png";
import DockerModelRunnerLogo from "@/media/llmprovider/docker-model-runner.png";

const LLM_PROVIDER_PRIVACY_MAP = {
  openai: {
    name: "OpenAI",
    policyUrl: "https://openai.com/policies/privacy-policy/",
    logo: OpenAiLogo,
  },
  anthropic: {
    name: "Anthropic",
    policyUrl: "https://www.anthropic.com/privacy",
    logo: AnthropicLogo,
  },
  gemini: {
    name: "Google Gemini",
    policyUrl: "https://policies.google.com/privacy",
    logo: GeminiLogo,
  },
  "nvidia-nim": {
    name: "NVIDIA NIM",
    description: [
      "Your model and chats are only accessible on the machine running the NVIDIA NIM.",
    ],
    logo: NvidiaNimLogo,
  },
  "opencode-zen": {
    name: "OpenCode Zen",
    description: [
      "OpenCode Zen is a curated AI gateway. Free models may log data for improvement. Paid models follow zero-retention policy.",
    ],
    policyUrl: "https://opencode.ai/docs/zen/",
    logo: OpencodeZenLogo,
  },
  lmstudio: {
    name: "LMStudio",
    description: [
      "Your model and chats are only accessible on the server running LMStudio.",
    ],
    logo: LMStudioLogo,
  },
  localai: {
    name: "LocalAI",
    description: [
      "Your model and chats are only accessible on the server running LocalAI.",
    ],
    logo: LocalAiLogo,
  },
  ollama: {
    name: "Ollama",
    description: [
      "Your model and chats are only accessible on the machine running Ollama models.",
    ],
    logo: OllamaLogo,
  },
  fireworksai: {
    name: "FireworksAI",
    policyUrl: "https://fireworks.ai/privacy-policy",
    logo: FireworksAILogo,
  },
  mistral: {
    name: "Mistral",
    policyUrl: "https://legal.mistral.ai/terms/privacy-policy",
    logo: MistralLogo,
  },
  huggingface: {
    name: "HuggingFace",
    policyUrl: "https://huggingface.co/privacy",
    logo: HuggingFaceLogo,
  },
  groq: {
    name: "Groq",
    policyUrl: "https://groq.com/privacy-policy/",
    logo: GroqLogo,
  },
  "generic-openai": {
    name: "Generic OpenAI compatible service",
    description: [
      "Data is shared according to the terms of service applicable with your generic endpoint provider.",
    ],
    logo: GenericOpenAiLogo,
  },
  litellm: {
    name: "LiteLLM",
    description: [
      "Your model and chats are only accessible on the server running LiteLLM",
    ],
    logo: LiteLLMLogo,
  },
  xai: {
    name: "xAI",
    policyUrl: "https://x.ai/legal/privacy-policy",
    logo: XAILogo,
  },
  "docker-model-runner": {
    name: "Docker Model Runner",
    description: [
      "Your model and chats are only accessible on the machine running Docker Model Runner.",
    ],
    logo: DockerModelRunnerLogo,
  },
};

const VECTOR_DB_PROVIDER_PRIVACY_MAP = {
  chroma: {
    name: "Chroma",
    description: [
      "Your vectors and document text are stored on your Chroma instance.",
      "Access to your instance is managed by you.",
    ],
    logo: ChromaLogo,
  },
  pgvector: {
    name: "PGVector",
    description: [
      "Your vectors and document text are stored on your PostgreSQL instance.",
      "Access to your instance is managed by you.",
    ],
    logo: PGVectorLogo,
  },
  lancedb: {
    name: "LanceDB",
    description: [
      "Your vectors and document text are stored privately on this instance of OpenSIN Chat.",
    ],
    logo: LanceDbLogo,
  },
};

const EMBEDDING_ENGINE_PROVIDER_PRIVACY_MAP = {
  native: {
    name: "OpenSIN Chat Embedder",
    description: [
      "Your document text is embedded privately on this instance of OpenSIN Chat.",
    ],
    logo: OpenSINChatIcon,
  },
  openai: {
    name: "OpenAI",
    policyUrl: "https://openai.com/policies/privacy-policy/",
    logo: OpenAiLogo,
  },
  localai: {
    name: "LocalAI",
    description: [
      "Your document text is embedded privately on the server running LocalAI.",
    ],
    logo: LocalAiLogo,
  },
  ollama: {
    name: "Ollama",
    description: [
      "Your document text is embedded privately on the server running Ollama.",
    ],
    logo: OllamaLogo,
  },
  lmstudio: {
    name: "LMStudio",
    description: [
      "Your document text is embedded privately on the server running LMStudio.",
    ],
    logo: LMStudioLogo,
  },
  voyageai: {
    name: "Voyage AI",
    policyUrl: "https://www.voyageai.com/privacy",
    logo: VoyageAiLogo,
  },
  mistral: {
    name: "Mistral AI",
    policyUrl: "https://legal.mistral.ai/terms/privacy-policy",
    logo: MistralLogo,
  },
  litellm: {
    name: "LiteLLM",
    description: [
      "Your document text is only accessible on the server running LiteLLM and to the providers you configured in LiteLLM.",
    ],
    logo: LiteLLMLogo,
  },
  "generic-openai": {
    name: "Generic OpenAI compatible service",
    description: [
      "Data is shared according to the terms of service applicable with your generic endpoint provider.",
    ],
    logo: GenericOpenAiLogo,
  },
  gemini: {
    name: "Google Gemini",
    policyUrl: "https://policies.google.com/privacy",
    logo: GeminiLogo,
  },
};

export const PROVIDER_PRIVACY_MAP = {
  llm: LLM_PROVIDER_PRIVACY_MAP,
  embeddingEngine: EMBEDDING_ENGINE_PROVIDER_PRIVACY_MAP,
  vectorDb: VECTOR_DB_PROVIDER_PRIVACY_MAP,
};
