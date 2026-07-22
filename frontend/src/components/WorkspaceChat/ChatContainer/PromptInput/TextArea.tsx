// SPDX-License-Identifier: MIT
import Appearance from "@/models/appearance";
import {
  PROMPT_INPUT_ID,
  PROMPT_INPUT_MAX_LENGTH,
} from "./promptLimits";

interface TextAreaProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  promptInput: string;
  placeholder?: string;
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  captureEnterOrUndo: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handlePasteEvent: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  saveCurrentState: () => void;
  textSizeClass: string;
  t: (key: string) => string;
  adjustTextArea: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
}

export default function TextArea({
  textareaRef,
  promptInput,
  placeholder,
  handleChange,
  captureEnterOrUndo,
  handlePasteEvent,
  saveCurrentState,
  textSizeClass,
  t,
  adjustTextArea,
}: TextAreaProps) {
  return (
    <textarea
      id={PROMPT_INPUT_ID}
      ref={textareaRef}
      aria-label={t("chat.messageInput")}
      onChange={handleChange}
      onKeyDown={captureEnterOrUndo}
      onPaste={(e) => {
        saveCurrentState();
        handlePasteEvent(e);
      }}
      required
      onBlur={adjustTextArea}
      value={promptInput}
      spellCheck={Appearance.get("enableSpellCheck")}
      maxLength={PROMPT_INPUT_MAX_LENGTH}
      className={`min-h-10 max-h-[32vh] w-full flex-grow cursor-text resize-none border-none bg-transparent px-1 pb-1.5 pt-3 leading-6 text-[var(--chat-text)] placeholder:text-[var(--chat-text-muted)] focus:outline-none active:outline-none md:max-h-[240px] pwa:!text-[16px] ${textSizeClass}`}
      placeholder={placeholder || t("chat_window.send_message")}
    />
  );
}
