// SPDX-License-Identifier: MIT
import { toast, type ToastOptions } from "react-toastify";
import { getStoredTheme } from "@/utils/safeStorage";

// Additional Configs (opts)
// You can also pass valid ReactToast params to override the defaults.
// clear: false, // Will dismiss all visible toasts before rendering next toast
const showToast: any = (
  message,
  type: any = "default",
  opts: { clear?: boolean; [key: string]: any } = {},
) => {
  const theme = getStoredTheme() || "default";
  const { clear, ...restOpts } = opts;
  const options: ToastOptions = {
    position: "bottom-center",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: theme === "default" ? "dark" : "light",
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
