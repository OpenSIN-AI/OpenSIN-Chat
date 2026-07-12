// SPDX-License-Identifier: MIT
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import paths from "@/utils/paths";
import ChatModelSelection from "@/pages/WorkspaceSettings/ChatSettings/WorkspaceLLMSelection/ChatModelSelection";
import RouterSelection from "@/pages/WorkspaceSettings/ChatSettings/WorkspaceLLMSelection/RouterSelection";

const FREE_FORM_LLM_SELECTION = ["bedrock"];
const NO_MODEL_SELECTION = ["default", "huggingface", "opensin-router"];

function FreeFormLLMInput({ workspace, setHasChanges }: any) {
  const { t } = useTranslation();
  return (
    <div className="mt-4 flex flex-col gap-y-1">
      <label htmlFor="freeform-chat-model" className="block input-label">
        {t("chat.model.title")}
      </label>
      <p className="text-theme-text-secondary text-xs font-medium py-1.5">
        {t("chat.model.description")}
      </p>
      <input
        id="freeform-chat-model"
        type="text"
        name="chatModel"
        aria-label={t("chat.model.title")}
        defaultValue={workspace?.chatModel || ""}
        onChange={() => setHasChanges(true)}
        className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
        placeholder={t("modelSelector.chatModel.placeholder")}
      />
    </div>
  );
}

export default function ModelSelector({
  selectedLLM,
  workspace,
  setHasChanges,
  ModelSelectionComponent = ChatModelSelection,
}: any) {
  const { t } = useTranslation();
  if (selectedLLM === "opensin-router") {
    return (
      <RouterSelection workspace={workspace} setHasChanges={setHasChanges} />
    );
  }

  if (NO_MODEL_SELECTION.includes(selectedLLM)) {
    if (selectedLLM !== "default") {
      return (
        <div className="w-full h-10 justify-center items-center flex mt-4">
          <p className="text-sm font-base text-theme-text-secondary text-center">
            {t("modelSelector.multiModelNotSupported")}
            <br />
            {t("modelSelector.workspaceWillUse")}{" "}
            <Link to={paths.settings.llmPreference()} className="underline">
              {t("modelSelector.systemModelLink")}
            </Link>
          </p>
        </div>
      );
    }
    return null;
  }

  if (FREE_FORM_LLM_SELECTION.includes(selectedLLM)) {
    return (
      <FreeFormLLMInput workspace={workspace} setHasChanges={setHasChanges} />
    );
  }

  return (
    <ModelSelectionComponent
      provider={selectedLLM}
      workspace={workspace}
      setHasChanges={setHasChanges}
    />
  );
}
