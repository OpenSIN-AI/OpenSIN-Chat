// SPDX-License-Identifier: MIT
import { memo } from "react";
import { useTranslation } from "react-i18next";

function EmbedderItem({
  name,
  value,
  image,
  description,
  checked,
  onClick,
}: any) {
  const { t } = useTranslation();
  return (
    <div
      onClick={() => onClick(value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(value);
        }
      }}
      role="button"
      tabIndex={0}
      className={`w-full p-2 rounded-md hover:cursor-pointer hover:bg-theme-bg-secondary ${
        checked ? "bg-theme-bg-secondary" : ""
      }`}
    >
      <input
        type="checkbox"
        value={value}
        className="peer hidden"
        checked={checked}
        readOnly={true}
        formNoValidate={true}
      />
      <div className="flex gap-x-4 items-center">
        <img
          src={image}
          alt={t("common.logoAlt", { name })}
          className="w-10 h-10 rounded-md"
        />
        <div className="flex flex-col">
          <div className="text-sm font-semibold text-theme-text-primary">
            {name}
          </div>
          <div className="mt-1 text-xs text-description">{description}</div>
        </div>
      </div>
    </div>
  );
}

export default memo(EmbedderItem);
