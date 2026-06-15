// SPDX-License-Identifier: MIT
// Docs: FlowPanel.doc.md
import React, { useState, useEffect, useRef } from "react";
import AgentFlows from "@/models/agentFlows";
import showToast from "@/utils/toast";
import { FlowArrow, Gear } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import paths from "@/utils/paths";
import { useTranslation } from "react-i18next";
import Toggle from "@/components/lib/Toggle";

type Flow = {
  uuid: string;
  name: string;
  description?: string;
};

type ManageFlowMenuProps = {
  flow: Flow;
  onDelete: (uuid: string) => void;
};

function ManageFlowMenu({ flow, onDelete }: ManageFlowMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  async function deleteFlow() {
    setOpen(false);
    if (!window.confirm(t("agentFlows.confirmDelete"))) return;
    const { success, error } = await AgentFlows.deleteFlow(flow.uuid);
    if (success) {
      showToast(t("agentFlows.flowDeleted"), "success");
      onDelete(flow.uuid);
    } else {
      showToast(error || t("agentFlows.deleteFailed"), "error");
    }
  }

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg text-white hover:bg-theme-action-menu-item-hover transition-colors duration-300"
      >
        <Gear className="h-5 w-5" weight="bold" />
      </button>
      {open && (
        <div className="absolute min-w-[140px] top-full right-0 mt-1 border-[1.5px] border-white/40 rounded-lg bg-theme-action-menu-bg flex flex-col shadow-[0_4px_14px_rgba(0,0,0,0.25)] text-white z-99 md:z-10">
          <button
            type="button"
            onClick={() => navigate(paths.agents.editAgent(flow.uuid))}
            className="border-none flex items-center rounded-lg gap-x-2 hover:bg-theme-action-menu-item-hover py-1.5 px-2 transition-colors duration-200 w-full text-left"
          >
            <span className="text-sm whitespace-nowrap">
              {t("agentFlows.editFlow")}
            </span>
          </button>
          <button
            type="button"
            onClick={deleteFlow}
            className="border-none flex items-center rounded-lg gap-x-2 hover:bg-theme-action-menu-item-hover py-1.5 px-2 transition-colors duration-200 w-full text-left"
          >
            <span className="text-sm whitespace-nowrap">
              {t("agentFlows.deleteFlow")}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

type FlowPanelProps = {
  flow: Flow;
  toggleFlow: (uuid: string) => void;
  enabled: boolean;
  onDelete: (uuid: string) => void;
};

export default function FlowPanel({
  flow,
  toggleFlow,
  enabled,
  onDelete,
}: FlowPanelProps): JSX.Element {
  const { t } = useTranslation();
  const handleToggle = async () => {
    try {
      const { success, error } = await AgentFlows.toggleFlow(
        flow.uuid,
        !enabled,
      );
      if (!success) throw new Error(error);
      toggleFlow(flow.uuid);
    } catch (error) {
      console.error("Failed to toggle flow:", error);
      showToast(t("agentFlows.toggleFailed"), "error", { clear: true });
    }
  };

  return (
    <>
      <div className="p-2">
        <div className="flex flex-col gap-y-[18px] max-w-[500px]">
          <div className="flex w-full justify-between items-center">
            <div className="flex items-center gap-x-2">
              <FlowArrow size={24} weight="bold" className="text-white" />
              <label htmlFor="name" className="text-white text-md font-bold">
                {flow.name}
              </label>
            </div>
            <div className="flex items-center gap-x-2">
              <Toggle size="lg" enabled={enabled} onChange={handleToggle} />
              <ManageFlowMenu flow={flow} onDelete={onDelete} />
            </div>
          </div>
          <p className="whitespace-pre-wrap text-white text-opacity-60 text-xs font-medium py-1.5">
            {flow.description || t("agentFlows.noDescription")}
          </p>
        </div>
      </div>
    </>
  );
}