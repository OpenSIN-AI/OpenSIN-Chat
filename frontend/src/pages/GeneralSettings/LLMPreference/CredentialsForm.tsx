// SPDX-License-Identifier: MIT
import React from "react";

interface CredentialsFormProps {
  selectedLLM: string | null;
  settings: any;
  availableProviders: any[];
  setHasChanges: (hasChanges: boolean) => void;
}

export default function CredentialsForm({
  selectedLLM,
  settings,
  availableProviders,
  setHasChanges,
}: CredentialsFormProps) {
  return (
    <div
      onChange={() => setHasChanges(true)}
      className="mt-4 flex flex-col gap-y-1"
    >
      {selectedLLM &&
        availableProviders
          .find((llm) => llm.value === selectedLLM)
          ?.options?.(settings)}
    </div>
  );
}
