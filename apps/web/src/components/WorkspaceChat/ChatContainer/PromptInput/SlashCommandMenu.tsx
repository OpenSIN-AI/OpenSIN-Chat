// SPDX-License-Identifier: MIT
import { useCallback } from "react";

interface UseSlashCommandParams {
  promptInput: string;
  setShowTools: (show: boolean | ((prev: boolean) => boolean)) => void;
  autoOpenedToolsRef: React.MutableRefObject<boolean>;
}

interface UseSlashCommandResult {
  handleSlashCommand: (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => boolean;
}

export function useSlashCommand({
  promptInput,
  setShowTools,
  autoOpenedToolsRef,
}: UseSlashCommandParams): UseSlashCommandResult {
  const handleSlashCommand = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        promptInput.trim() === ""
      ) {
        setShowTools((prev: boolean) => {
          autoOpenedToolsRef.current = !prev;
          return !prev;
        });
        return true;
      }
      return false;
    },
    [promptInput, setShowTools, autoOpenedToolsRef],
  );

  return { handleSlashCommand };
}
