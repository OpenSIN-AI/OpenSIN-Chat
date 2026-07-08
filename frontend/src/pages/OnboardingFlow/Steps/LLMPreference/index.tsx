// SPDX-License-Identifier: MIT
// Purpose: Onboarding step to select the LLM provider and configure its options.
// Docs: index.doc.md
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { useState, useRef, useEffect } from "react";
import OpenAiLogo from "@/media/llmprovider/openai.png";
import GenericOpenAiLogo from "@/media/llmprovider/generic-openai.png";
import AnthropicLogo from "@/media/llmprovider/anthropic.png";
import GeminiLogo from "@/media/llmprovider/gemini.png";
import OllamaLogo from "@/media/llmprovider/ollama.png";
import LMStudioLogo from "@/media/llmprovider/lmstudio.png";
import LocalAiLogo from "@/media/llmprovider/localai.png";
import FireworksAILogo from "@/media/llmprovider/fireworksai.jpeg";
import MistralLogo from "@/media/llmprovider/mistral.jpeg";
import HuggingFaceLogo from "@/media/llmprovider/huggingface.png";
import GroqLogo from "@/media/llmprovider/groq.png";
import LiteLLMLogo from "@/media/llmprovider/litellm.png";
import XAILogo from "@/media/llmprovider/xai.png";
import NvidiaNimLogo from "@/media/llmprovider/nvidia-nim.png";
import OpencodeZenLogo from "@/media/llmprovider/opencode-zen.png";
import DockerModelRunnerLogo from "@/media/llmprovider/docker-model-runner.png";

import OpenAiOptions from "@/components/LLMSelection/OpenAiOptions";
import GenericOpenAiOptions from "@/components/LLMSelection/GenericOpenAiOptions";
import AnthropicAiOptions from "@/components/LLMSelection/AnthropicAiOptions";
import LMStudioOptions from "@/components/LLMSelection/LMStudioOptions";
import LocalAiOptions from "@/components/LLMSelection/LocalAiOptions";
import GeminiLLMOptions from "@/components/LLMSelection/GeminiLLMOptions";
import OllamaLLMOptions from "@/components/LLMSelection/OllamaLLMOptions";
import MistralOptions from "@/components/LLMSelection/MistralOptions";
import HuggingFaceOptions from "@/components/LLMSelection/HuggingFaceOptions";
import FireworksAiOptions from "@/components/LLMSelection/FireworksAiOptions";
import GroqAiOptions from "@/components/LLMSelection/GroqAiOptions";
import LiteLLMOptions from "@/components/LLMSelection/LiteLLMOptions";
import XAILLMOptions from "@/components/LLMSelection/XAiLLMOptions";
import NvidiaNimOptions from "@/components/LLMSelection/NvidiaNimOptions";
import OpencodeZenOptions from "@/components/LLMSelection/OpencodeZenOptions";
import DockerModelRunnerOptions from "@/components/LLMSelection/DockerModelRunnerOptions";

import LLMItem from "@/components/LLMSelection/LLMItem";
import System from "@/models/system";
import paths from "@/utils/paths";
import showToast from "@/utils/toast";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useSystemSettings from "@/hooks/useSystemSettings";

interface LLMOption {
  name: string;
  value: string;
  logo: string;
  options: (settings: any) => React.ReactNode;
  description: string;
}

interface OnboardingStepProps {
  setHeader: (header: { title: string; description: string }) => void;
  setForwardBtn: (btn: {
    showing: boolean;
    disabled: boolean;
    onClick: () => void;
  }) => void;
  setBackBtn: (btn: {
    showing: boolean;
    disabled: boolean;
    onClick: () => void;
  }) => void;
}

const LLMS: LLMOption[] = [
  {
    name: "OpenAI",
    value: "openai",
    logo: OpenAiLogo,
    options: (settings) => <OpenAiOptions settings={settings} />,
    description: "The standard option for most non-commercial use.",
  },
  {
    name: "Anthropic",
    value: "anthropic",
    logo: AnthropicLogo,
    options: (settings) => <AnthropicAiOptions settings={settings} />,
    description: "A friendly AI Assistant hosted by Anthropic.",
  },
  {
    name: "Gemini",
    value: "gemini",
    logo: GeminiLogo,
    options: (settings) => <GeminiLLMOptions settings={settings} />,
    description: "Google's largest and most capable AI model",
  },
  {
    name: "NVIDIA NIM",
    value: "nvidia-nim",
    logo: NvidiaNimLogo,
    options: (settings) => <NvidiaNimOptions settings={settings} />,
    description:
      "Run full parameter LLMs directly on your NVIDIA RTX GPU using NVIDIA NIM.",
  },
  {
    name: "OpenCode Zen",
    value: "opencode-zen",
    logo: OpencodeZenLogo,
    options: (settings) => <OpencodeZenOptions settings={settings} />,
    description:
      "Curated AI models gateway by OpenCode. Free models available (Nemotron, DeepSeek, MiMo).",
  },
  {
    name: "HuggingFace",
    value: "huggingface",
    logo: HuggingFaceLogo,
    options: (settings) => <HuggingFaceOptions settings={settings} />,
    description:
      "Access 150,000+ open-source LLMs and the world's AI community",
  },
  {
    name: "Ollama",
    value: "ollama",
    logo: OllamaLogo,
    options: (settings) => <OllamaLLMOptions settings={settings} />,
    description: "Run LLMs locally on your own machine.",
  },
  {
    name: "LM Studio",
    value: "lmstudio",
    logo: LMStudioLogo,
    options: (settings) => <LMStudioOptions settings={settings} />,
    description:
      "Discover, download, and run thousands of cutting edge LLMs in a few clicks.",
  },
  {
    name: "Docker Model Runner",
    value: "docker-model-runner",
    logo: DockerModelRunnerLogo,
    options: (settings) => <DockerModelRunnerOptions settings={settings} />,
    description: "Run LLMs using Docker Model Runner.",
  },
  {
    name: "Local AI",
    value: "localai",
    logo: LocalAiLogo,
    options: (settings) => <LocalAiOptions settings={settings} />,
    description: "Run LLMs locally on your own machine.",
  },
  {
    name: "Fireworks AI",
    value: "fireworksai",
    logo: FireworksAILogo,
    options: (settings) => <FireworksAiOptions settings={settings} />,
    description:
      "The fastest and most efficient inference engine to build production-ready, compound AI systems.",
  },
  {
    name: "Mistral",
    value: "mistral",
    logo: MistralLogo,
    options: (settings) => <MistralOptions settings={settings} />,
    description: "Run open source models from Mistral AI.",
  },
  {
    name: "Groq",
    value: "groq",
    logo: GroqLogo,
    options: (settings) => <GroqAiOptions settings={settings} />,
    description:
      "The fastest LLM inferencing available for real-time AI applications.",
  },
  {
    name: "LiteLLM",
    value: "litellm",
    logo: LiteLLMLogo,
    options: (settings) => <LiteLLMOptions settings={settings} />,
    description: "Run LiteLLM's OpenAI compatible proxy for various LLMs.",
  },
  {
    name: "xAI",
    value: "xai",
    logo: XAILogo,
    options: (settings) => <XAILLMOptions settings={settings} />,
    description: "Run xAI's powerful LLMs like Grok-2 and more.",
  },
  {
    name: "Generic OpenAI",
    value: "generic-openai",
    logo: GenericOpenAiLogo,
    options: (settings) => <GenericOpenAiOptions settings={settings} />,
    description:
      "Connect to any OpenAi-compatible service via a custom configuration",
  },
];

export default function LLMPreference({
  setHeader,
  setForwardBtn,
  setBackBtn,
}: OnboardingStepProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredLLMs, setFilteredLLMs] = useState<LLMOption[]>([]);
  const [selectedLLM, setSelectedLLM] = useState<string | null>(null);
  const { settings } = useSystemSettings();
  const formRef = useRef<HTMLFormElement>(null);
  const hiddenSubmitButtonRef = useRef<HTMLButtonElement>(null);
  const isHosted = window.location.hostname.includes("useanything.com");
  const navigate = useNavigate();

  const TITLE = t("onboarding.llm.title");
  const DESCRIPTION = t("onboarding.llm.description");

  // Set selectedLLM once settings load
  useEffect(() => {
    if (settings && selectedLLM === null) {
      setSelectedLLM(settings?.LLMProvider || "openai");
    }
  }, [settings]);

  async function handleForward() {
    // Do NOT call markOnboardingComplete here — onboarding is only complete
    // after the user finishes all steps (UserSetup, DataHandling). Marking
    // it complete prematurely would trigger useRedirectToHomeOnOnboardingComplete
    // to skip the remaining steps.
    if (hiddenSubmitButtonRef.current) {
      hiddenSubmitButtonRef.current.click();
    }
  }

  function handleBack() {
    navigate(paths.onboarding.home());
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data: Record<string, any> = {};
    const formData = new FormData(form);
    data.LLMProvider = selectedLLM;
    // Default to OpenSIN Chat embedder and LanceDB
    data.EmbeddingEngine = "native";
    data.VectorDB = "lancedb";
    for (const [key, value] of formData.entries()) data[key] = value;

    const { error } = await System.updateSystem(data);
    if (error) {
      showToast(t("onboarding.llm.saveFailed", { error }), "error");
      return;
    }
    navigate(paths.onboarding.userSetup());
  };

  useEffect(() => {
    setHeader({ title: TITLE, description: DESCRIPTION });
    setForwardBtn({ showing: true, disabled: false, onClick: handleForward });
    setBackBtn({ showing: true, disabled: false, onClick: handleBack });
  }, []);

  useEffect(() => {
    const filtered = LLMS.filter((llm) =>
      llm.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    setFilteredLLMs(filtered);
  }, [searchQuery, selectedLLM]);

  return (
    <div>
      <form ref={formRef} onSubmit={handleSubmit} className="w-full">
        <div className="w-full relative border-theme-chat-input-border shadow border-2 rounded-lg text-theme-text-primary">
          <div className="w-full p-4 absolute top-0 rounded-t-lg backdrop-blur-sm">
            <div className="w-full flex items-center sticky top-0">
              <MagnifyingGlass
                size={16}
                weight="bold"
                className="absolute left-4 z-30 text-theme-text-primary"
              />
              <input
                type="text"
                placeholder={t("common.searchLLMProviders")}
                className="bg-theme-bg-secondary placeholder:text-theme-text-secondary z-20 pl-10 h-[38px] rounded-full w-full px-4 py-1 text-sm border border-theme-chat-input-border outline-none focus:outline-primary-button active:outline-primary-button outline-none text-theme-text-primary"
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
              />
            </div>
          </div>
          <div className="px-4 pt-[70px] flex flex-col gap-y-1 max-h-[390px] overflow-y-auto no-scroll pb-4">
            {filteredLLMs.map((llm) => {
              if (llm.value === "native" && isHosted) return null;
              return (
                <LLMItem
                  key={llm.name}
                  name={llm.name}
                  value={llm.value}
                  image={llm.logo}
                  description={llm.description}
                  checked={selectedLLM === llm.value}
                  onClick={() => setSelectedLLM(llm.value)}
                />
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-y-1">
          {selectedLLM &&
            LLMS.find((llm) => llm.value === selectedLLM)?.options(settings)}
        </div>
        <button
          type="submit"
          ref={hiddenSubmitButtonRef}
          hidden
          aria-hidden="true"
        ></button>
      </form>
    </div>
  );
}
