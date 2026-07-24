// SPDX-License-Identifier: MIT
// Purpose: Page component for building and editing agent flows.
// Docs: AgentBuilder.doc.md
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { Tooltip } from "react-tooltip";

import BlockList, { BLOCK_TYPES, BLOCK_INFO } from "./BlockList";
import type { Block, BlockConfig } from "./BlockList";
import AddBlockMenu from "./AddBlockMenu";
import showToast from "@/utils/toast";
import AgentFlows from "@/models/agentFlows";
import { useTheme } from "@/hooks/useTheme";
import HeaderMenu from "./HeaderMenu";
import paths from "@/utils/paths";
import logger from "@/utils/logger";

interface FlowStep {
  type: string;
  config: BlockConfig;
}

interface FlowConfig {
  name: string;
  description: string;
  active: boolean;
  steps: FlowStep[];
}

interface Flow {
  uuid: string;
  config: FlowConfig;
  [key: string]: any;
}

const DEFAULT_BLOCKS: Block[] = [
  {
    id: "flow_info",
    type: BLOCK_TYPES.FLOW_INFO,
    config: {
      name: "",
      description: "",
    },
    isExpanded: true,
  },
  {
    id: "start",
    type: BLOCK_TYPES.START,
    config: {
      variables: [{ name: "", value: "" }],
    },
    isExpanded: true,
  },
  {
    id: "finish",
    type: BLOCK_TYPES.FINISH,
    config: {},
    isExpanded: false,
  },
];

export default function AgentBuilder(): JSX.Element {
  const { t } = useTranslation();
  const { flowId } = useParams<{ flowId?: string }>();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [agentName, setAgentName] = useState("");
  const [, setAgentDescription] = useState("");
  const [currentFlowUuid, setCurrentFlowUuid] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [blocks, setBlocks] = useState<Block[]>(DEFAULT_BLOCKS);
  const [selectedBlock, setSelectedBlock] = useState("start");
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [availableFlows, setAvailableFlows] = useState<Flow[]>([]);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const descriptionRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadAvailableFlows();
  }, []);

  useEffect(() => {
    if (!flowId) return;
    let cancelled = false;
    (async () => {
      try {
        const { success, error, flow } = await AgentFlows.getFlow(flowId);
        if (cancelled) return;
        if (!success) throw new Error(error);

        const flowBlocks: Block[] = [
          {
            id: "flow_info",
            type: BLOCK_TYPES.FLOW_INFO,
            config: {
              name: flow.config.name,
              description: flow.config.description,
            },
            isExpanded: true,
          },
          ...flow.config.steps.map((step: FlowStep, index: number) => ({
            id: index === 0 ? "start" : `block_${index}`,
            type: step.type,
            config: step.config,
            isExpanded: true,
          })),
        ];

        if (flowBlocks[flowBlocks.length - 1]?.type !== BLOCK_TYPES.FINISH) {
          flowBlocks.push({
            id: "finish",
            type: BLOCK_TYPES.FINISH,
            config: {},
            isExpanded: false,
          });
        }

        if (cancelled) return;
        setAgentName(flow.config.name);
        setAgentDescription(flow.config.description);
        setActive(flow.config.active ?? true);
        setCurrentFlowUuid(flow.uuid);
        setBlocks(flowBlocks);
      } catch (error) {
        if (cancelled) return;
        logger.error(error);
        showToast(t("agentBuilder.loadFlowFailed"), "error", { clear: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [flowId]);

  useEffect(() => {
    const flowInfoBlock = blocks.find(
      (block) => block.type === BLOCK_TYPES.FLOW_INFO,
    );
    setAgentName(flowInfoBlock?.config?.name || "");
  }, [blocks]);

  const loadAvailableFlows = async () => {
    try {
      const { success, error, flows } = await AgentFlows.listFlows();
      if (!success) throw new Error(error);
      setAvailableFlows(flows);
    } catch (error) {
      logger.error(error);
      showToast(t("agentBuilder.loadFlowsFailed"), "error", { clear: true });
    }
  };

  const addBlock = (type: string) => {
    const newBlock: Block = {
      id: `block_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      config: { ...BLOCK_INFO[type as keyof typeof BLOCK_INFO]?.defaultConfig },
      isExpanded: true,
    };
    setBlocks((prev) => {
      const newBlocks = [...prev];
      newBlocks.splice(newBlocks.length - 1, 0, newBlock);
      return newBlocks;
    });
    setShowBlockMenu(false);
  };

  const updateBlockConfig = (blockId: string, config: Partial<BlockConfig>) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? { ...block, config: { ...block.config, ...config } }
          : block,
      ),
    );
  };

  const removeBlock = (blockId: string) => {
    if (blockId === "start") return;
    setBlocks((prev) => prev.filter((block) => block.id !== blockId));
    if (selectedBlock === blockId) {
      setSelectedBlock("start");
    }
  };

  const saveFlow = async () => {
    const flowInfoBlock = blocks.find(
      (block) => block.type === BLOCK_TYPES.FLOW_INFO,
    );
    const name = flowInfoBlock?.config?.name;
    const description = flowInfoBlock?.config?.description;

    if (!name?.trim() || !description?.trim()) {
      // Make sure the flow info block is expanded first
      if (!flowInfoBlock?.isExpanded) {
        setBlocks(
          blocks.map((block) =>
            block.type === BLOCK_TYPES.FLOW_INFO
              ? { ...block, isExpanded: true }
              : block,
          ),
        );
        // Small delay to allow expansion animation to complete
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (!name?.trim()) {
        nameRef.current?.focus();
      } else if (!description?.trim()) {
        descriptionRef.current?.focus();
      }
      showToast(t("agentBuilder.nameAndDescriptionRequired"), "error", {
        clear: true,
      });
      return;
    }

    const flowConfig: FlowConfig = {
      name,
      description,
      active,
      steps: blocks
        .filter(
          (block) =>
            block.type !== BLOCK_TYPES.FINISH &&
            block.type !== BLOCK_TYPES.FLOW_INFO,
        )
        .map((block) => ({
          type: block.type,
          config: block.config,
        })),
    };

    try {
      const { success, error, flow } = await AgentFlows.saveFlow(
        name,
        flowConfig,
        currentFlowUuid,
      );
      if (!success) throw new Error(error);

      setCurrentFlowUuid(flow.uuid);
      showToast(t("agentBuilder.flowSavedSuccess"), "success", { clear: true });
      await loadAvailableFlows();
    } catch (error: any) {
      logger.error("Save error details:", error);
      showToast(
        t("agentBuilder.saveFlowFailed", { error: error.message }),
        "error",
        {
          clear: true,
        },
      );
    }
  };

  const toggleBlockExpansion = (blockId: string) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? { ...block, isExpanded: !block.isExpanded }
          : block,
      ),
    );
  };

  // Get all available variables from the start block
  const getAvailableVariables = () => {
    const startBlock = blocks.find((b) => b.type === BLOCK_TYPES.START);
    return startBlock?.config?.variables?.filter((v: any) => v.name) || [];
  };

  const renderVariableSelect = (
    value: any,
    onChange: (value: string) => void,
    placeholder = t("agentBuilder.selectVariable"),
  ) => (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border-none bg-theme-settings-input-bg text-theme-text-primary text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none p-2.5"
    >
      <option value="" className="bg-theme-bg-primary">
        {placeholder}
      </option>
      {getAvailableVariables().map((v: any) => (
        <option key={v.name} value={v.name} className="bg-theme-bg-primary">
          {v.name}
        </option>
      ))}
    </select>
  );

  const deleteVariable = (variableName: string) => {
    // Clean up references in other blocks
    blocks.forEach((block) => {
      if (block.type === BLOCK_TYPES.START) return;

      let configUpdated = false;
      const newConfig = { ...block.config };

      // Check and clean responseVariable/resultVariable
      if (newConfig.responseVariable === variableName) {
        newConfig.responseVariable = "";
        configUpdated = true;
      }
      if (newConfig.resultVariable === variableName) {
        newConfig.resultVariable = "";
        configUpdated = true;
      }

      if (configUpdated) {
        updateBlockConfig(block.id, newConfig);
      }
    });
  };

  const clearFlow = () => {
    if (!!flowId) navigate(paths.agents.builder());
    setAgentName("");
    setAgentDescription("");
    setCurrentFlowUuid(null);
    setActive(true);
    setBlocks(DEFAULT_BLOCKS);
  };

  const moveBlock = (fromIndex: number, toIndex: number) => {
    setBlocks((prev) => {
      const newBlocks = [...prev];
      const [movedBlock] = newBlocks.splice(fromIndex, 1);
      newBlocks.splice(toIndex, 0, movedBlock);
      return newBlocks;
    });
  };

  return (
    <div
      className={`relative w-screen h-screen flex flex-col bg-theme-bg-primary overflow-clip bg-[length:15px_15px] bg-[position:-7.5px_-7.5px] ${
        theme === "light"
          ? "bg-[radial-gradient(rgba(0,_0,_0,_0.1)_1px,_transparent_0)]"
          : "bg-[radial-gradient(rgba(255,_255,_255,_0.1)_1px,_transparent_0)]"
      }`}
    >
      <HeaderMenu
        agentName={agentName}
        availableFlows={availableFlows}
        onNewFlow={clearFlow}
        onSaveFlow={saveFlow}
        onPublishFlow={saveFlow}
      />
      <div className="flex-1 min-h-0 p-6 overflow-y-auto">
        <div
          className={`max-w-xl mx-auto mt-14 ${showBlockMenu ? "pb-52" : ""}`}
        >
          <BlockList
            blocks={blocks}
            updateBlockConfig={updateBlockConfig}
            removeBlock={removeBlock}
            toggleBlockExpansion={toggleBlockExpansion}
            renderVariableSelect={renderVariableSelect}
            onDeleteVariable={deleteVariable}
            moveBlock={moveBlock}
            refs={{ nameRef, descriptionRef }}
          />

          <AddBlockMenu
            blocks={blocks}
            showBlockMenu={showBlockMenu}
            setShowBlockMenu={setShowBlockMenu}
            addBlock={addBlock}
          />
        </div>
      </div>
      <Tooltip
        id="content-summarization-tooltip"
        place="top"
        delayShow={300}
        className="tooltip !text-xs z-[99]"
      >
        <p className="text-sm">
          {t("agentBuilder.summarizeDescription")}
          <br />
          <br />
          {t("agentBuilder.summarizeNote")}
        </p>
      </Tooltip>
    </div>
  );
}
