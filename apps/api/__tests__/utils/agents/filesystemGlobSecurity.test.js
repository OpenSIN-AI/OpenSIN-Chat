// SPDX-License-Identifier: MIT
/* eslint-env jest */

const fs = require("fs/promises");
const { realpathSync } = require("fs");
const os = require("os");
const path = require("path");

const storageDir = path.join(
  realpathSync(os.tmpdir()),
  `opensin-filesystem-glob-${process.pid}-${Date.now()}`,
);
process.env.STORAGE_DIR = storageDir;
process.env.NODE_ENV = "test";

const FilesystemManager = require("../../../utils/agents/aibitat/plugins/filesystem/lib");

describe("FilesystemManager secure glob matching", () => {
  const root = path.join(storageDir, "opensin-fs");

  beforeAll(async () => {
    await fs.mkdir(path.join(root, "nested"), { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(root, "alpha.js"), "console.log('alpha');\n"),
      fs.writeFile(path.join(root, "beta.txt"), "beta\n"),
      fs.writeFile(path.join(root, "nested", "ignored.txt"), "ignored\n"),
      fs.writeFile(path.join(root, "gamma.md"), "gamma\n"),
    ]);
  });

  afterAll(async () => {
    await fs.rm(storageDir, { recursive: true, force: true });
  });

  it("matches brace patterns with minimatch 10 and respects exclusions", async () => {
    const matches = await FilesystemManager.searchFilesWithGlob(
      root,
      "**/*.{js,txt}",
      { excludePatterns: ["nested/**"] },
    );

    expect(matches.map((file) => path.relative(root, file)).sort()).toEqual([
      "alpha.js",
      "beta.txt",
    ]);
  });
});
