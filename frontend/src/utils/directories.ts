// SPDX-License-Identifier: MIT
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(localizedFormat);

export function formatDate(dateString) {
  if (!dateString) return "—";
  const parsed = new Date(dateString);
  if (isNaN(parsed.getTime())) return "—";
  const options = { year: "numeric", month: "short", day: "numeric" } as const;
  return parsed.toLocaleDateString(undefined, options);
}

export function formatDateTimeAsMoment(dateString, format = "LLL") {
  if (!dateString) return "—";
  try {
    const d = dayjs(dateString);
    if (!d.isValid()) return "—";
    return d.format(format);
  } catch {
    return "—";
  }
}

export function getFileExtension(path) {
  const hasExtension = path?.includes(".");
  if (!hasExtension) return "FILE";
  const extension = path?.split(".")?.slice(-1)?.[0];
  return extension?.toUpperCase() || "FILE";
}

export function middleTruncate(str, n) {
  const fileExtensionPattern = /([^.]*)$/;
  const extensionMatch = str.includes(".") && str.match(fileExtensionPattern);

  if (str.length <= n) return str;

  if (extensionMatch && extensionMatch[1]) {
    const extension = extensionMatch[1];
    const nameWithoutExtension = str.replace(fileExtensionPattern, "");
    const truncationPoint = Math.max(0, n - extension.length - 4);
    const truncatedName =
      nameWithoutExtension.substr(0, truncationPoint) +
      "..." +
      nameWithoutExtension.slice(-4);

    return truncatedName + extension;
  } else {
    return str.length > n ? str.substr(0, n - 8) + "..." + str.slice(-4) : str;
  }
}
