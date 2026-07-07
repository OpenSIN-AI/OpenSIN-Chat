// SPDX-License-Identifier: MIT
import { useState, useRef, useEffect } from "react";
import PiperTTSClient from "@/utils/piperTTS";
import { titleCase } from "text-case";
import { humanFileSize } from "@/utils/numbers";
import showToast from "@/utils/toast";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import { PauseCircle } from "@phosphor-icons/react/dist/csr/PauseCircle";
import { PlayCircle } from "@phosphor-icons/react/dist/csr/PlayCircle";
import usePiperVoices from "@/hooks/usePiperVoices";
import { useTranslation } from "react-i18next";

export default function PiperTTSOptions({ settings }: any) {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm font-base text-white text-opacity-60 mb-4">
        {t("textToSpeech.piper.description")}
      </p>
      <div className="flex gap-x-4 items-center">
        <PiperTTSModelSelection settings={settings} />
      </div>
    </>
  );
}

function voicesByLanguage(voices: any = []) {
  const voicesByLanguage = voices.reduce((acc, voice) => {
    const langName = voice?.language?.name_english ?? "Unlisted";
    acc[langName] = acc[langName] || [];
    acc[langName].push(voice);
    return acc;
  }, {});
  return Object.entries(voicesByLanguage);
}

function voiceDisplayName(voice: any) {
  const { is_stored, name, quality, files } = voice;
  const onnxFileKey = Object.keys(files).find((key) => key.endsWith(".onnx"));
  const fileSize = files?.[onnxFileKey]?.size_bytes || 0;
  return `${is_stored ? "✔ " : ""}${titleCase(name)}-${quality === "low" ? "Low" : "HQ"} (${humanFileSize(fileSize)})`;
}

function PiperTTSModelSelection({ settings }: any) {
  const { t } = useTranslation();
  const { voices, isLoading: loading } = usePiperVoices();
  const [selectedVoice, setSelectedVoice] = useState(
    settings?.TTSPiperTTSVoiceModel,
  );

  function flushVoices() {
    PiperTTSClient.flush()
      .then(() =>
        showToast(t("textToSpeech.piper.flushSuccess"), "info", {
          clear: true,
        }),
      )

      .catch((e) => console.error(e));
  }

  if (loading) {
    return (
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("textToSpeech.piper.voiceModelSelection")}
        </label>
        <select
          name="TTSPiperTTSVoiceModel"
          value=""
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
        >
          <option value="" disabled={true}>
            {t("textToSpeech.piper.loadingModels")}
          </option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-fit">
      <div className="flex flex-col w-60">
        <label className="text-white text-sm font-semibold block mb-3">
          {t("textToSpeech.piper.voiceModelSelection")}
        </label>
        <div className="flex items-center w-fit gap-x-4 mb-2">
          <select
            name="TTSPiperTTSVoiceModel"
            required={true}
            onChange={(e) =>
              setSelectedVoice((e.target as unknown as any)?.value)
            }
            value={selectedVoice}
            className="border-none flex-shrink-0 bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
          >
            {voicesByLanguage(voices).map(([lang, voices]) => {
              return (
                <optgroup key={lang} label={lang}>
                  {(voices as any).map((voice) => (
                    <option key={voice.key} value={voice.key}>
                      {voiceDisplayName(voice)}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          <DemoVoiceSample voiceId={selectedVoice} />
        </div>
        <p className="text-xs text-theme-placeholder">
          {t("textToSpeech.piper.storedIndicator")}
        </p>
      </div>
      {!!(voices as any[]).find((voice) => voice.is_stored) && (
        <button
          type="button"
          onClick={flushVoices}
          className="w-fit border-none hover:text-white hover:underline text-theme-placeholder text-sm my-4"
        >
          {t("textToSpeech.piper.flushVoiceCache")}
        </button>
      )}
    </div>
  );
}

function DemoVoiceSample({ voiceId }: any) {
  const { t } = useTranslation();
  const playerRef = useRef(null);
  const [speaking, setSpeaking] = useState(false as any);
  const [loading, setLoading] = useState(false as any);
  const [audioSrc, setAudioSrc] = useState(null);
  const clientRef = useRef<any>(null);

  async function speakMessage(e: any) {
    e.preventDefault();
    if (speaking) {
      playerRef?.current?.pause();
      return;
    }

    try {
      if (!audioSrc) {
        setLoading(true);
        const client = new PiperTTSClient({ voiceId });
        clientRef.current = client;
        const blobUrl = await client.getAudioBlobForText(
          t("textToSpeech.piper.demoText"),
        );
        setAudioSrc(blobUrl);
        setLoading(false);
        client.worker?.terminate();
        PiperTTSClient._instance = null;
        clientRef.current = null;
      } else {
        playerRef.current.play();
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
      setSpeaking(false);
    }
  }

  useEffect(() => {
    const player = playerRef?.current;
    if (!player) return;

    function handlePlay() {
      setSpeaking(true);
    }

    function handlePause() {
      player.currentTime = 0;
      setSpeaking(false);
      setAudioSrc(null);
    }

    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);

    return () => {
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
    };
  }, []);

  // Release the demo audio blob URL and terminate any pending worker when
  // the component unmounts so neither the blob nor the worker leaks.
  useEffect(() => {
    return () => {
      if (audioSrc) URL.revokeObjectURL(audioSrc);
      if (clientRef.current?.worker) {
        clientRef.current.worker.terminate();
        PiperTTSClient._instance = null;
        clientRef.current = null;
      }
    };
  }, [audioSrc]);

  return (
    <button
      type="button"
      onClick={speakMessage}
      disabled={loading}
      className="border-none text-zinc-300 flex items-center gap-x-1"
    >
      {speaking ? (
        <>
          <PauseCircle size={20} className="flex-shrink-0" />
          <p className="text-sm flex-shrink-0">
            {t("textToSpeech.piper.stopDemo")}
          </p>
        </>
      ) : (
        <>
          {loading ? (
            <>
              <CircleNotch size={20} className="animate-spin flex-shrink-0" />
              <p className="text-sm flex-shrink-0">
                {t("textToSpeech.piper.loadingVoice")}
              </p>
            </>
          ) : (
            <>
              <PlayCircle size={20} className="flex-shrink-0 text-white" />
              <p className="text-white text-sm flex-shrink-0">
                {t("textToSpeech.piper.playSample")}
              </p>
            </>
          )}
        </>
      )}
      <audio
        ref={playerRef}
        hidden={true}
        src={audioSrc}
        autoPlay={true}
        controls={false}
      />
    </button>
  );
}
