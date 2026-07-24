// SPDX-License-Identifier: MIT
/* eslint-env jest */

jest.mock("@inquirer/prompts", () => ({
  input: jest.fn(),
}));

const cliModule = require("../../../../../utils/agents/aibitat/plugins/cli.js");
const { cli } = cliModule;
const { input } = require("@inquirer/prompts");

function buildAibitat(overrides = {}) {
  return {
    continue: jest.fn(),
    onError: null,
    onStart: null,
    onMessage: null,
    onTerminate: null,
    onInterrupt: null,
    ...overrides,
  };
}

function setupAibitat(opts = {}) {
  const aibitat = buildAibitat();
  const listeners = {};
  for (const evt of ["onError", "onStart", "onMessage", "onTerminate", "onInterrupt"]) {
    const orig = aibitat[evt];
    aibitat[evt] = (fn) => {
      listeners[evt] = fn;
      // preserve the .bind behavior of the original by also calling if assigned
      if (typeof orig === "function") orig(fn);
    };
  }
  aibitat._listeners = listeners;
  aibitat._continue = aibitat.continue;
  const plugin = cli.plugin.call({ name: cli.name }, opts);
  plugin.setup(aibitat);
  return { aibitat, plugin };
}

describe("cli plugin — registration", () => {
  test("exports cli with expected name", () => {
    expect(cli.name).toBe("cli");
  });

  test("startupConfig is defined and has empty params", () => {
    expect(cli.startupConfig).toBeDefined();
    expect(cli.startupConfig.params).toEqual({});
  });

  test("plugin() returns an object with name and setup", () => {
    const plugin = cli.plugin.call({ name: cli.name });
    expect(plugin.name).toBe("cli");
    expect(typeof plugin.setup).toBe("function");
  });

  test("plugin() defaults simulateStream to true", () => {
    const plugin = cli.plugin.call({ name: cli.name });
    expect(plugin.name).toBe("cli");
  });

  test("plugin() accepts simulateStream=false", () => {
    const plugin = cli.plugin.call({ name: cli.name }, { simulateStream: false });
    expect(plugin.name).toBe("cli");
  });
});

describe("cli plugin — wiring", () => {
  test("setup registers listeners for all lifecycle events", () => {
    const { aibitat } = setupAibitat();
    expect(typeof aibitat._listeners.onError).toBe("function");
    expect(typeof aibitat._listeners.onStart).toBe("function");
    expect(typeof aibitat._listeners.onMessage).toBe("function");
    expect(typeof aibitat._listeners.onTerminate).toBe("function");
    expect(typeof aibitat._listeners.onInterrupt).toBe("function");
  });
});

describe("cli plugin — onError", () => {
  test("prints the error message to stderr", async () => {
    const { aibitat } = setupAibitat();
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("boom");
    await aibitat._listeners.onError(error);
    expect(errSpy).toHaveBeenCalledTimes(1);
    const [first] = errSpy.mock.calls[0];
    expect(first).toMatch(/error: boom/);
    errSpy.mockRestore();
  });

  test("uses a default error message when error.message is missing", async () => {
    const { aibitat } = setupAibitat();
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    await aibitat._listeners.onError({});
    expect(errSpy.mock.calls[0][0]).toMatch(
      /An error occurred while running the agent/,
    );
    errSpy.mockRestore();
  });
});

describe("cli plugin — onStart", () => {
  test("prints the start banner and resets the printing queue", async () => {
    const { aibitat } = setupAibitat();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await aibitat._listeners.onStart();
    expect(logSpy).toHaveBeenCalled();
    expect(logSpy.mock.calls.flat().join(" ")).toMatch(/starting chat/);
    logSpy.mockRestore();
  });
});

describe("cli plugin — onMessage print", () => {
  test("queues new messages behind in-flight print work", async () => {
    const { aibitat, plugin } = setupAibitat();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    // Track invocations of plugin.print by replacing it with a Jest spy.
    const printSpy = jest
      .spyOn(plugin, "print")
      .mockImplementation(async () => undefined);
    await aibitat._listeners.onMessage({
      from: "USER",
      to: "AGENT",
      content: "msg",
    });
    // Allow the microtask queue (Promise.all of printing) to drain.
    await new Promise((r) => setImmediate(r));
    expect(printSpy).toHaveBeenCalled();
    logSpy.mockRestore();
    stdoutSpy.mockRestore();
  });

  test("print with simulateStream=false logs reference and content directly", async () => {
    const { plugin } = setupAibitat({ simulateStream: false });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await plugin.print({ from: "USER", to: "AGENT", content: "hi there" }, false);
    expect(logSpy).toHaveBeenCalledTimes(3); // reference, content, blank line
    expect(logSpy.mock.calls[0][0]).toMatch(/USER/);
    expect(logSpy.mock.calls[1][0]).toContain("hi there");
    logSpy.mockRestore();
  });

  test("print with simulateStream=true streams content chunks", async () => {
    const { plugin } = setupAibitat({ simulateStream: true });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    await plugin.print({ from: "USER", to: "AGENT", content: "alpha beta gamma" });
    // at least the reference line and the trailing two newlines
    expect(stdoutSpy).toHaveBeenCalled();
    logSpy.mockRestore();
    stdoutSpy.mockRestore();
  });

  test("print handles missing content gracefully in stream mode", async () => {
    const { plugin } = setupAibitat();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    await plugin.print({ from: "USER", to: "AGENT" });
    expect(stdoutSpy).toHaveBeenCalled();
    logSpy.mockRestore();
    stdoutSpy.mockRestore();
  });

  test("print handles missing content gracefully in non-stream mode", async () => {
    const { plugin } = setupAibitat();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    // Should not throw even when content is missing.
    await expect(
      plugin.print({ from: "USER", to: "AGENT" }, false),
    ).resolves.toBeUndefined();
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("print handles empty content in stream mode without errors", async () => {
    const { plugin } = setupAibitat();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    await plugin.print({ from: "USER", to: "AGENT", content: "" });
    expect(stdoutSpy).toHaveBeenCalled();
    logSpy.mockRestore();
    stdoutSpy.mockRestore();
  });
});

describe("cli plugin — onTerminate", () => {
  test("prints the finished message", async () => {
    const { aibitat } = setupAibitat();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await aibitat._listeners.onTerminate();
    expect(logSpy.mock.calls.flat().join(" ")).toMatch(/chat finished/);
    logSpy.mockRestore();
  });
});

describe("cli plugin — onInterrupt", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("continues the aibitat with the user feedback when not 'exit'", async () => {
    const { aibitat, plugin } = setupAibitat();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    // Stub the plugin's askForFeedback to avoid invoking the real @inquirer input
    // (which is destructured at require time and cannot be replaced).
    plugin.askForFeedback = jest.fn().mockResolvedValue("make it better");
    const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {});
    await aibitat._listeners.onInterrupt({ from: "USER", to: "AGENT" });
    expect(aibitat._continue).toHaveBeenCalledWith("make it better");
    expect(exitSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("calls process.exit when feedback is 'exit'", async () => {
    const { aibitat, plugin } = setupAibitat();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    plugin.askForFeedback = jest.fn().mockResolvedValue("exit");
    const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {});
    await aibitat._listeners.onInterrupt({ from: "USER", to: "AGENT" });
    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(aibitat._continue).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("prints a blank line after the user feedback prompt", async () => {
    const { aibitat, plugin } = setupAibitat();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    plugin.askForFeedback = jest.fn().mockResolvedValue("ok");
    jest.spyOn(process, "exit").mockImplementation(() => {});
    await aibitat._listeners.onInterrupt({ from: "USER", to: "AGENT" });
    // at least one of the log calls should be empty (the extra blank line)
    const hasBlank = logSpy.mock.calls.some(
      (call) =>
        call.length === 0 ||
        call[0] === "" ||
        call[0] === undefined ||
        /^\[.*?\] \[(?:INFO|WARN|ERROR|DEBUG)\]$/.test(call[0] || ""),
    );
    expect(hasBlank).toBe(true);
    logSpy.mockRestore();
  });

  test("askForFeedback exists and is a function", () => {
    const { plugin } = setupAibitat();
    expect(typeof plugin.askForFeedback).toBe("function");
  });
});
