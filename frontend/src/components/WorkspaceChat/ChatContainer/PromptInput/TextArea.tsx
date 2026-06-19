// SPDX-License-Identifier: MIT
import Appearance from "@/models/appearance";
import { PROMPT_INPUT_ID } from "./index";

interface TextAreaProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  promptInput: string;
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  captureEnterOrUndo: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handlePasteEvent: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  saveCurrentState: () => void;
  textSizeClass: string;
  t: (key: string) => string;
  setFocused: (focused: boolean) => void;
  adjustTextArea: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
}

export default function TextArea({
  textareaRef,
  promptInput,
  handleChange,
  captureEnterOrUndo,
  handlePasteEvent,
  saveCurrentState,
  textSizeClass,
  t,
  setFocused,
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
      required={true}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        setFocused(false);
        adjustTextArea(e);
      }}
      value={promptInput}
      spellCheck={Appearance.get("enableSpellCheck")}
      className={`border-none cursor-text max-h-[50vh] md:max-h-[350px] md:min-h-[40px] pt-3 pb-1 w-full leading-5 text-white light:text-slate-600 bg-transparent placeholder:text-white/60 light:placeholder:text-slate-400 resize-none active:outline-none focus:outline-none flex-grow pwa:!text-[16px] ${textSizeClass}`}
      placeholder={t("chat_window.send_message")}
    />
  );
}
