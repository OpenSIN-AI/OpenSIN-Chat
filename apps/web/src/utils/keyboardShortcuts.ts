// SPDX-License-Identifier: MIT
import paths from "./paths";
import { useEffect } from "react";
import { userFromStorage } from "./request";
import { TOGGLE_LLM_SELECTOR_EVENT } from "@/components/WorkspaceChat/ChatContainer/PromptInput/LLMSelector/action";

export const KEYBOARD_SHORTCUTS_HELP_EVENT = "keyboard-shortcuts-help";
export const NAVIGATE_HOME_EVENT = "keyboard-navigate-home";
export const isMac =
  ((navigator as any).userAgentData?.platform ?? navigator.platform)
    .toUpperCase()
    .indexOf("MAC") >= 0;

/**
 * Navigate via the History API so React Router picks up the change
 * without a full-page reload.  Falls back to window.location.href if
 * pushState is unavailable (should not happen in practice).
 */
function navigateTo(path: string) {
  if (window.location.pathname === path) return;
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export const SHORTCUTS = {
  "⌘ + ,": {
    translationKey: "settings",
    action: () => {
      navigateTo(paths.settings.interface());
    },
  },
  "⌘ + H": {
    translationKey: "home",
    action: () => {
      navigateTo(paths.home());
    },
  },
  "⌘ + I": {
    translationKey: "workspaces",
    action: () => {
      // Dispatch to WorkspaceChat which owns the navigate() hook and
      // can route to the current workspace (or home) client-side.
      window.dispatchEvent(new Event(NAVIGATE_HOME_EVENT));
    },
  },
  "⌘ + L": {
    translationKey: "llmPreferences",
    action: () => {
      navigateTo(paths.settings.llmPreference());
    },
  },
  "⌘ + Shift + C": {
    translationKey: "chatSettings",
    action: () => {
      navigateTo(paths.settings.chat());
    },
  },
  "⌘ + Shift + ?": {
    translationKey: "help",
    action: () => {
      window.dispatchEvent(
        new CustomEvent(KEYBOARD_SHORTCUTS_HELP_EVENT, {
          detail: { show: true },
        }),
      );
    },
  },
  F1: {
    translationKey: "help",
    action: () => {
      window.dispatchEvent(
        new CustomEvent(KEYBOARD_SHORTCUTS_HELP_EVENT, {
          detail: { show: true },
        }),
      );
    },
  },
  "⌘ + Shift + L": {
    translationKey: "showLLMSelector",
    action: () => {
      window.dispatchEvent(new Event(TOGGLE_LLM_SELECTOR_EVENT));
    },
  },
};

const LISTENERS = {};
const modifier = isMac ? "meta" : "ctrl";
for (const key in SHORTCUTS) {
  const listenerKey = key
    .replace("⌘", modifier)
    .replaceAll(" ", "")
    .toLowerCase();
  LISTENERS[listenerKey] = SHORTCUTS[key].action;
}

// Convert keyboard event to shortcut key
function getShortcutKey(event) {
  let key = "";
  if (event.metaKey || event.ctrlKey) key += modifier + "+";
  if (event.shiftKey) key += "shift+";
  if (event.altKey) key += "alt+";

  // Handle special keys
  if (event.key === ",") key += ",";
  // Handle question mark for help shortcut
  else if (event.key === "?") key += "?";
  else if (event.key === "Control")
    return ""; // Ignore Control key by itself
  else if (event.key === "Shift")
    return ""; // Ignore Shift key by itself
  else key += event.key.toLowerCase();
  return key;
}

// Initialize keyboard shortcuts
export function initKeyboardShortcuts() {
  function handleKeyDown(event) {
    const shortcutKey = getShortcutKey(event);
    if (!shortcutKey) return;

    const action = LISTENERS[shortcutKey];
    if (action) {
      const target = event.target as HTMLElement;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (isTyping) {
        const allowWhileTyping =
          shortcutKey === "meta+shift+?" || shortcutKey === "f1";
        if (!allowWhileTyping) return;
      }

      event.preventDefault();
      action();
    }
  }

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}

function useKeyboardShortcuts() {
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    function syncShortcuts() {
      const user = userFromStorage<{ role?: string }>();
      // If there is a user and the user is not an admin do not register the event listener
      // since some of the shortcuts are only available in multi-user mode as admin
      if (!!user && user?.role !== "admin") {
        if (cleanup) {
          cleanup();
          cleanup = null;
        }
        return;
      }
      if (!cleanup) {
        cleanup = initKeyboardShortcuts();
      }
    }

    syncShortcuts();

    // Re-check user status every 30 seconds to handle login/logout without page reload
    const interval = setInterval(syncShortcuts, 30_000);

    // Also listen for storage events (cross-tab login/logout)
    window.addEventListener("storage", syncShortcuts);

    return () => {
      if (cleanup) cleanup();
      clearInterval(interval);
      window.removeEventListener("storage", syncShortcuts);
    };
  }, []);
  return;
}

export function KeyboardShortcutWrapper({ children }) {
  useKeyboardShortcuts();
  return children;
}
