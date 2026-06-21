// SPDX-License-Identifier: MIT
import { toast, type ToastOptions } from "react-toastify";
import { getStoredTheme } from "@/utils/safeStorage";
import { resolveDarkMode } from "@/hooks/useTheme";

// Additional Configs (opts)
// You can also pass valid ReactToast params to override the defaults.
// clear: false, // Will dismiss all visible toasts before rendering next toast
const showToast: any = (
  message,
  type: any = "default",
  opts: { clear?: boolean; [key: string]: any } = {},
) => {
  const stored = getStoredTheme();
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
        : resolveDarkMode()
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
