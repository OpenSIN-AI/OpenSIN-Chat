// SPDX-License-Identifier: MIT
import React from "react";
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
        </div>
      ) : (
        <AdminContentPanel>
          <SpeechToTextProvider settings={settings} />
          <TextToSpeechProvider settings={settings} />
        </div>
      )}
    </div>
  );
}
