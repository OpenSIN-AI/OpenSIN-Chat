// SPDX-License-Identifier: MIT
import { useState, useRef, Fragment, useEffect } from "react";
import { getWorkspaceSystemPrompt } from "@/utils/chat";
import { useTranslation } from "react-i18next";
import Highlighter from "react-highlight-words";

const VARIABLE_SEPARATOR = ", ";
import { Link, useSearchParams } from "react-router-dom";
import paths from "@/utils/paths";
import ChatPromptHistory from "./ChatPromptHistory";
import System from "@/models/system";
import useSystemPromptVariables from "@/hooks/useSystemPromptVariables";
import useDefaultSystemPrompt from "@/hooks/useDefaultSystemPrompt";

interface ChatPromptSettingsProps {
  workspace: any;
  setHasChanges: (hasChanges: boolean) => void;
  hasChanges: boolean;
}

export default function ChatPromptSettings({
  workspace,
  setHasChanges,
  hasChanges,
}: ChatPromptSettingsProps) {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  // Prompt state
  const initialPrompt = getWorkspaceSystemPrompt(workspace);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [savedPrompt, setSavedPrompt] = useState(initialPrompt);

  useEffect(() => {
    const next = getWorkspaceSystemPrompt(workspace);
    setPrompt(next);
    setSavedPrompt(next);
  }, [workspace]);

  // UI state
  const [isEditing, setIsEditing] = useState(
    searchParams.get("action") === "focus-system-prompt",
  );
  const [showPromptHistory, setShowPromptHistory] = useState(false);

  // SWR hooks
  const { variables: availableVariables } = useSystemPromptVariables();
  const { defaultSystemPrompt } = useDefaultSystemPrompt();

  // Refs
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const promptHistoryRef = useRef<any>(null);
  const historyButtonRef = useRef<HTMLButtonElement>(null);

  // Derived state
  const isDirty = prompt !== savedPrompt;
  const hasBeenModified = savedPrompt?.trim() !== initialPrompt?.trim();

  // Sync savedPrompt when hasChanges is cleared
  const prevHasChanges = useRef(hasChanges);
  if (!hasChanges && prevHasChanges.current) {
    setSavedPrompt(prompt);
  }
  prevHasChanges.current = hasChanges;

  useEffect(() => {
    if (isEditing && promptRef.current) {
      promptRef.current.focus();
    }
  }, [isEditing]);

  const handleRestoreFromHistory = (historicalPrompt: string) => {
    setPrompt(historicalPrompt);
    setShowPromptHistory(false);
    setHasChanges(true);
  };

  const handleRestoreToDefaultSystemPrompt = () => {
    System.fetchDefaultSystemPrompt()
      .then(({ defaultSystemPrompt }: any) => {
        setPrompt(defaultSystemPrompt);
        setHasChanges(true);
      })
      .catch((e) => console.error(e));
  };

  return (
    <>
      <ChatPromptHistory
        ref={promptHistoryRef}
        workspaceSlug={workspace.slug}
        show={showPromptHistory}
        onRestore={handleRestoreFromHistory}
        onClose={() => setShowPromptHistory(false)}
      />
      <div>
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <label htmlFor="name" className="block input-label">
              {t("chat.prompt.title")}
            </label>
          </div>
          <p className="text-theme-text-secondary text-xs font-medium py-1.5">
            {t("chat.prompt.description")}
          </p>
          <p className="text-theme-text-secondary text-xs font-medium mb-2">
            {t("chatPromptSettings.youCanInsert")}{" "}
            <Link
              to={paths.settings.systemPromptVariables()}
              className="text-primary-button"
            >
              {t("chatPromptSettings.promptVariables")}
            </Link>{" "}
            {t("chatPromptSettings.like")}:{" "}
            {availableVariables.slice(0, 3).map((v: any, i: number) => (
              <Fragment key={v.key}>
                <span className="bg-theme-settings-input-bg px-1 py-0.5 rounded">
                  {`{${v.key}}`}
                </span>
                {i < Math.min(availableVariables.length, 3) - 1 &&
                  VARIABLE_SEPARATOR}
              </Fragment>
            ))}
            {availableVariables.length > 3 && (
              <Link
                to={paths.settings.systemPromptVariables()}
                className="text-primary-button"
              >
                {t("chatPromptSettings.moreCount", {
                  count: availableVariables.length - 3,
                })}
              </Link>
            )}
          </p>
        </div>

        <input type="hidden" name="openAiPrompt" value={prompt} />
        <div className="relative w-full flex flex-col items-end">
          <button
            ref={historyButtonRef}
            type="button"
            className="text-theme-text-secondary hover:text-white light:hover:text-black text-xs font-medium"
            onClick={(e) => {
              e.preventDefault();
              setShowPromptHistory(!showPromptHistory);
            }}
          >
            {showPromptHistory
              ? t("chatPromptSettings.hideHistory")
              : t("chatPromptSettings.viewHistory")}
          </button>
          <div className="relative w-full">
            {isEditing ? (
              <textarea
                ref={promptRef}
                autoFocus={true}
                rows={5}
                onFocus={(e) => {
                  const length = e.currentTarget.value.length;
                  e.currentTarget.setSelectionRange(length, length);
                }}
                onBlur={(e) => {
                  setIsEditing(false);
                  setPrompt(e.currentTarget.value);
                }}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setHasChanges(true);
                }}
                onPaste={(e) => {
                  setPrompt(e.currentTarget.value);
                  setHasChanges(true);
                }}
                defaultValue={prompt}
                className="border-none bg-theme-settings-input-bg text-theme-text-primary text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5 mt-2 resize-y overflow-y-scroll min-h-[150px]"
              />
            ) : (
              <div
                onClick={() => setIsEditing(true)}
                className="border-none bg-theme-settings-input-bg text-theme-text-primary text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5 mt-2 resize-y overflow-y-scroll min-h-[150px]"
              >
                <Highlighter
                  className="whitespace-pre-wrap"
                  highlightClassName="bg-cta-button p-0.5 rounded-md"
                  searchWords={availableVariables.map((v: any) => `{${v.key}}`)}
                  autoEscape={true}
                  caseSensitive={true}
                  textToHighlight={prompt}
                />
              </div>
            )}
          </div>
          <div className="w-full flex flex-row items-center justify-between pt-2">
            {prompt !== defaultSystemPrompt && (
              <button
                type="button"
                onClick={handleRestoreToDefaultSystemPrompt}
                className="text-theme-text-primary hover:text-white light:hover:text-black text-xs font-medium"
              >
                {t("chatPromptSettings.restoreToDefault")}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
