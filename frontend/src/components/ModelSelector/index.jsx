// SPDX-License-Identifier: MIT
import { Link } from "react-router";
import ChatModelSelection from "@/pages/WorkspaceSettings/ChatSettings/WorkspaceLLMSelection/ChatModelSelection";
import RouterSelection from "@/pages/WorkspaceSettings/ChatSettings/WorkspaceLLMSelection/RouterSelection";

/**
 * ModelSelector — renders the appropriate model-selection control based on the
 * selected LLM provider.
 *
 * - "opensin-router"  → RouterSelection (internal multi-LLM routing)
 * - "default"         → null (system default, no per-workspace override)
 * - "huggingface"     → informational message (multi-model not supported)
 * - "bedrock"         → free-form text input (AWS Bedrock model IDs are arbitrary)
 * - anything else     → ChatModelSelection (provider-specific dropdown)
 */
export default function ModelSelector({
  selectedLLM,
  workspace,
  setHasChanges,
}) {
  if (!selectedLLM || selectedLLM === "default") return null;

  if (selectedLLM === "opensin-router") {
    return (
      <RouterSelection workspace={workspace} setHasChanges={setHasChanges} />
    );
  }

  if (selectedLLM === "huggingface") {
    return (
      <div className="w-full text-sm text-theme-text-secondary">
        <p>
          Multi-model selection is not supported for HuggingFace. Set the model
          in{" "}
          <Link
            to="/settings/llm-preference"
            className="underline text-theme-text-primary"
          >
            System LLM Settings
          </Link>
          .
        </p>
      </div>
    );
  }

  if (selectedLLM === "bedrock") {
    return (
      <div className="flex flex-col gap-y-1">
        <label
          htmlFor="chatModel"
          className="text-sm font-medium text-theme-text-primary"
        >
          Model
        </label>
        <input
          id="chatModel"
          name="chatModel"
          type="text"
          defaultValue={workspace?.chatModel ?? ""}
          onChange={() => setHasChanges?.(true)}
          className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          placeholder="e.g. anthropic.claude-v2"
        />
      </div>
    );
  }

  return (
    <ChatModelSelection
      provider={selectedLLM}
      workspace={workspace}
      setHasChanges={setHasChanges}
    />
  );
}
