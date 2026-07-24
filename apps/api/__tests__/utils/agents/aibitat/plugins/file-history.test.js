// SPDX-License-Identifier: MIT
/* eslint-env jest */
const { fileHistory } = require("../../../../../utils/agents/aibitat/plugins/file-history");

describe("fileHistory", () => {
  test("name is 'file-history-plugin'", () => {
    expect(fileHistory.name).toBe("file-history-plugin");
  });

  test("plugin returns object with setup method", () => {
    const plugin = fileHistory.plugin({ filename: "history/test.json" });
    expect(plugin.name).toBe("file-history-plugin");
    expect(typeof plugin.setup).toBe("function");
  });

  test("plugin setup registers onMessage handler on aibitat", () => {
    const aibitat = { onMessage: jest.fn() };
    const plugin = fileHistory.plugin({ filename: "/tmp/test-history.json" });
    plugin.setup(aibitat);
    expect(aibitat.onMessage).toHaveBeenCalledWith(expect.any(Function));
  });

  test("plugin uses default filename when none provided", () => {
    const aibitat = { onMessage: jest.fn() };
    const plugin = fileHistory.plugin();
    plugin.setup(aibitat);
    expect(aibitat.onMessage).toHaveBeenCalled();
  });
});
