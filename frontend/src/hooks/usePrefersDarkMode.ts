// SPDX-License-Identifier: MIT
export default function usePrefersDarkMode() {
  if (typeof window !== "undefined" && window?.matchMedia) {
    if (window?.matchMedia("(prefers-color-scheme: dark)")?.matches) {
      return true;
    }
    return false;
  }
  return false;
}
