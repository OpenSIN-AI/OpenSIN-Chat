// SPDX-License-Identifier: MIT
import useSystemSettings from "@/hooks/useSystemSettings";
import BrowserNativeSTT from "./BrowserNative";
import ServerSTT from "./ServerSTT";

/**
 * Speech-to-text input dispatcher for the chat window. Loads the configured
 * provider once and renders either the browser-native implementation or the
 * server-side implementation that uploads audio to a remote STT service.
 * @param {Object} props - The component props
 * @param {(textToAppend: string, autoSubmit: boolean) => void} props.sendCommand - The function to send the command
 * @returns {React.ReactElement|null} The SpeechToText component
 */
export default function SpeechToText({ sendCommand }) {
  const { settings, loading } = useSystemSettings();
  const provider = settings?.SpeechToTextProvider || "native";

  if (loading) return null;
  if (provider === "native")
    return <BrowserNativeSTT sendCommand={sendCommand} />;
  return <ServerSTT sendCommand={sendCommand} />;
}
