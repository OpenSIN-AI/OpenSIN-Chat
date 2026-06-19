// SPDX-License-Identifier: MIT
const fs = require("fs");
const path = require("path");
const os = require("os");

const SOURCE_PATH = require.resolve("../../../utils/boot/ensureJwtSecret");

describe("ensureJwtSecret .env file mode", () => {
  let originalEnv;
  let tempRoot;
  let originalCwd;

  beforeEach(() => {
    originalEnv = process.env;
    originalCwd = process.cwd();
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "osc-jwt-"));
    process.chdir(tempRoot);
  });

  afterEach(() => {
    process.env = originalEnv;
    process.chdir(originalCwd);
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test("writes .env with mode 0o600 when persisting JWT_SECRET", () => {
    const envFile = path.join(tempRoot, ".env");
    fs.writeFileSync(envFile, "EXISTING_KEY='kept'\n");
    process.env = { ...originalEnv, NODE_ENV: "test" };
    delete process.env.JWT_SECRET;

    const { ensureJwtSecret } = require(SOURCE_PATH);
    ensureJwtSecret();

    expect(fs.existsSync(envFile)).toBe(true);
    expect(fs.statSync(envFile).mode & 0o777).toBe(0o600);

    const content = fs.readFileSync(envFile, "utf8");
    expect(content).toContain("EXISTING_KEY='kept'");
    expect(content).toMatch(/^JWT_SECRET='[a-f0-9]{64}'$/m);
  });
});
