// SPDX-License-Identifier: MIT
//
// Regression guard for the agent crash where `@agent` chats died with
//   TypeError: Cannot read properties of undefined (reading 'params')
//   at #attachPlugins (server/utils/agents/index.js)
//
// Root cause: `image-generation` was in DEFAULT_SKILLS but shipped without a
// `startupConfig`, and the single-stage plugin loader dereferenced
// `AgentPlugins[name].startupConfig.params` without optional chaining. Every
// agent invocation loads DEFAULT_SKILLS, so this crashed all @agent runs and
// left the SSE endpoint in a null-invocation reconnect loop.
//
// This test asserts that every built-in single-stage plugin exposes a
// `startupConfig.params` object so the loader never throws.

const AgentPlugins = require("../../../../../utils/agents/aibitat/plugins");

describe("built-in agent plugin startupConfig", () => {
  // Collect the canonical (non-alias) single-stage plugin objects. Child-plugin
  // bundles expose `.plugin` as an array and are loaded via the parent#child
  // path (already guarded with optional chaining), so we skip those here.
  const singleStagePlugins = Object.entries(AgentPlugins)
    // Object.keys includes both the export name and the `[plugin.name]` alias.
    // De-dupe by identity below; filtering here keeps it readable.
    .filter(([, value]) => value && typeof value === "object")
    .filter(([, value]) => !Array.isArray(value.plugin))
    .map(([key, value]) => [key, value]);

  test("there is at least one single-stage plugin to check", () => {
    expect(singleStagePlugins.length).toBeGreaterThan(0);
  });

  test.each(singleStagePlugins)(
    "%s exposes startupConfig.params (loader reads it unconditionally)",
    (_key, plugin) => {
      // Mirror the exact access in #attachPlugins single-stage branch:
      //   this.parseCallOptions(args, AgentPlugins[name].startupConfig?.params)
      // parseCallOptions tolerates undefined, but a defined params object is the
      // documented contract every other built-in plugin follows.
      expect(plugin.startupConfig).toBeDefined();
      expect(typeof plugin.startupConfig.params).toBe("object");
      expect(plugin.startupConfig.params).not.toBeNull();
    },
  );

  test("image-generation specifically has startupConfig (was the regression)", () => {
    expect(AgentPlugins.imageGeneration?.startupConfig?.params).toBeDefined();
    expect(AgentPlugins["image-generation"]?.startupConfig?.params).toBeDefined();
  });
});
