// SPDX-License-Identifier: MIT
// Purpose: Renders the ordered list of configurable agent-flow blocks in the Agent Builder.
// Docs: BlockList.doc.md
import React from "react";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { CaretUp } from "@phosphor-icons/react/dist/csr/CaretUp";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { Globe } from "@phosphor-icons/react/dist/csr/Globe";
import { Browser } from "@phosphor-icons/react/dist/csr/Browser";
import { File } from "@phosphor-icons/react/dist/csr/File";
import { Code } from "@phosphor-icons/react/dist/csr/Code";
import { Brain } from "@phosphor-icons/react/dist/csr/Brain";
import { Flag } from "@phosphor-icons/react/dist/csr/Flag";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
import { BracketsCurly } from "@phosphor-icons/react/dist/csr/BracketsCurly";
import { Tooltip } from "react-tooltip";
import { useTranslation } from "react-i18next";
import Toggle from "@/components/lib/Toggle";
import StartNode from "../nodes/StartNode";
import ApiCallNode from "../nodes/ApiCallNode";
import WebsiteNode from "../nodes/WebsiteNode";
import FileNode from "../nodes/FileNode";
import CodeNode from "../nodes/CodeNode";
import LLMInstructionNode from "../nodes/LLMInstructionNode";
import FinishNode from "../nodes/FinishNode";
import WebScrapingNode from "../nodes/WebScrapingNode";
import FlowInfoNode from "../nodes/FlowInfoNode";

const BLOCK_ICON_CLASS = "w-4 h-4 text-white";

export const BLOCK_TYPES = {
  FLOW_INFO: "flowInfo",
  START: "start",
  API_CALL: "apiCall",
  WEBSITE: "website",
  FILE: "file",
  CODE: "code",
  LLM_INSTRUCTION: "llmInstruction",
  WEB_SCRAPING: "webScraping",
  FINISH: "finish",
} as const;

type BlockType = (typeof BLOCK_TYPES)[keyof typeof BLOCK_TYPES];

type BlockConfig = {
  [key: string]: any;
};

interface Block {
  id: string;
  type: BlockType | string;
  config: BlockConfig;
  isExpanded: boolean;
}

interface BlockInfoEntry {
  label: string;
  icon: React.ReactElement;
  description?: string;
  defaultConfig?: BlockConfig;
  getSummary?: (config: BlockConfig) => React.ReactNode;
  renderConfig?: (config: BlockConfig) => React.ReactNode;
}

interface BlockListProps {
  blocks: Block[];
  updateBlockConfig: (blockId: string, config: Partial<BlockConfig>) => void;
  removeBlock: (blockId: string) => void;
  toggleBlockExpansion: (blockId: string) => void;
  renderVariableSelect: (
    value: any,
    onChange: (value: string) => void,
    placeholder?: string,
    isMenu?: boolean,
  ) => React.ReactNode;
  onDeleteVariable: (variableName: string) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  refs: {
    nameRef: React.RefObject<HTMLInputElement | null>;
    descriptionRef: React.RefObject<HTMLInputElement | null>;
  };
}

const BLOCK_INFO: Record<BlockType, BlockInfoEntry> = {
  [BLOCK_TYPES.FLOW_INFO]: {
    label: "Flow Information",
    icon: <Info className="w-5 h-5 text-theme-text-primary" />,
    description: "Basic flow information",
    defaultConfig: {
      name: "",
      description: "",
    },
    getSummary: (config) => config.name || "Untitled Flow",
  },
  [BLOCK_TYPES.START]: {
    label: "Flow Variables",
    icon: <BracketsCurly className="w-5 h-5 text-theme-text-primary" />,
    description: "Configure agent variables and settings",
    getSummary: (config) => {
      const varCount =
        config.variables?.filter((v: any) => v.name)?.length || 0;
      return `${varCount} variable${varCount !== 1 ? "s" : ""} defined`;
    },
  },
  [BLOCK_TYPES.API_CALL]: {
    label: "API Call",
    icon: <Globe className="w-5 h-5 text-theme-text-primary" />,
    description: "Make an HTTP request",
    defaultConfig: {
      url: "",
      method: "GET",
      headers: [],
      bodyType: "json",
      body: "",
      formData: [],
      responseVariable: "",
      directOutput: false,
    },
    getSummary: (config) =>
      `${config.method || "GET"} ${config.url || "(no URL)"}`,
  },
  [BLOCK_TYPES.WEBSITE]: {
    label: "Open Website",
    icon: <Browser className="w-5 h-5 text-theme-text-primary" />,
    description: "Navigate to a URL",
    defaultConfig: {
      url: "",
      selector: "",
      action: "read",
      value: "",
      resultVariable: "",
    },
    getSummary: (config) =>
      `${config.action || "read"} from ${config.url || "(no URL)"}`,
  },
  [BLOCK_TYPES.FILE]: {
    label: "Open File",
    icon: <File className="w-5 h-5 text-theme-text-primary" />,
    description: "Read or write to a file",
    defaultConfig: {
      path: "",
      operation: "read",
      content: "",
      resultVariable: "",
    },
    getSummary: (config) =>
      `${config.operation || "read"} ${config.path || "(no path)"}`,
  },
  [BLOCK_TYPES.CODE]: {
    label: "Code Execution",
    icon: <Code className="w-5 h-5 text-theme-text-primary" />,
    description: "Execute code snippets",
    defaultConfig: {
      language: "javascript",
      code: "",
      resultVariable: "",
    },
    getSummary: (config) => `Run ${config.language || "javascript"} code`,
  },
  [BLOCK_TYPES.LLM_INSTRUCTION]: {
    label: "LLM Instruction",
    icon: <Brain className="w-5 h-5 text-theme-text-primary" />,
    description: "Process data using LLM instructions",
    defaultConfig: {
      instruction: "",
      resultVariable: "",
      directOutput: false,
    },
    getSummary: (config) => config.instruction || "No instruction",
  },
  [BLOCK_TYPES.WEB_SCRAPING]: {
    label: "Web Scraping",
    icon: <Browser className="w-5 h-5 text-theme-text-primary" />,
    description: "Scrape content from a webpage",
    defaultConfig: {
      url: "",
      captureAs: "text",
      querySelector: "",
      resultVariable: "",
      directOutput: false,
    },
    getSummary: (config) => config.url || "No URL specified",
  },
  [BLOCK_TYPES.FINISH]: {
    label: "Flow Complete",
    icon: <Flag className="w-4 h-4" />,
    description: "End of agent flow",
    getSummary: () => "Flow will end here",
    defaultConfig: {},
    renderConfig: () => null,
  },
};

const UNKNOWN_BLOCK: BlockInfoEntry = {
  icon: <span className="w-4 h-4" />,
  label: "Unknown Block",
  getSummary: () => "Unknown block type",
};

export default function BlockList({
  blocks,
  updateBlockConfig,
  removeBlock,
  toggleBlockExpansion,
  renderVariableSelect,
  onDeleteVariable,
  moveBlock,
  refs,
}: BlockListProps): JSX.Element {
  const { t } = useTranslation();
  const renderBlockConfig = (block: Block): React.ReactNode => {
    const isLastConfigurableBlock = blocks[blocks.length - 2]?.id === block.id;
    const props = {
      config: block.config,
      onConfigChange: (config: Partial<BlockConfig>) =>
        updateBlockConfig(block.id, config),
      renderVariableSelect,
      onDeleteVariable,
    };

    // Direct output switch to the last configurable block before finish
    if (
      isLastConfigurableBlock &&
      block.type !== BLOCK_TYPES.START &&
      block.type !== BLOCK_TYPES.FLOW_INFO
    ) {
      return (
        <div className="space-y-4">
          {renderBlockConfigContent(block, props)}
          <div className="pt-4 border-t border-white/10">
            <Toggle
              size="md"
              variant="horizontal"
              label={t("agentBuilder.blockList.directOutput")}
              description={t("agentBuilder.blockList.directOutputDescription")}
              enabled={props.config.directOutput || false}
              onChange={(checked: boolean) =>
                props.onConfigChange({
                  ...props.config,
                  directOutput: checked,
                })
              }
            />
          </div>
        </div>
      );
    }

    return renderBlockConfigContent(block, props);
  };

  const renderBlockConfigContent = (
    block: Block,
    props: {
      config: BlockConfig;
      onConfigChange: (config: Partial<BlockConfig>) => void;
      renderVariableSelect: BlockListProps["renderVariableSelect"];
      onDeleteVariable: (variableName: string) => void;
    },
  ): React.ReactNode => {
    switch (block.type) {
      case BLOCK_TYPES.FLOW_INFO:
        return <FlowInfoNode {...({ ...props, ref: refs } as any)} />;
      case BLOCK_TYPES.START:
        return <StartNode {...(props as any)} />;
      case BLOCK_TYPES.API_CALL:
        return <ApiCallNode {...props} />;
      case BLOCK_TYPES.WEBSITE:
        return <WebsiteNode {...props} />;
      case BLOCK_TYPES.FILE:
        return <FileNode {...props} />;
      case BLOCK_TYPES.CODE:
        return <CodeNode {...props} />;
      case BLOCK_TYPES.LLM_INSTRUCTION:
        return <LLMInstructionNode {...props} />;
      case BLOCK_TYPES.WEB_SCRAPING:
        return <WebScrapingNode {...(props as any)} />;
      case BLOCK_TYPES.FINISH:
        return <FinishNode />;
      default:
        return <div>{t("agentBuilder.blockList.configurationComingSoon")}</div>;
    }
  };

  return (
    <div className="space-y-1">
      {blocks.map((block, index) => {
        const info = BLOCK_INFO[block.type as BlockType] || UNKNOWN_BLOCK;
        return (
          <div key={block.id} className="flex flex-col">
            <div
              className={`bg-theme-action-menu-bg border border-white/10 rounded-lg overflow-hidden transition-all duration-300 ${
                block.isExpanded ? "w-full" : "w-[280px] mx-auto"
              }`}
            >
              <div
                onClick={() => toggleBlockExpansion(block.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-theme-action-menu-item-hover transition-colors duration-300 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/10 light:bg-white flex items-center justify-center">
                    {React.cloneElement(info.icon, {
                      className: BLOCK_ICON_CLASS,
                    })}
                  </div>
                  <div className="flex-1 text-left min-w-0 max-w-[115px]">
                    <span className="text-sm font-medium text-theme-text-primary block">
                      {info.label}
                    </span>
                    {!block.isExpanded && (
                      <p className="text-xs text-theme-text-secondary truncate">
                        {info.getSummary?.(block.config)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  {block.id !== "start" &&
                    block.type !== BLOCK_TYPES.FINISH &&
                    block.type !== BLOCK_TYPES.FLOW_INFO && (
                      <div className="flex items-center gap-1">
                        {index > 2 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveBlock(index, index - 1);
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-theme-bg-primary border border-white/5 text-theme-text-primary hover:bg-theme-action-menu-item-hover transition-colors duration-300"
                            data-tooltip-id="block-action"
                            data-tooltip-content={t(
                              "agentBuilder.blockList.moveBlockUp",
                            )}
                          >
                            <CaretUp className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {index < blocks.length - 2 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveBlock(index, index + 1);
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-theme-bg-primary border border-white/5 text-theme-text-primary hover:bg-theme-action-menu-item-hover transition-colors duration-300"
                            data-tooltip-id="block-action"
                            data-tooltip-content={t(
                              "agentBuilder.blockList.moveBlockDown",
                            )}
                          >
                            <CaretDown className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeBlock(block.id);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-theme-bg-primary border border-white/5 text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-colors duration-300"
                          data-tooltip-id="block-action"
                          data-tooltip-content={t(
                            "agentBuilder.blockList.deleteBlock",
                          )}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                </div>
              </div>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  block.isExpanded
                    ? "max-h-[1000px] opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="border-t border-white/10 p-4 bg-theme-bg-secondary rounded-b-lg">
                  {renderBlockConfig(block)}
                </div>
              </div>
            </div>
            {index < blocks.length - 1 && (
              <div className="flex justify-center my-1">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-theme-placeholder light:invert"
                >
                  <path
                    d="M12 4L12 20M12 20L6 14M12 20L18 14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>
        );
      })}
      <Tooltip
        id="block-action"
        place="bottom"
        delayShow={300}
        className="tooltip !text-xs"
      />
    </div>
  );
}

export { BLOCK_INFO };
export type { Block, BlockConfig, BlockType };
