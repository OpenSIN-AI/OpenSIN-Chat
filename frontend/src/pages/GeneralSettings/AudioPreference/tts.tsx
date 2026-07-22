// SPDX-License-Identifier: MIT
import React, { useEffect, useState, useRef, FormEvent } from "react";
import System from "@/models/system";
import showToast from "@/utils/toast";
import LLMItem from "@/components/LLMSelection/LLMItem";
import { CaretUpDown } from "@phosphor-icons/react/dist/csr/CaretUpDown";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { X } from "@phosphor-icons/react/dist/csr/X";
import CTAButton from "@/components/lib/CTAButton";
import OpenAiLogo from "@/media/llmprovider/openai.png";
import OpenSINChatIcon from "@/media/logo/opensin-icon.svg";
import ElevenLabsIcon from "@/media/ttsproviders/elevenlabs.png";
import PiperTTSIcon from "@/media/ttsproviders/piper.png";
import GenericOpenAiLogo from "@/media/ttsproviders/generic-openai.png";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import KokoroIcon from "@/media/ttsproviders/kokoro.png";
import NvidiaNimLogo from "@/media/llmprovider/nvidia-nim.png";
import { useTranslation } from "react-i18next";
import { FEATURES } from "@/utils/features";

import BrowserNative from "@/components/TextToSpeech/BrowserNative";
import OpenAiTTSOptions from "@/components/TextToSpeech/OpenAiOptions";
import ElevenLabsTTSOptions from "@/components/TextToSpeech/ElevenLabsOptions";
import PiperTTSOptions from "@/components/TextToSpeech/PiperTTSOptions";
import OpenAiGenericTTSOptions from "@/components/TextToSpeech/OpenAiGenericOptions";
import KokoroTTSOptions from "@/components/TextToSpeech/KokoroOptions";
import NvidiaNimTTSOptions from "@/components/TextToSpeech/NvidiaNimOptions";
import CvoiceTTSOptions from "@/components/TextToSpeech/CvoiceOptions";
import CvoiceLogo from "@/media/ttsproviders/cvoice.png";
import logger from "@/utils/logger";

/** Settings object shape passed to TTS provider option components. */
interface TTSSettings {
  TextToSpeechProvider?: string;
  [key: string]: unknown;
}

/** Translation function type from react-i18next. */
type TFunction = (key: string, options?: Record<string, unknown>) => string;

interface TTSProvider {
  name: string;
  value: string;
  logo: string;
  options: (settings: TTSSettings) => React.ReactNode;
  description: string;
}

const PROVIDERS = (t: TFunction): TTSProvider[] =>
  [
    {
      name: t("audioPreference.tts.systemNative"),
      value: "native",
      logo: OpenSINChatIcon,
      options: (_settings: TTSSettings) => <BrowserNative />,
      description: t("audioPreference.tts.systemNativeDesc"),
    },
    {
      name: t("audioPreference.tts.openai"),
      value: "openai",
      logo: OpenAiLogo,
      options: (settings: TTSSettings) => (
        <OpenAiTTSOptions settings={settings} />
      ),
      description: t("audioPreference.tts.openaiDesc"),
    },
    {
      name: t("audioPreference.tts.elevenlabs"),
      value: "elevenlabs",
      logo: ElevenLabsIcon,
      options: (settings: TTSSettings) => (
        <ElevenLabsTTSOptions settings={settings} />
      ),
      description: t("audioPreference.tts.elevenlabsDesc"),
    },
    {
      name: t("audioPreference.tts.piper"),
      value: "piper_local",
      logo: PiperTTSIcon,
      options: (settings: TTSSettings) => <PiperTTSOptions settings={settings} />,
      description: t("audioPreference.tts.piperDesc"),
    },
    {
      name: t("audioPreference.tts.kokoro"),
      value: "kokoro",
      logo: KokoroIcon,
      options: (settings: TTSSettings) => (
        <KokoroTTSOptions settings={settings} />
      ),
      description: t("audioPreference.tts.kokoroDesc"),
    },
    {
      name: t("audioPreference.tts.openaiCompatible"),
      value: "generic-openai",
      logo: GenericOpenAiLogo,
      options: (settings: TTSSettings) => (
        <OpenAiGenericTTSOptions settings={settings} />
      ),
      description: t("audioPreference.tts.openaiCompatibleDesc"),
    },
    {
      name: t("audioPreference.tts.nvidiaNim"),
      value: "nvidia-nim",
      logo: NvidiaNimLogo,
      options: (settings: TTSSettings) => (
        <NvidiaNimTTSOptions settings={settings} />
      ),
      description: t("audioPreference.tts.nvidiaNimDesc"),
    },
    {
      name: t("audioPreference.tts.cvoice"),
      value: "cvoice",
      logo: CvoiceLogo,
      options: (settings: TTSSettings) => (
        <CvoiceTTSOptions settings={settings} />
      ),
      description: t("audioPreference.tts.cvoiceDesc"),
    },
  ].filter(
    (provider) => provider.value !== "cvoice" || FEATURES.cvoiceTts,
  );

export default function TextToSpeechProvider({
  settings,
}: {
  settings: TTSSettings;
}) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const blocker = useUnsavedChanges(hasChanges);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProviders, setFilteredProviders] = useState<TTSProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState(
    settings?.TextToSpeechProvider || "native",
  );
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const form = e.target as HTMLFormElement;
      const data: Record<string, unknown> = {
        TextToSpeechProvider: selectedProvider,
      };
      const formData = new FormData(form);

      for (const [key, value] of formData.entries()) data[key] = value;
      const { error } = await System.updateSystem(data);

      if (error) {
        showToast(t("audioPreference.tts.saveFailed", { error }), "error");
      } else {
        showToast(t("audioPreference.tts.saveSuccess"), "success");
      }
      setHasChanges(!!error);
    } catch (err) {
      logger.error(err);
    } finally {
      setSaving(false);
    }
  };

  const updateProviderChoice = (selection: string) => {
    setSearchQuery("");
    setSelectedProvider(selection);
    setSearchMenuOpen(false);
    setHasChanges(true);
  };

  const handleXButton = () => {
    if (searchQuery.length > 0) {
      setSearchQuery("");
      if (searchInputRef.current) searchInputRef.current.value = "";
    } else {
      setSearchMenuOpen(!searchMenuOpen);
    }
  };

  useEffect(() => {
    const filtered = PROVIDERS(t).filter((provider) =>
      provider.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    setFilteredProviders(filtered);
  }, [searchQuery, selectedProvider]);

  useEffect(() => {
    if (!searchMenuOpen) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setSearchMenuOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [searchMenuOpen]);

  const selectedProviderObject = PROVIDERS(t).find(
    (provider) => provider.value === selectedProvider,
  );

  return (
    <form onSubmit={handleSubmit} className="flex w-full">
      <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
        <div className="w-full flex flex-col gap-y-1 pb-6 border-white light:border-theme-sidebar-border border-b-2 border-opacity-10">
          <div className="flex gap-x-4 items-center">
            <p className="text-lg leading-6 font-bold text-white">
              {t("audioPreference.tts.title")}
            </p>
          </div>
          <p className="text-xs leading-[18px] font-base text-white text-opacity-60">
            {t("audioPreference.tts.description")}
          </p>
        </div>
        <div className="w-full justify-end flex">
          {hasChanges && (
            <CTAButton type="submit" className="mt-3 mr-0 -mb-14 z-10">
              {saving ? t("common.saving") : t("common.saveChanges")}
            </CTAButton>
          )}
        </div>
        <div className="text-base font-bold text-white mt-6 mb-4">
          {t("common.provider")}
        </div>
        <div className="relative">
          {searchMenuOpen && (
            <div
              className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-70 backdrop-blur-sm z-10"
              onClick={() => setSearchMenuOpen(false)}
            />
          )}
          {searchMenuOpen ? (
            <div className="absolute top-0 left-0 w-full max-w-[640px] max-h-[310px] min-h-[64px] bg-theme-settings-input-bg rounded-lg flex flex-col justify-between cursor-pointer border-2 border-primary-button z-20">
              <div className="w-full flex flex-col gap-y-1">
                <div className="flex items-center sticky top-0 z-10 border-b border-[#9CA3AF] mx-4 bg-theme-settings-input-bg">
                  <MagnifyingGlass
                    size={20}
                    weight="bold"
                    className="absolute left-4 z-30 text-theme-text-primary -ml-4 my-2"
                  />
                  <input
                    type="text"
                    name="tts-provider-search"
                    autoComplete="off"
                    placeholder={t("audioPreference.tts.searchPlaceholder")}
                    className="border-none -ml-4 my-2 bg-transparent z-20 pl-12 h-[38px] w-full px-4 py-1 text-sm outline-none text-theme-text-primary placeholder:text-theme-text-primary placeholder:font-medium"
                    onChange={(e) => setSearchQuery(e.target.value)}
                    ref={searchInputRef}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.preventDefault();
                    }}
                  />
                  <X
                    size={20}
                    weight="bold"
                    className="cursor-pointer text-white hover:text-x-button"
                    onClick={handleXButton}
                  />
                </div>
                <div className="flex-1 pl-4 pr-2 flex flex-col gap-y-1 overflow-y-auto white-scrollbar pb-4 max-h-[245px]">
                  {filteredProviders.map((provider) => (
                    <LLMItem
                      key={provider.name}
                      name={provider.name}
                      value={provider.value}
                      image={provider.logo}
                      description={provider.description}
                      checked={selectedProvider === provider.value}
                      onClick={() => updateProviderChoice(provider.value)}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <button
              aria-label={t("common.selectProvider", "Select provider")}
              className="w-full max-w-[640px] h-[64px] bg-theme-settings-input-bg rounded-lg flex items-center p-[14px] justify-between cursor-pointer border-2 border-transparent hover:border-primary-button transition-all duration-300"
              type="button"
              onClick={() => setSearchMenuOpen(true)}
            >
              <div className="flex gap-x-4 items-center">
                <img
                  src={selectedProviderObject?.logo}
                  alt={`${selectedProviderObject?.name} logo`}
                  className="w-10 h-10 rounded-md"
                />
                <div className="flex flex-col text-left">
                  <div className="text-sm font-semibold text-white">
                    {selectedProviderObject?.name}
                  </div>
                  <div className="mt-1 text-xs text-description">
                    {selectedProviderObject?.description}
                  </div>
                </div>
              </div>
              <CaretUpDown size={24} weight="bold" className="text-white" />
            </button>
          )}
        </div>
        <div
          onChange={() => setHasChanges(true)}
          className="mt-4 flex flex-col gap-y-1"
        >
          {selectedProvider &&
            PROVIDERS(t)
              .find((provider) => provider.value === selectedProvider)
              ?.options(settings)}
        </div>
      </div>
      <UnsavedChangesDialog blocker={blocker} />
    </form>
  );
}
