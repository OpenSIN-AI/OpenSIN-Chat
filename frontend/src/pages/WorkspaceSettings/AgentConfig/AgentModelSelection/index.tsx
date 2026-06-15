// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import useGetProviderModels, {
  DISABLED_PROVIDERS,
} from "@/hooks/useGetProvidersModels";
import paths from "@/utils/paths";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

/**
 * These models do NOT support function calling
 * or do not support system prompts
 * and therefore are not supported for agents.
 */
function supportedModel(provider: string, model = ""): boolean {
  if (provider === "openai") {
    return (
      [
        "gpt-3.5-turbo-0301",
        "gpt-4-turbo-2024-04-09",
        "gpt-4-turbo",
        "o1-preview",
        "o1-preview-2024-09-12",
        "o1-mini",
        "o1-mini-2024-09-12",
        "o3-mini",
        "o3-mini-2025-01-31",
      ].includes(model) === false
    );
  }

  return true;
}

type AgentModelSelectionProps = {
  provider: string;
  workspace?: any;
  setHasChanges: (hasChanges: boolean) => void;
};

export default function AgentModelSelection({
  provider,
  workspace,
  setHasChanges,
}: AgentModelSelectionProps): JSX.Element {
  const { slug } = useParams() as { slug: string };
  const { defaultModels, customModels, loading } =
    useGetProviderModels(provider);

  const { t } = useTranslation();
  if (DISABLED_PROVIDERS.includes(provider)) {
    return (
      <div className="w-full h-10 justify-center items-center flex">
        <p className="text-sm font-base text-white text-opacity-60 text-center">
          {t("agentModelSelection.multiModelNotSupported")}
          <br />
          {t("agentModelSelection.agentsWillUse")}{" "}
          <Link
            to={paths.workspace.settings.chatSettings(slug)}
            className="underline"
          >
            {t("agentModelSelection.workspaceModel")}
          </Link>{" "}
          {t("agentModelSelection.or")}{" "}
          <Link to={paths.settings.llmPreference()} className="underline">
            {t("agentModelSelection.systemModel")}
          </Link>
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <div className="flex flex-col">
          <label htmlFor="name" className="block input-label">
            {t("agent.mode.chat.title")}
          </label>
          <p className="text-white text-opacity-60 text-xs font-medium py-1.5">
            {t("agent.mode.chat.description")}
          </p>
        </div>
        <select
          name="agentModel"
          required={true}
          disabled={true}
          className="border-none bg-theme-settings-input-bg text-white text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
        >
          <option disabled={true} selected={true}>
            {t("agent.mode.wait")}
          </option>
        </select>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col">
        <label htmlFor="name" className="block input-label">
          {t("agent.mode.title")}
        </label>
        <p className="text-white text-opacity-60 text-xs font-medium py-1.5">
          {t("agent.mode.description")}
        </p>
      </div>

      <select
        name="agentModel"
        required={true}
        onChange={() => {
          setHasChanges(true);
        }}
        className="border-none bg-theme-settings-input-bg text-white text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
      >
        {defaultModels.length > 0 && (
          <optgroup label={t("agentModelSelection.generalModels")}>
            {defaultModels.map((model: string) => {
              if (!supportedModel(provider, model)) return null;
              return (
                <option
                  key={model}
                  value={model}
                  selected={workspace?.agentModel === model}
                >
                  {model}
                </option>
              );
            })}
          </optgroup>
        )}
        {Array.isArray(customModels) && customModels.length > 0 && (
          <optgroup label={t("agentModelSelection.customModels")}>
            {customModels.map((model: any) => {
              if (!supportedModel(provider, model.id)) return null;

              return (
                <option
                  key={model.id}
                  value={model.id}
                  selected={workspace?.agentModel === model.id}
                >
                  {model.id}
                </option>
              );
            })}
          </optgroup>
        )}
        {/* For providers like TogetherAi where we partition model by creator entity. */}
        {!Array.isArray(customModels) &&
          Object.keys(customModels).length > 0 && (
            <>
              {Object.entries(customModels).map(([organization, models]) => (
                <optgroup key={organization} label={organization}>
                  {(models as any[]).map((model) => {
                    if (!supportedModel(provider, model.id)) return null;
                    return (
                      <option
                        key={model.id}
                        value={model.id}
                        selected={workspace?.agentModel === model.id}
                      >
                        {model.name || model.id}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </>
          )}
      </select>
    </div>
  );
}
