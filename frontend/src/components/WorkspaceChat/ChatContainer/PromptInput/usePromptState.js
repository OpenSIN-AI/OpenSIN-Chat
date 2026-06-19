// SPDX-License-Identifier: MIT
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import debounce from "lodash.debounce";
import { useSearchParams } from "react-router-dom";
import { useIsAgentSessionActive } from "@/utils/chat/agent";
import usePromptInputStorage from "@/hooks/usePromptInputStorage";
import useTextSize from "@/hooks/useTextSize";
import { useSlashCommand } from "./SlashCommandMenu";
import { TOOLS_MENU_KEYBOARD_EVENT } from "./ToolsMenu";
import { PASTE_ATTACHMENT_EVENT } from "../DnDWrapper";
export const PROMPT_INPUT_EVENT = "set_prompt_input";
export const MAX_EDIT_STACK_SIZE = 100;

export default function usePromptState({
  workspace,
  submit,
  isStreaming,
  sendCommand,
  isDisabled,
}) {
  const { showAgentCommand = true } = workspace ?? {};
  const agentSessionActive = useIsAgentSessionActive();
  const [promptInput, setPromptInput] = useState("");
  const [showTools, setShowTools] = useState(false);
  const autoOpenedToolsRef = useRef(false);
  const toolsHighlightRef = useRef(-1);
  const formRef = useRef(null);
  const textareaRef = useRef(null);
  const [_, setFocused] = useState(false);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const { textSizeClass } = useTextSize();
  const [searchParams] = useSearchParams();

  // Synchronizes prompt input value with localStorage, scoped to the current thread.
  usePromptInputStorage({
    promptInput,
    setPromptInput,
  });

  /*
   * @checklist-item
   * If the URL has the agent param, open the agent menu for the user
   * automatically when the component mounts.
   */
  const sendCommandRef = useRef(sendCommand);
  useEffect(() => {
    sendCommandRef.current = sendCommand;
  }, [sendCommand]);
  useEffect(() => {
    if (searchParams.get("action") === "set-agent-chat") {
      sendCommandRef.current({ text: "@agent " });
      textareaRef.current?.focus();
    }
  }, [searchParams]);

  /**
   * To prevent too many re-renders we remotely listen for updates from the parent
   * via an event cycle. Otherwise, using message as a prop leads to a re-render every
   * change on the input.
   * @param {{detail: {messageContent: string, writeMode: 'replace' | 'append'}}} e
   */
  function handlePromptUpdate(e) {
    const { messageContent, writeMode = "replace" } = e?.detail ?? {};
    if (writeMode === "append") setPromptInput((prev) => prev + messageContent);
    else if (writeMode === "prepend")
      setPromptInput((prev) => messageContent + " " + prev);
    else setPromptInput(messageContent ?? "");
  }

  useEffect(() => {
    if (!!window)
      window.addEventListener(PROMPT_INPUT_EVENT, handlePromptUpdate);
    return () =>
      window?.removeEventListener(PROMPT_INPUT_EVENT, handlePromptUpdate);
  }, []);

  useEffect(() => {
    if (!isStreaming && textareaRef.current) textareaRef.current.focus();
    resetTextAreaHeight();
  }, [isStreaming]);

  /**
   * Save the current state before changes
   * @param {number} adjustment
   */
  const saveCurrentStateRef = useRef((adjustment = 0) => {
    if (undoStack.current.length >= MAX_EDIT_STACK_SIZE)
      undoStack.current.shift();
    undoStack.current.push({
      value: promptInput,
      cursorPositionStart: textareaRef.current.selectionStart + adjustment,
      cursorPositionEnd: textareaRef.current.selectionEnd + adjustment,
    });
  });
  const saveCurrentState = useCallback(
    (adjustment = 0) => saveCurrentStateRef.current(adjustment),
    [],
  );
  const debouncedSaveState = useMemo(
    () => debounce((...args) => saveCurrentStateRef.current(...args), 250),
    [],
  );

  useEffect(() => {
    return () => debouncedSaveState.cancel();
  }, [debouncedSaveState]);

  function handleSubmit(e) {
    // Ignore submits from portaled modals (slash command preset forms)
    if (e.target !== e.currentTarget) return;
    setFocused(false);
    setShowTools(false);
    submit(e);
  }

  function resetTextAreaHeight() {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
  }

  const { handleSlashCommand } = useSlashCommand({
    promptInput,
    setShowTools,
    autoOpenedToolsRef,
  });

  /**
   * Capture enter key press to handle submission, redo, or undo
   * via keyboard shortcuts
   * @param {KeyboardEvent} event
   */
  function captureEnterOrUndo(event) {
    // Forward keyboard events to the ToolsMenu when open
    if (showTools) {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        event.preventDefault();
        window.dispatchEvent(
          new CustomEvent(TOOLS_MENU_KEYBOARD_EVENT, {
            detail: { key: event.key },
          }),
        );
        return;
      }
      // When an item is highlighted via arrow keys, Enter selects it.
      // Otherwise, Enter falls through to submit the form normally.
      if (event.key === "Enter" && toolsHighlightRef.current >= 0) {
        event.preventDefault();
        window.dispatchEvent(
          new CustomEvent(TOOLS_MENU_KEYBOARD_EVENT, {
            detail: { key: "Enter" },
          }),
        );
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setShowTools(false);
        textareaRef.current?.focus();
        return;
      }
    }

    // Handle slash command
    if (handleSlashCommand(event)) return;

    // Is simple enter key press w/o shift key
    if (event.keyCode === 13 && !event.shiftKey) {
      event.preventDefault();
      if (isStreaming || isDisabled) return; // Prevent submission if streaming or disabled
      setShowTools(false);
      return submit(event);
    }

    // Is undo with Ctrl+Z or Cmd+Z + Shift key = Redo
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "z" &&
      event.shiftKey
    ) {
      event.preventDefault();
      if (redoStack.current.length === 0) return;

      const nextState = redoStack.current.pop();
      if (!nextState) return;

      undoStack.current.push({
        value: promptInput,
        cursorPositionStart: textareaRef.current.selectionStart,
        cursorPositionEnd: textareaRef.current.selectionEnd,
      });
      setPromptInput(nextState.value);
      setTimeout(() => {
        textareaRef.current.setSelectionRange(
          nextState.cursorPositionStart,
          nextState.cursorPositionEnd,
        );
      }, 0);
    }

    // Undo with Ctrl+Z or Cmd+Z
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "z" &&
      !event.shiftKey
    ) {
      if (undoStack.current.length === 0) return;
      const lastState = undoStack.current.pop();
      if (!lastState) return;

      redoStack.current.push({
        value: promptInput,
        cursorPositionStart: textareaRef.current.selectionStart,
        cursorPositionEnd: textareaRef.current.selectionEnd,
      });
      setPromptInput(lastState.value);
      setTimeout(() => {
        textareaRef.current.setSelectionRange(
          lastState.cursorPositionStart,
          lastState.cursorPositionEnd,
        );
      }, 0);
    }
  }

  function adjustTextArea(event) {
    const element = event.target;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }

  function handlePasteEvent(e) {
    e.preventDefault();
    if (e.clipboardData.items.length === 0) return false;

    // paste any clipboard items that are images.
    for (const item of e.clipboardData.items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        window.dispatchEvent(
          new CustomEvent(PASTE_ATTACHMENT_EVENT, {
            detail: { files: [file] },
          }),
        );
        continue;
      }

      // handle files specifically that are not images as uploads
      if (item.kind === "file") {
        const file = item.getAsFile();
        window.dispatchEvent(
          new CustomEvent(PASTE_ATTACHMENT_EVENT, {
            detail: { files: [file] },
          }),
        );
        continue;
      }
    }

    const pasteText = e.clipboardData.getData("text/plain");
    if (pasteText) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newPromptInput =
        promptInput.substring(0, start) +
        pasteText +
        promptInput.substring(end);
      setPromptInput(newPromptInput);

      // Set the cursor position after the pasted text
      // we need to use setTimeout to prevent the cursor from being set to the end of the text
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd =
          start + pasteText.length;
        adjustTextArea({ target: textarea });
      }, 0);
    }
    return;
  }

  function handleChange(e) {
    debouncedSaveState(-1);
    adjustTextArea(e);
    const value = e.target.value;
    setPromptInput(value);

    // Auto-dismiss the tools menu when the "/" that opened it is modified
    if (autoOpenedToolsRef.current && showTools && value !== "/") {
      setShowTools(false);
      autoOpenedToolsRef.current = false;
    }
  }

  return {
    promptInput,
    setPromptInput,
    showTools,
    setShowTools,
    setFocused,
    autoOpenedToolsRef,
    toolsHighlightRef,
    formRef,
    textareaRef,
    undoStack,
    redoStack,
    textSizeClass,
    saveCurrentState,
    debouncedSaveState,
    handleSubmit,
    resetTextAreaHeight,
    captureEnterOrUndo,
    adjustTextArea,
    handlePasteEvent,
    handleChange,
    handlePromptUpdate,
    agentSessionActive,
    showAgentCommand,
  };
}
