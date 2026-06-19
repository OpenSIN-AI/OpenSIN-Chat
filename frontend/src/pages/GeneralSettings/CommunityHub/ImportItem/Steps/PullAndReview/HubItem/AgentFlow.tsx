// SPDX-License-Identifier: MIT
// Purpose: Agent flow import review
// Docs: AgentFlow.doc.md
import CTAButton from "@/components/lib/CTAButton";
import CommunityHubImportItemSteps from "../..";
import showToast from "@/utils/toast";
import paths from "@/utils/paths";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import { useState } from "react";
import AgentFlows from "@/models/agentFlows";
import { safeJsonParse } from "@/utils/request";
import { useTranslation } from "react-i18next";

interface AgentFlowProps {
  item: any;
  setStep: (step: string) => void;
}

export default function AgentFlow({
  item,
  setStep,
}: AgentFlowProps): React.ReactElement {
  const { t } = useTranslation();
  const flowInfo = safeJsonParse(item.flow, { steps: [] });
  const [loading, setLoading] = useState<boolean>(false);

  async function importAgentFlow(): Promise<void> {
    try {
      setLoading(true);
      const { success, error, flow } = await AgentFlows.saveFlow(
        item.name,
        flowInfo,
      );
      if (!success) throw new Error(error);
      if (!!flow?.uuid) await AgentFlows.toggleFlow(flow.uuid, true);

      showToast(t("communityHub.import.agentFlow.toast.success"), "success");
      setStep(CommunityHubImportItemSteps.completed.key);
    } catch (e: any) {
      console.error(e);
      showToast(
        t("communityHub.import.agentFlow.toast.failed", { message: e.message }),
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col mt-4 gap-y-4">
      <div className="flex flex-col gap-y-1">
        <h2 className="text-base text-theme-text-primary font-semibold">
          {t("communityHub.import.agentFlow.title", { name: item.name })}
        </h2>
        {item.creatorUsername && (
          <p className="text-white/60 light:text-theme-text-secondary text-xs font-mono">
            {t("communityHub.import.agentFlow.createdBy")}{" "}
            <a
              href={paths.communityHub.profile(item.creatorUsername)}
              target="_blank"
              className="hover:text-blue-500 hover:underline"
              rel="noreferrer"
            >
              {`@${item.creatorUsername}`}
            </a>
          </p>
        )}
      </div>
      <div className="flex flex-col gap-y-[25px] text-white/80 light:text-theme-text-secondary text-sm">
        <p>{t("communityHub.import.agentFlow.description")}</p>
        <div className="flex flex-col gap-y-2">
          <p className="font-semibold">
            {t("communityHub.import.agentFlow.flowDetails")}
          </p>
          <p>
            {t("communityHub.import.agentFlow.descriptionLabel")}{" "}
            {item.description}
          </p>
          <p className="font-semibold">
            {t("communityHub.import.agentFlow.stepsLabel", {
              count: flowInfo.steps.length,
            })}
          </p>
          <ul className="list-disc pl-6">
            {flowInfo.steps.map((step: any, index: number) => (
              <li key={index}>{step.type}</li>
            ))}
          </ul>
        </div>
      </div>
      <CTAButton
        disabled={loading}
        className="text-dark-text w-full mt-[18px] h-[34px] hover:bg-accent"
        onClick={importAgentFlow}
      >
        {loading ? <CircleNotch size={16} className="animate-spin" /> : null}
        {loading
          ? t("communityHub.import.agentFlow.importing")
          : t("communityHub.import.agentFlow.importButton")}
      </CTAButton>
    </div>
  );
}
