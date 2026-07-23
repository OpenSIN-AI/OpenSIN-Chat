// SPDX-License-Identifier: MIT

const {
  RUNNER_DEFINITIONS,
  getRunnerDefinition,
  isRunnerAvailable,
  executeRunner,
} = require("./runner");

function listAvailableRunners() {
  return Object.entries(RUNNER_DEFINITIONS).map(([id, def]) => ({
    id,
    executable: def.executable,
    transport: def.transport,
    available: isRunnerAvailable(id),
  }));
}

function resolveRunner(runnerId) {
  const def = getRunnerDefinition(runnerId);
  if (!def) return null;
  return {
    id: runnerId,
    executable: def.executable,
    transport: def.transport,
    available: isRunnerAvailable(runnerId),
  };
}

module.exports = {
  listAvailableRunners,
  resolveRunner,
  isRunnerAvailable,
  executeRunner,
};
