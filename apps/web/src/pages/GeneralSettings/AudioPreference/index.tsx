// SPDX-License-Identifier: MIT
import Sidebar from "@/components/SettingsSidebar";
import PreLoader from "@/components/Preloader";
import SpeechToTextProvider from "./stt";
import TextToSpeechProvider from "./tts";
import useSystemSettings from "@/hooks/useSystemSettings";
import AdminContentPanel from "@/components/AdminContentPanel";

export default function AudioPreference() {
  const { settings, loading } = useSystemSettings();

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      {loading ? (
        <AdminContentPanel>
          <div className="w-full h-full flex justify-center items-center">
            <PreLoader />
          </div>
        </AdminContentPanel>
      ) : (
        <AdminContentPanel>
          <SpeechToTextProvider settings={settings} />
          <TextToSpeechProvider settings={settings} />
        </AdminContentPanel>
      )}
    </div>
  );
}
