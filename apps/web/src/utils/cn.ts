// SPDX-License-Identifier: MIT
// Purpose: Tiny className merge utility — filters falsy, trims, deduplicates.

export function cn(...inputs: (string | false | null | undefined)[]): string {
  return inputs.filter(Boolean).join(" ");
}
