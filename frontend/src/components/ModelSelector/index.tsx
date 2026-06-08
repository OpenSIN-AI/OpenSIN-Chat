// SPDX-License-Identifier: MIT
import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import paths from "@/utils/paths";
import ChatModelSelection from "@/pages/WorkspaceSettings/ChatSettings/WorkspaceLLMSelection/ChatModelSelection";
import RouterSelection from "@/pages/WorkspaceSettings/ChatSettings/WorkspaceLLMSelection/RouterSelection";

const FREE_FORM_LLM_SELECTION = ["bedrock", "azure"];
const NO_MODEL_SELECTION = ["default", "huggingface", "openafd-router"];

function FreeFormLLMInput({ workspace, setHasChanges }: any) {
  const { t } = useTranslation();
  return (
    <div className="mt-4 flex flex-col gap-y-1">
      <label className="block input-label">{t("chat.model.title")}</label>
      <p className="text-white text-opacity-60 text-xs font-medium py-1.5">
        {t("chat.model.description")}
      </p>
      <input
        type="text"
        name="chatModel"
        defaultValue={workspace?.chatModel || ""}
        onChange={() => setHasChanges(true)}
        className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
        placeholder="Enter model name exactly as referenced in the API (e.g., gpt-3.5-turbo)"
      />
    </div>
  );
}

export default function ModelSelector({
  selectedLLM, workspace, setHasChanges, ModelSelectionComponent = ChatModelSelection, }: any) {
  if (selectedLLM === "openafd-router") {
    return (
      <RouterSelection workspace={workspace} setHasChanges={setHasChanges} />
    );
  }

  if (NO_MODEL_SELECTION.includes(selectedLLM)) {
    if (selectedLLM !== "default") {
      return (
        <div className="w-full h-10 justify-center items-center flex mt-4">
          <p className="text-sm font-base text-white text-opacity-60 text-center">
            Multi-model support is not supported for this provider yet.
            <br />
            This workspace will use{" "}
            <Link to={paths.settings.llmPreference()} className="underline">
              the model set for the system.
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
