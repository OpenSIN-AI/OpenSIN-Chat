// SPDX-License-Identifier: MIT
/**
 * Workspace model — TypeScript re-export of the canonical workspace.js model.
 *
 * workspace.ts is preferred over workspace.js by the TypeScript resolver,
 * so ALL sidebar/hook code that does `import Workspace from "@/models/workspace"`
 * ends up here. This file re-exports the fully-featured JS model unchanged so
 * that every method (threads.new, threads.folders.*, storeWorkspaceOrder,
 * searchWorkspaceOrThread, …) is available.
 */

// Re-export the complete, battle-tested JS model as the default export.
// Do NOT duplicate logic here — keep workspace.js as the single source of truth.
export { default } from "./workspace.js";
