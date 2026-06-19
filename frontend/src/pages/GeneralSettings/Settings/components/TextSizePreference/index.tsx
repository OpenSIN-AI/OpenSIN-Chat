// SPDX-License-Identifier: MIT
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { safeGetItem, safeSetItem } from "@/utils/safeStorage";

const VALID_TEXT_SIZES = ["small", "normal", "large"];

function getTextSizes(t: (key: string) => string) {
  return [
    { key: "small", label: t("chat_window.small") },
    { key: "normal", label: t("chat_window.normal") },
    { key: "large", label: t("chat_window.large") },
  ];
}

export default function TextSizePreference() {
  const { t } = useTranslation();
  const [selectedSize, setSelectedSize] = useState(() => {
    const stored = safeGetItem("openafd_text_size");
    return VALID_TEXT_SIZES.includes(stored as any) ? stored : "normal";
  });
  const textSizes = getTextSizes(t);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const size = e.target.value;
    setSelectedSize(size);
    safeSetItem("openafd_text_size", size);
    window.dispatchEvent(new CustomEvent("textSizeChange", { detail: size }));
  }

  return (
    <div className="flex flex-col gap-y-0.5 my-4">
      <p className="text-sm leading-6 font-semibold text-white">
        {t("chat_window.text_size_label")}
      </p>
      <p className="text-xs text-white/60">{t("chat_window.text_size")}</p>
      <div className="flex items-center gap-x-4">
        <select
          value={selectedSize}
          onChange={handleChange}
          className="border-none bg-theme-settings-input-bg mt-2 text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-fit py-2 px-4"
        >
          {textSizes.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
