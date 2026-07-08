// SPDX-License-Identifier: MIT
import renderMarkdown from "./chat/markdown";

/**
 * Copies the given markdown string as rich text to the clipboard.
 * @param {string} markdownString - The markdown string to copy.
 * @returns {Promise<void>}
 */
export async function copyMarkdownAsRichText(
  markdownString: string,
): Promise<boolean> {
  try {
    const htmlContent = renderMarkdown(markdownString);
    const blobHTML = new Blob([htmlContent], { type: "text/html" });
    const blobText = new Blob([markdownString], { type: "text/plain" });

    const data = [
      new ClipboardItem({
        "text/html": blobHTML,
        "text/plain": blobText,
      }),
    ];

    await navigator.clipboard.write(data);
    return true;
  } catch (error) {
    console.error("Failed to copy markdown as rich text: ", error);
    return false;
  }
}

/**
 * Safely copies plain text to the clipboard, working in both secure and
 * non-secure contexts. The async Clipboard API (`navigator.clipboard`) is
 * only available in secure contexts (HTTPS or localhost); in HTTP or older
 * browsers `navigator.clipboard` is undefined and accessing `.writeText`
 * throws a synchronous TypeError that escapes any chained `.catch()`.
 *
 * This helper prefers the async API when available and falls back to the
 * deprecated `document.execCommand("copy")` flow with a hidden textarea
 * otherwise. Callers receive a boolean so they can update UI state only
 * when the copy actually succeeded.
 * @param {string} text - The text to copy.
 * @returns {Promise<boolean>} true if the copy succeeded, false otherwise.
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof text !== "string" || text.length === 0) return false;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy path (permission denied, lost focus, …).
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
