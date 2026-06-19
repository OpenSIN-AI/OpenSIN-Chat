// SPDX-License-Identifier: MIT
// Docs: ToolCallCard.doc.md
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Wrench } from "@phosphor-icons/react";
import hljs from "highlight.js";
import { safeJsonParse } from "@/utils/request";
import { useTheme } from "@/hooks/useTheme";
import DOMPurify from "@/utils/chat/purify";
import { truncate } from "@/utils/strings";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(localizedFormat);

const MAX_RESULT_LENGTH = 5000;

/**
 * Get the appropriate highlight.js theme based on the theme.
 */
function getHljsTheme(isLight: boolean): string {
  return isLight ? "github" : "github-dark";
}

/**
 * Try to render `value` as syntax-highlighted JSON. Returns a `dangerouslySetInnerHTML`
 * payload, or null if the value isn't an object (caller should fall back to plain text).
 */
function formatAndHighlight(value: any): { __html: string } | null {
  const parsed =
    typeof value === "string" ? safeJsonParse(value, value) : value;
  if (typeof parsed !== "object" || parsed === null) return null;

  const formatted = JSON.stringify(parsed, null, 2);
  const truncatedFormatted = truncate(formatted, MAX_RESULT_LENGTH);
  const highlighted = hljs.highlight(truncatedFormatted, {
    language: "json",
  }).value;
  return { __html: DOMPurify.sanitize(highlighted) };
}

type ToolCall = {
  toolName: string;
  timestamp?: string;
  arguments?: any;
  result?: any;
};

type ToolCallCardProps = {
  toolCall: ToolCall;
};

/**
 * Single tool call inside the run trace. Shows the tool name, arguments, and
 * (on demand) the tool's result. JSON arguments and results are pretty-printed
 * and syntax-highlighted; non-JSON values fall back to plain text.
 */
export default function ToolCallCard({
  toolCall,
}: ToolCallCardProps): JSX.Element {
  const [showResult, setShowResult] = useState(false);
  return (
    <div className="border border-white/5 rounded-lg p-3 bg-theme-bg-primary/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Wrench className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-sm font-medium text-theme-text-primary">
            {toolCall.toolName}
          </span>
        </div>
        <ToolCallTimestamp toolCall={toolCall} />
      </div>
      <ToolCallArguments toolCall={toolCall} />
      <ToolCallResult
        toolCall={toolCall}
        showResult={showResult}
        setShowResult={setShowResult}
      />
    </div>
  );
}

type ToolCallTimestampProps = {
  toolCall: ToolCall;
};

function ToolCallTimestamp({
  toolCall,
}: ToolCallTimestampProps): JSX.Element | null {
  if (!toolCall.timestamp) return null;
  const formatted = dayjs(toolCall.timestamp).format("LTS");
  return <span className="text-xs text-theme-text-secondary">{formatted}</span>;
}

type ToolCallArgumentsProps = {
  toolCall: ToolCall;
};

function ToolCallArguments({
  toolCall,
}: ToolCallArgumentsProps): JSX.Element | null {
  const { t } = useTranslation();
  const { isLight } = useTheme();
  if (!toolCall.arguments) return null;

  const highlightedArgs = formatAndHighlight(toolCall.arguments);
  return (
    <div className="mb-2">
      <span className="text-xs text-theme-text-secondary">
        {t("scheduledJobs.toolCall.arguments")}
      </span>
      {highlightedArgs ? (
        <pre
          className={`text-xs rounded-lg p-2 mt-1 overflow-x-auto white-scrollbar tool-call-scrollbar hljs ${getHljsTheme(isLight)}`}
          dangerouslySetInnerHTML={highlightedArgs}
        />
      ) : (
        <pre className="text-xs text-theme-text-primary bg-theme-bg-primary/50 rounded p-2 mt-1 overflow-x-auto white-scrollbar tool-call-scrollbar">
          {typeof toolCall.arguments === "string"
            ? toolCall.arguments
            : JSON.stringify(toolCall.arguments, null, 2)}
        </pre>
      )}
    </div>
  );
}

type ToolCallResultProps = {
  toolCall: ToolCall;
  showResult: boolean;
  setShowResult: (show: boolean) => void;
};

function ToolCallResult({
  toolCall,
  showResult,
  setShowResult,
}: ToolCallResultProps): JSX.Element | null {
  const { t } = useTranslation();
  const { isLight } = useTheme();
  if (!toolCall.result) return null;

  const resultText =
    typeof toolCall.result === "string"
      ? toolCall.result
      : JSON.stringify(toolCall.result, null, 2);
  const truncatedResult = truncate(resultText, MAX_RESULT_LENGTH);
  const highlightedResult = formatAndHighlight(resultText);

  if (!resultText) return null;
  return (
    <div>
      <button
        type="button"
        onClick={() => setShowResult(!showResult)}
        className="border-none text-xs text-blue-400 hover:text-blue-300 transition-colors"
      >
        {showResult
          ? t("scheduledJobs.toolCall.hideResult")
          : t("scheduledJobs.toolCall.showResult")}
      </button>
      {showResult &&
        (highlightedResult ? (
          <pre
            className={`text-xs rounded-lg p-2 mt-1 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap white-scrollbar tool-call-scrollbar hljs ${getHljsTheme(isLight)}`}
            dangerouslySetInnerHTML={highlightedResult}
          />
        ) : (
          <pre className="text-xs text-theme-text-primary bg-theme-bg-primary/50 rounded p-2 mt-1 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap white-scrollbar tool-call-scrollbar">
            {truncatedResult}
          </pre>
        ))}
    </div>
  );
}
