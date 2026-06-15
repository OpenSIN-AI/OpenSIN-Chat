// SPDX-License-Identifier: MIT
// Docs: useLLMConfig.doc.md
import { useEffect, useRef, useState } from "react";
import System from "@/models/system";
import showToast from "@/utils/toast";
import useSystemSettings from "@/hooks/useSystemSettings";

export const LLM_PREFERENCE_CHANGED_EVENT = "llm-preference-changed";

type LLMProvider = {
  name: string;
  value: string;
};

type UseLLMConfigResult = {
  saving: boolean;
  hasChanges: boolean;
  setHasChanges: (value: boolean) => void;
  settings: any;
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredLLMs: LLMProvider[];
  selectedLLM: string | null;
  searchMenuOpen: boolean;
  setSearchMenuOpen: (open: boolean) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  updateLLMChoice: (selection: string) => void;
  handleXButton: () => void;
  selectedLLMObject?: LLMProvider;
};

export default function useLLMConfig(
  availableProviders: LLMProvider[],
): UseLLMConfigResult {
  const { settings, loading } = useSystemSettings();
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredLLMs, setFilteredLLMs] = useState<LLMProvider[]>([]);
  const [selectedLLM, setSelectedLLM] = useState(
    () => settings?.LLMProvider ?? null,
  );
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync selectedLLM once settings arrive from SWR
  useEffect(() => {
    if (!loading && settings?.LLMProvider && selectedLLM === null) {
      setSelectedLLM(settings.LLMProvider);
    }
  }, [loading, settings?.LLMProvider]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data: Record<string, any> = { LLMProvider: selectedLLM };
    const formData = new FormData(form);

    for (const [key, value] of formData.entries()) data[key] = value;
    const { error } = await System.updateSystem(data);
    setSaving(true);

    if (error) {
      showToast(`Failed to save LLM settings: ${error}`, "error");
    } else {
      showToast("LLM preferences saved successfully.", "success");
    }
    setSaving(false);
    setHasChanges(!!error);
  };

  const updateLLMChoice = (selection: string) => {
    setSearchQuery("");
    setSelectedLLM(selection);
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
    function updateHasChanges() {
      setHasChanges(true);
    }
    window.addEventListener(LLM_PREFERENCE_CHANGED_EVENT, updateHasChanges);
    return () => {
      window.removeEventListener(
        LLM_PREFERENCE_CHANGED_EVENT,
        updateHasChanges,
      );
    };
  }, []);

  useEffect(() => {
    const filtered = availableProviders.filter((llm) =>
      llm.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    setFilteredLLMs(filtered);
  }, [searchQuery, selectedLLM]);

  const selectedLLMObject = availableProviders.find(
    (llm) => llm.value === selectedLLM,
  );

  return {
    saving,
    hasChanges,
    setHasChanges,
    settings,
    loading,
    searchQuery,
    setSearchQuery,
    filteredLLMs,
    selectedLLM,
    searchMenuOpen,
    setSearchMenuOpen,
    searchInputRef,
    handleSubmit,
    updateLLMChoice,
    handleXButton,
    selectedLLMObject,
  };
}