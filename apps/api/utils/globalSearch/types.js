// SPDX-License-Identifier: MIT

const SEARCH_TYPES = Object.freeze({
  WORKSPACE: "workspace",
  THREAD: "thread",
  CHAT: "chat",
  SOURCE: "source",
  NOTE: "note",
  ARTIFACT: "artifact",
});

const SEARCH_TYPE_VALUES = new Set(Object.values(SEARCH_TYPES));

function normalizeSearchTypes(value) {
  if (!value) return [...SEARCH_TYPE_VALUES];

  const requested = Array.isArray(value)
    ? value
    : String(value)
        .split(",")
        .map((item) => item.trim());

  const valid = requested.filter((item) => SEARCH_TYPE_VALUES.has(item));

  return valid.length ? [...new Set(valid)] : [...SEARCH_TYPE_VALUES];
}

module.exports = {
  SEARCH_TYPES,
  SEARCH_TYPE_VALUES,
  normalizeSearchTypes,
};
