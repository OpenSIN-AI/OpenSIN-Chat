// SPDX-License-Identifier: MIT
/**
 * System model — TypeScript re-export of the canonical system.js model.
 *
 * system.ts is preferred over system.js by the TypeScript resolver, so ALL
 * hook/code that does `import System from "@/models/system"` ends up here.
 * This file re-exports the fully-featured JS model unchanged so that every
 * method (keys, customModels, fetchLogo, isFileSystemAgentAvailable, …) is
 * available with the correct API endpoints.
 */

// Re-export the complete, battle-tested JS model as the default export.
// Do NOT duplicate logic here — keep system.js as the single source of truth.
export { default } from "./system.js";
