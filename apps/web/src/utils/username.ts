// SPDX-License-Identifier: MIT
/**
 * Unix-style username validation utilities
 *
 * Requirements:
 * - 2-32 characters long
 * - Must start with a lowercase letter
 * - Can contain lowercase letters, digits, underscores, hyphens, @ signs, and periods
 */

export const USERNAME_REGEX = /^[a-z][-a-z0-9._@]*$/;
export const USERNAME_MIN_LENGTH = 2;
export const USERNAME_MAX_LENGTH = 32;

/**
 * HTML5 pattern attribute for username inputs (without ^ and $).
 * The hyphen MUST be escaped as `\-` because Chrome compiles HTML5 pattern
 * attributes with the `/v` flag (Unicode Sets mode), where an unescaped `-`
 * at the start of a character class is NOT a literal and throws
 * "Invalid character in character class".  `@`, `.`, and `_` are fine as
 * literals — only `-` needs escaping.
 */
export const USERNAME_PATTERN = "[a-z][a-z0-9._@\\-]*";
