// SPDX-License-Identifier: MIT
import { toast, type ToastOptions } from "react-toastify";
import { getStoredTheme, resolveDarkMode } from "@/hooks/useTheme";

// Cache theme at module level to avoid synchronous lookups on every showToast() call.
// Updated via storage event listener and a custom "theme-change" event.
let _cachedTheme: string | null = getStoredTheme();
let _cachedDarkMode: boolean = resolveDarkMode();

function refreshThemeCache() {
  _cachedTheme = getStoredTheme();
  _cachedDarkMode = resolveDarkMode();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", refreshThemeCache);
  window.addEventListener("theme-change", refreshThemeCache);
}

// Additional Configs (opts)
// You can also pass valid ReactToast params to override the defaults.
// clear: false, // Will dismiss all visible toasts before rendering next toast
const showToast: any = (
  message,
  type: any = "default",
  opts: { clear?: boolean; [key: string]: any } = {},
) => {
  const stored = _cachedTheme;
  const { clear, ...restOpts } = opts;
  const options: ToastOptions = {
    position: "bottom-center",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    limit: 3,
    theme:
      stored === "default" || stored === null
        ? "dark"
        : _cachedDarkMode
          ? "dark"
          : "light",
    ...restOpts,
  };

  if (clear === true) toast.dismiss();

  switch (type) {
    case "success":
      toast.success(message, options);
      break;
    case "error":
      toast.error(message, options);
      break;
    case "info":
      toast.info(message, options);
      break;
    case "warning":
      toast.warn(message, options);
      break;
    default:
      toast(message, options);
  }
};

export default showToast;
