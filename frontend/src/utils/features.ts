// SPDX-License-Identifier: MIT

function readBoolean(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;

  const normalized = String(value).trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off", ""].includes(normalized)) return false;

  return fallback;
}

export const FEATURES = Object.freeze({
  imageGeneration: readBoolean(
    import.meta.env.VITE_ENABLE_IMAGE_GENERATION,
    false,
  ),
  videoGeneration: readBoolean(
    import.meta.env.VITE_ENABLE_VIDEO_GENERATION,
    false,
  ),
  cvoiceTts: readBoolean(import.meta.env.VITE_ENABLE_CVOICE_TTS, false),
});

export { readBoolean };
