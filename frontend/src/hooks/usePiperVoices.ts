// SPDX-License-Identifier: MIT
import useSWR from "swr";
import PiperTTSClient from "@/utils/piperTTS";

export const CACHE_KEY = "piper_voices";

export default function usePiperVoices() {
  const { data, error, isLoading, mutate } = useSWR(CACHE_KEY, () =>
    PiperTTSClient.voices(),
  );
  return {
    voices: data ?? [],
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
