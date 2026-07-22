// SPDX-License-Identifier: MIT
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const VOICE_STORAGE_KEY = "opensin_native_tts_voice";

export function getStoredVoiceName(): string | null {
  return localStorage.getItem(VOICE_STORAGE_KEY);
}

export default function BrowserNative() {
  const { t, i18n } = useTranslation();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selected, setSelected] = useState<string>(
    () => localStorage.getItem(VOICE_STORAGE_KEY) || "",
  );

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => {
      const list = window.speechSynthesis.getVoices();
      if (list.length) {
        const lang = i18n.language?.startsWith("de") ? "de" : "en";
        const sorted = [...list].sort((a, b) => {
          const aMatch = a.lang.startsWith(lang) ? 0 : 1;
          const bMatch = b.lang.startsWith(lang) ? 0 : 1;
          if (aMatch !== bMatch) return aMatch - bMatch;
          const aPremium = /premium|enhanced|natural|neural/i.test(a.name) ? 0 : 1;
          const bPremium = /premium|enhanced|natural|neural/i.test(b.name) ? 0 : 1;
          if (aPremium !== bPremium) return aPremium - bPremium;
          return a.name.localeCompare(b.name);
        });
        setVoices(sorted);
        if (!localStorage.getItem(VOICE_STORAGE_KEY) && sorted.length) {
          localStorage.setItem(VOICE_STORAGE_KEY, sorted[0].name);
          setSelected(sorted[0].name);
        }
      }
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, [i18n.language]);

  const handleChange = (name: string) => {
    setSelected(name);
    localStorage.setItem(VOICE_STORAGE_KEY, name);
    const voice = voices.find((v) => v.name === name);
    if (voice) {
      const u = new SpeechSynthesisUtterance("Test");
      u.voice = voice;
      u.volume = 0.3;
      window.speechSynthesis.speak(u);
    }
  };

  if (!("speechSynthesis" in window)) {
    return (
      <p className="text-sm text-theme-text-secondary">
        {t("common.notSupported", "Nicht unterstützt")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-[640px]">
      <label className="text-sm font-medium text-theme-text-primary">
        {t("audioPreference.tts.voiceSelection", "Stimme auswählen")}
      </label>
      <select
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full h-[40px] bg-theme-settings-input-bg rounded-lg px-3 text-sm text-theme-text-primary border-2 border-transparent focus:border-primary-button outline-none cursor-pointer"
      >
        {voices.map((v) => (
          <option key={v.name} value={v.name}>
            {v.name} ({v.lang})
          </option>
        ))}
      </select>
      <p className="text-xs text-theme-text-secondary">
        {t(
          "audioPreference.tts.voiceHint",
          "Premium/Enhanced-Stimmen klingen natürlicher. Die Auswahl wird im Browser gespeichert.",
        )}
      </p>
    </div>
  );
}
