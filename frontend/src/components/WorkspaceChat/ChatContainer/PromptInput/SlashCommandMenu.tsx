import { useCallback } from "react";

export function useSlashCommand({
  promptInput,
  setShowTools,
  autoOpenedToolsRef,
}) {
  const handleSlashCommand = useCallback(
    (event) => {
      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        promptInput.trim() === ""
      ) {
        setShowTools((prev) => {
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
