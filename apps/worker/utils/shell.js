// SPDX-License-Identifier: MIT
/**
 * Patch the shell environment path to ensure the PATH is properly set for the current platform.
 * On Docker, we are on Node v18 and cannot support fix-path v5.
 * So we need to use the ESM-style import() to import the fix-path module + add the strip-ansi call to patch the PATH, which is the only change between v4 and v5.
 * https://github.com/sindresorhus/fix-path/issues/6
 * @returns {Promise<{[key: string]: string}>} - Environment variables from shell
 */
async function patchShellEnvironmentPath() {
  try {
    if (process.platform === "win32") return process.env;
    const { default: fixPath } = await import("fix-path");
    const { default: stripAnsi } = await import("strip-ansi");
    const before = process.env.PATH;
    fixPath();
    if (process.env.PATH) process.env.PATH = stripAnsi(process.env.PATH);
    if (process.env.PATH !== before) {
      // eslint-disable-next-line no-console
      console.log("Shell environment path patched successfully.");
    }
    return process.env;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to patch shell environment path:", error);
    return process.env;
  }
}

module.exports = {
  patchShellEnvironmentPath,
};
