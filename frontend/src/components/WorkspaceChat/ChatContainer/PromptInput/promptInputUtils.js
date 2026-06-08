// SPDX-License-Identifier: MIT
export const PROMPT_INPUT_ID = "primary-prompt-input";
export const PROMPT_INPUT_EVENT = "set_prompt_input";
export const MAX_EDIT_STACK_SIZE = 100;

export function handlePromptUpdate(e, setPromptInput) {
  const { messageContent, writeMode = "replace" } = e?.detail ?? {};
  if (writeMode === "append") setPromptInput((prev) => prev + messageContent);
  else if (writeMode === "prepend")
    setPromptInput((prev) => messageContent + " " + prev);
  else setPromptInput(messageContent ?? "");
}

export function resetTextAreaHeight(textareaRef) {
  if (!textareaRef?.current) return;
  textareaRef.current.style.height = "auto";
}

export function saveEditState(promptInput, textareaRef, undoStack, adjustment = 0) {
  if (undoStack.current.length >= MAX_EDIT_STACK_SIZE)
    undoStack.current.shift();
  undoStack.current.push({
    value: promptInput,
    cursorPositionStart: textareaRef.current.selectionStart + adjustment,
    cursorPositionEnd: textareaRef.current.selectionEnd + adjustment,
  });
}
