// SPDX-License-Identifier: MIT
/**
 * Admin model — TypeScript re-export of the canonical admin.js model.
 *
 * admin.ts is preferred over admin.js by the TypeScript resolver, so ALL
 * hook/code that does `import Admin from "@/models/admin"` ends up here.
 * This file re-exports the fully-featured JS model unchanged so that every
 * method (users, invites, workspaces, systemPreferencesByFields, …) is
 * available with the correct API endpoints.
 */

// Re-export the complete, battle-tested JS model as the default export.
// Do NOT duplicate logic here — keep admin.js as the single source of truth.
export { default } from "./admin.js";
