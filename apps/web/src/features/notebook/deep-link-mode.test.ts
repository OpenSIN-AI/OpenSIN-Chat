// SPDX-License-Identifier: MIT

import { describe, expect, test } from "vitest";
import { notebookModeForAgentDeepLink } from "./deep-link-mode";

describe("notebookModeForAgentDeepLink", () => {
  test.each(["deep-research", "report"])(
    "maps %s to Work mode",
    (agentMode) => {
      expect(notebookModeForAgentDeepLink(agentMode)).toBe("work");
    },
  );

  test.each([null, undefined, "", "chat", "unknown"])(
    "does not override notebook mode for %s",
    (agentMode) => {
      expect(notebookModeForAgentDeepLink(agentMode)).toBeNull();
    },
  );
});
