// SPDX-License-Identifier: MIT
import { ReactNode } from "react";
import { useTTSProvider } from "@/components/contexts/TTSProvider";
import NativeTTSMessage from "./native";
import AsyncTTSMessage from "./asyncTts";
import PiperTTSMessage from "./piperTTS";

function WrapTTS({ children }: { children: ReactNode }) {
  return <div className="mx-2">{children}</div>;
}

export default function TTSMessage({
  slug,
  chatId,
  message,
}: {
  slug: string;
  chatId: string;
  message: string;
}) {
  const { settings, provider, loading } = useTTSProvider();
  if (!chatId || loading) return null;

  switch (provider) {
    case "openai":
    case "generic-openai":
    case "elevenlabs":
    case "kokoro":
    case "cvoice":
    case "nvidia-nim":
      return (
        <WrapTTS>
          <AsyncTTSMessage chatId={chatId} slug={slug} />
        </WrapTTS>
      );
    case "piper_local":
      return (
        <WrapTTS>
          <PiperTTSMessage
            chatId={chatId}
            voiceId={settings?.TTSPiperTTSVoiceModel}
            message={message}
          />
        </WrapTTS>
      );
    default:
      return (
        <WrapTTS>
          <NativeTTSMessage chatId={chatId} message={message} />
        </WrapTTS>
      );
  }
}
