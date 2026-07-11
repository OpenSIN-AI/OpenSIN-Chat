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
          ? "w-full relative flex justify-center items-center"
          : "w-full absolute bottom-0 left-0 z-10 flex justify-center items-center pwa:pb-5 px-2 md:px-0"
      }
    >
      <form
        onSubmit={handleSubmit}
        className={
          centered
            ? "flex flex-col gap-y-1 rounded-2xl w-full items-center"
            : "mx-auto flex w-full max-w-[760px] flex-col items-center gap-y-1 px-4 md:px-8"
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
            <div className="flex flex-col overflow-hidden rounded-xl border border-theme-modal-border bg-theme-bg-secondary px-3 shadow-[0_8px_28px_rgba(0,0,0,0.14)] transition-[border-color,box-shadow] duration-150 focus-within:border-theme-text-secondary focus-within:shadow-[0_10px_32px_rgba(0,0,0,0.18)] sm:px-4">
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
              <div className="flex items-end justify-between gap-2 py-2">
                <div className="flex min-w-0 items-center">
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
                <div className="flex gap-x-2 items-center">
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
