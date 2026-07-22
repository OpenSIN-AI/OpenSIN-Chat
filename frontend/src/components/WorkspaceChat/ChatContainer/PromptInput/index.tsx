// SPDX-License-Identifier: MIT
// Purpose: Provides the persistent chat composer and its workspace tools.
// Docs: index.doc.md
import { useTranslation } from "react-i18next";
import StopGenerationButton from "./StopGenerationButton";
import SpeechToText from "./SpeechToText";
import AttachmentManager from "./Attachments";
import { useEffect } from "react";
import AttachItem from "./AttachItem";
import DeepResearchSources from "./DeepResearchSources";
import { applyAgentModePrefix } from "./AgentModeButton";
import ToolsMenu from "./ToolsMenu";
import usePromptState, {
  MAX_EDIT_STACK_SIZE,
  PROMPT_INPUT_EVENT,
} from "./usePromptState";
import useIsDisabled from "./useIsDisabled";
import TextArea from "./TextArea";
import AgentModeButton, { useAgentMode } from "./AgentModeButton";
import ToolsButton from "./ToolsButton";
import SendPromptButton from "./SendPromptButton";
import EnhancePromptButton from "./EnhancePromptButton";
import TextSizeButton from "./TextSizeMenu";
import NotebookModeSwitcher from "@/features/notebook/NotebookModeSwitcher";
import useNotebookMode from "@/features/notebook/useNotebookMode";
import CodeRunnerPicker from "@/features/code-runners/CodeRunnerPicker";
import useSelectedCodeRunner from "@/features/code-runners/useSelectedCodeRunner";
import { useChatSidebar } from "../ChatSidebar";

export { PROMPT_INPUT_ID } from "./promptLimits";
export { PROMPT_INPUT_EVENT, MAX_EDIT_STACK_SIZE };

/**
 * @param {Workspace} props.workspace - workspace object
 * @param {function} props.submit - form submit handler
 * @param {boolean} props.isStreaming - disables input while streaming response
 * @param {function} props.sendCommand - handler for slash commands and agent mentions
 * @param {Array} [props.attachments] - file attachments array
 * @param {boolean} [props.centered] - renders in centered layout mode (for home page)
 * @param {string} [props.workspaceSlug] - workspace slug for home page context
 * @param {string} [props.threadSlug] - thread slug for home page context
 */
export default function PromptInput({
  workspace = {},
  submit,
  isStreaming,
  sendCommand,
  attachments = [],
  centered = false,
  workspaceSlug = null,
  threadSlug = null,
}: any) {
  const { t } = useTranslation();
  const { isDisabled } = useIsDisabled();
  const { openSidebar } = useChatSidebar();
  const {
    promptInput,
    setPromptInput,
    showTools,
    setShowTools,
    autoOpenedToolsRef,
    toolsHighlightRef,
    formRef,
    textareaRef,
    textSizeClass,
    saveCurrentState,
    handleSubmit,
    captureEnterOrUndo,
    adjustTextArea,
    handlePasteEvent,
    handleChange,
    agentSessionActive,
    showAgentCommand,
  } = usePromptState({
    workspace,
    submit,
    isStreaming,
    sendCommand,
    isDisabled,
  });

  const agentMode = useAgentMode();
  const notebookSlug = workspaceSlug ?? (workspace as any)?.slug ?? null;

  const notebookMode = useNotebookMode({ notebookSlug, threadSlug });
  const selectedCodeRunner = useSelectedCodeRunner(notebookSlug);

  // When Deep Research sources change, rewrite [sources:…] in the prompt.
  useEffect(() => {
    function onRewrite(e: Event) {
      if (agentMode?.activeMode?.id !== "deep-research") return;
      const detail = (e as CustomEvent).detail || {};
      const sources: string[] = Array.isArray(detail.sources) ? detail.sources : [];
      const next = applyAgentModePrefix(promptInput || "", "deep-research", sources);
      if (next !== promptInput) {
        sendCommand({ text: next, writeMode: "replace" });
      }
    }
    window.addEventListener("agent-mode-rewrite-prefix", onRewrite);
    return () => window.removeEventListener("agent-mode-rewrite-prefix", onRewrite);
  }, [agentMode?.activeMode?.id, promptInput, sendCommand]);

  return (
    <div
      id="prompt-input-wrapper"
      className={
        centered
          ? "relative flex w-full items-center justify-center"
          : "absolute inset-x-0 bottom-0 z-10 flex w-full items-center justify-center bg-[var(--chat-canvas)]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:px-6"
      }
    >
      <form
        onSubmit={handleSubmit}
        className={
          centered
            ? "flex w-full flex-col items-center"
            : "mx-auto flex w-full max-w-3xl flex-col items-center"
        }
      >
        <div className={`flex w-full items-center rounded-lg ${centered ? "mb-0" : "mb-3"}`}>
          <div className="relative w-full">
            <ToolsMenu
              workspace={workspace}
              showing={showTools}
              setShowing={setShowTools}
              sendCommand={sendCommand}
              promptRef={textareaRef}
              centered={centered}
              highlightedIndexRef={toolsHighlightRef}
            />
            <div className="flex flex-col overflow-hidden rounded-[14px] border border-white/[0.12] bg-zinc-950/80 px-3 shadow-sm transition-colors focus-within:border-zinc-400 light:border-zinc-200 light:bg-white light:focus-within:border-zinc-300 sm:px-4">
              <AttachmentManager attachments={attachments} />
              <div className="flex items-center">
                <TextArea
                  textareaRef={textareaRef}
                  promptInput={promptInput}
                  placeholder={notebookMode.mode.placeholder}
                  handleChange={handleChange}
                  captureEnterOrUndo={captureEnterOrUndo as any}
                  handlePasteEvent={handlePasteEvent}
                  saveCurrentState={saveCurrentState}
                  textSizeClass={textSizeClass}
                  t={t}
                  adjustTextArea={adjustTextArea}
                />
              </div>

              <div className="flex flex-col gap-2 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1">
                    <AttachItem workspaceSlug={workspaceSlug} workspaceThreadSlug={threadSlug} />
                    <button
                      type="button"
                      onClick={() => openSidebar("sources")}
                      className="flex h-8 items-center rounded-lg border-none px-2 text-xs font-medium text-theme-text-secondary hover:bg-theme-bg-tertiary hover:text-theme-text-primary"
                    >
                      {t("commandHub.groups.sources")}
                    </button>
                    {notebookMode.mode.allowsActions && (
                      <ToolsButton
                        showTools={showTools}
                        setShowTools={setShowTools}
                        textareaRef={textareaRef}
                        autoOpenedToolsRef={autoOpenedToolsRef}
                      />
                    )}
                  </div>
                  <NotebookModeSwitcher value={notebookMode.modeId} onChange={notebookMode.setModeId} />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1">
                    {notebookMode.modeId === "work" && !agentSessionActive && showAgentCommand && (
                      <>
                        <AgentModeButton
                          sendCommand={sendCommand}
                          promptInput={promptInput}
                          textareaRef={textareaRef as any}
                          visible={true}
                          {...agentMode}
                        />
                        <DeepResearchSources visible={agentMode?.activeMode?.id === "deep-research"} />
                      </>
                    )}
                    {notebookMode.modeId === "code" && (
                      <CodeRunnerPicker value={selectedCodeRunner.runnerId} onChange={selectedCodeRunner.setRunnerId} />
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                    <TextSizeButton />
                    <SpeechToText sendCommand={sendCommand} />
                    <EnhancePromptButton promptInput={promptInput} setPromptInput={setPromptInput} isStreaming={isStreaming} />
                    {isStreaming ? (
                      <StopGenerationButton workspaceSlug={notebookSlug} threadSlug={threadSlug ?? null} />
                    ) : (
                      <SendPromptButton formRef={formRef} promptInput={promptInput} isDisabled={isDisabled} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
