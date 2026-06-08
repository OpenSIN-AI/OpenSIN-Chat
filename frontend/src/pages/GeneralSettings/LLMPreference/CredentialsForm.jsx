import React from "react";

export default function CredentialsForm({
  selectedLLM,
  settings,
  availableProviders,
  setHasChanges,
}) {
  return (
    <div
      onChange={() => setHasChanges(true)}
      className="mt-4 flex flex-col gap-y-1"
    >
      {selectedLLM &&
        availableProviders.find(
          (llm) => llm.value === selectedLLM,
        )?.options?.(settings)}
    </div>
  );
}
