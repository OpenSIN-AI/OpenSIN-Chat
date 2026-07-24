// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { presentTool, toolTitle } from "./tool-presenter";

describe("tool presenter", () => {
  it("recognizes web search", () => {
    expect(presentTool("web_search_v2").kind).toBe("web-search");
    expect(toolTitle("web_search_v2", "running")).toBe("Durchsucht das Web");
  });

  it("recognizes repository tools", () => {
    expect(presentTool("github_fetch_file").kind).toBe("repository");
  });

  it("recognizes commands", () => {
    expect(presentTool("execute_shell_command").kind).toBe("terminal");
  });

  it("uses a safe fallback", () => {
    expect(presentTool("custom_unknown_tool").kind).toBe("generic");
  });
});
