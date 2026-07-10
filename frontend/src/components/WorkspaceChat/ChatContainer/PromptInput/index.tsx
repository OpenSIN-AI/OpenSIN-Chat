// SPDX-License-Identifier: MIT
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
            : "flex flex-col gap-y-1 rounded-2xl w-full mx-auto max-w-[800px] items-center px-2 md:px-6"
        }
      >
        <div
          className={`flex items-center rounded-lg w-full ${centered ? "mb-0" : "mb-4"}`}
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
            <div className="bg-[#141414] light:bg-white border border-white/[0.07] light:border-zinc-200 shadow-none rounded-xl flex flex-col px-4 overflow-hidden focus-within:border-white/[0.12] light:focus-within:border-zinc-300 transition-colors duration-200">
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
              <div className="flex justify-between items-center pt-2 pb-2">
                <div className="flex items-center gap-x-0.25">
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
