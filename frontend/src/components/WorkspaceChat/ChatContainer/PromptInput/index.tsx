// SPDX-License-Identifier: MIT
// Purpose: Provides the persistent chat composer and its workspace tools.
// Docs: index.doc.md
import { useTranslation } from "react-i18next";
import StopGenerationButton from "./StopGenerationButton";
import SpeechToText from "./SpeechToText";
import AttachmentManager from "./Attachments";
import AttachItem from "./AttachItem";
import ToolsMenu from "./ToolsMenu";
import usePromptState from "./usePromptState";
import useIsDisabled from "./useIsDisabled";
import TextArea from "./TextArea";
import AgentModeButton, { useAgentMode } from "./AgentModeButton";
import ToolsButton from "./ToolsButton";
import SendPromptButton from "./SendPromptButton";
import EnhancePromptButton from "./EnhancePromptButton";
import TextSizeButton from "./TextSizeMenu";

export const PROMPT_INPUT_ID = "primary-prompt-input";
import { PROMPT_INPUT_EVENT, MAX_EDIT_STACK_SIZE } from "./usePromptState";
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
}) {
  const { t } = useTranslation();
  const { isDisabled } = useIsDisabled();
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
        <div
          className={`flex w-full items-center rounded-lg ${centered ? "mb-0" : "mb-3"}`}
        >
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
            <div className="flex flex-col overflow-hidden rounded-2xl bg-[var(--chat-surface)] px-3 sm:px-4">
              <AttachmentManager attachments={attachments} />
              <div className="flex items-center">
                <TextArea
                  textareaRef={textareaRef}
                  promptInput={promptInput}
                  handleChange={handleChange}
                  captureEnterOrUndo={captureEnterOrUndo as any}
                  handlePasteEvent={handlePasteEvent}
                  saveCurrentState={saveCurrentState}
                  textSizeClass={textSizeClass}
                  t={t}
                  setFocused={() => {}}
                  adjustTextArea={adjustTextArea}
                />
              </div>
              <div className="flex items-center justify-between gap-1 py-1.5 sm:gap-2 sm:py-2">
                <div className="flex min-w-0 flex-1 items-center overflow-hidden">
                  <div className="flex items-center gap-x-1">
                    <AttachItem
                      workspaceSlug={workspaceSlug}
                      workspaceThreadSlug={threadSlug}
                    />
                    <AgentModeButton
                      sendCommand={sendCommand}
                      promptInput={promptInput}
                      textareaRef={textareaRef}
                      visible={!agentSessionActive && showAgentCommand}
                      {...agentMode}
                    />
                  </div>
                  <ToolsButton
                    showTools={showTools}
                    setShowTools={setShowTools}
                    textareaRef={textareaRef}
                    autoOpenedToolsRef={autoOpenedToolsRef}
                  />
                </div>
                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                  <TextSizeButton />
                  <SpeechToText sendCommand={sendCommand} />
                  <EnhancePromptButton
                    promptInput={promptInput}
                    setPromptInput={setPromptInput}
                    isStreaming={isStreaming}
                  />
                  {isStreaming ? (
                    <StopGenerationButton
                      workspaceSlug={workspaceSlug ?? workspace?.slug ?? null}
                      threadSlug={threadSlug ?? null}
                    />
                  ) : (
                    <SendPromptButton
                      formRef={formRef}
                      promptInput={promptInput}
                      isDisabled={isDisabled}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
