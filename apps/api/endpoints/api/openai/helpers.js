// SPDX-License-Identifier: MIT
/**
 * Extracts text content from a multimodal message
 * If the content has multiple text items, it will join them together with a newline.
 * @param {string|Array} content - Message content that could be string or array of content objects
 * @returns {string} - The text content
 */
function extractTextContent(content) {
  if (!Array.isArray(content)) return content;
  return content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n");
}

/**
 * Detects mime type from a base64 data URL string, defaults to PNG if not detected
 * @param {string} dataUrl - The data URL string (e.g. data:image/jpeg;base64,...)
 * @returns {string} - The mime type or 'image/png' if not detected
 */
function getMimeTypeFromDataUrl(dataUrl) {
  try {
    const matches = dataUrl.match(/^data:([^;]+);base64,/);
    return matches ? matches[1].toLowerCase() : "image/png";
  } catch {
    return "image/png";
  }
}

/**
 * Extracts attachments from a multimodal message
 * The attachments provided are in OpenAI format since this util is used in the OpenAI compatible chat.
 * However, our backend internal chat uses the Attachment type we use elsewhere in the app so we have to convert it.
 * @param {Array} content - Message content that could be string or array of content objects
 * @returns {import("../../../utils/helpers").Attachment[]} - The attachments
 */
function extractAttachments(content) {
  if (!Array.isArray(content)) return [];
  return content
    .filter((item) => item.type === "image_url")
    .map((item, index) => ({
      name: `uploaded_image_${index}`,
      mime: getMimeTypeFromDataUrl(item.image_url.url),
      contentString: item.image_url.url,
    }));
}

/**
 * Sends an OpenAI-compatible JSON error response.
 * Matches the { error: { message, type, param, code } } shape that
 * OpenAI clients expect for structured error handling.
 * @param {import("express").Response} response
 * @param {number} status - HTTP status code
 * @param {string} message - Human-readable error message
 * @param {string} [type="invalid_request_error"] - Error type
 * @param {string|null} [code=null] - Machine-readable error code
 * @param {string|null} [param=null] - The parameter that caused the error
 */
function openAIError(
  response,
  status,
  message,
  type = "invalid_request_error",
  code = null,
  param = null,
) {
  if (response.headersSent) {
    response.end();
    return;
  }
  const error = { message, type };
  if (param !== null) error.param = param;
  if (code !== null) error.code = code;
  response.status(status).json({ error });
}

module.exports = {
  extractTextContent,
  extractAttachments,
  openAIError,
};
