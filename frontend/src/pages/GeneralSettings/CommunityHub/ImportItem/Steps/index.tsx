// SPDX-License-Identifier: MIT
import { isMobile } from "react-device-detect";
import { useEffect, useState } from "react";
import Sidebar from "@/components/SettingsSidebar";
import Introduction from "./Introduction";
import PullAndReview from "./PullAndReview";
import Completed from "./Completed";
import useQuery from "@/hooks/useQuery";

const CommunityHubImportItemSteps = {
  itemId: {
    key: "itemId",
    name: "1. Paste in Item ID",
    next: () => "validation",
    component: ({
      settings,
      setSettings,
      setStep,
    }: {
      settings: any;
      setSettings: any;
      setStep: any;
    }) => (
      <Introduction
        settings={settings}
        setSettings={setSettings}
        setStep={setStep}
      />
    ),
  },
  validation: {
    key: "validation",
    name: "2. Review item",
    next: () => "completed",
    component: ({
      settings,
      setSettings,
      setStep,
    }: {
      settings: any;
      setSettings: any;
      setStep: any;
    }) => (
      <PullAndReview
        settings={settings}
        setSettings={setSettings}
        setStep={setStep}
      />
    ),
  },
  completed: {
    key: "completed",
    name: "3. Completed",
    component: ({
      settings,
      setSettings,
      setStep,
    }: {
      settings: any;
      setSettings: any;
      setStep: any;
    }) => (
      <Completed
        settings={settings}
        setSettings={setSettings}
        setStep={setStep}
      />
    ),
  },
};

export function CommunityHubImportItemLayout({
  setStep,
  children,
}: {
  setStep: (step: string) => void;
  children: (settings: any, setSettings: any, setStep: any) => React.ReactNode;
}) {
  const query = useQuery();
  const [settings, setSettings] = useState({
    itemId: null as string | null,
    item: null as any,
  });

  useEffect(() => {
    function autoForward() {
      if (query.get("id")) {
        setSettings({ itemId: query.get("id") });
        setStep(CommunityHubImportItemSteps.itemId.next());
      }
    }
    autoForward();
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      <div
        style={{ "--content-height": isMobile ? "100%" : "calc(100% - 32px)" }}
        className="h-[var(--content-height)] relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] w-full overflow-y-scroll p-4 md:p-0"
      >
        {children(settings, setSettings, setStep)}
      </div>
    </div>
  );
}

export default CommunityHubImportItemSteps;
