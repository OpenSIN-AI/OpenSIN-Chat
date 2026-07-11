// SPDX-License-Identifier: MIT
import { memo } from "react";
function ConnectorOption({
  slug,
  selectedConnector,
  setSelectedConnector,
  image,
  name,
  description,
}: any) {
  return (
    <button
      type="button"
      onClick={() => setSelectedConnector(slug)}
      aria-pressed={selectedConnector === slug}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border-none px-3 py-2.5 text-left transition-colors hover:bg-theme-file-picker-hover ${
        selectedConnector === slug ? "bg-theme-file-picker-hover" : ""
      }`}
    >
      <img src={image} alt="" className="h-10 w-10 shrink-0 rounded-lg" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-theme-text-primary">
          {name}
        </span>
        <span className="mt-0.5 block line-clamp-2 text-xs leading-relaxed text-theme-text-secondary">
          {description}
        </span>
      </span>
    </button>
  );
}

export default memo(ConnectorOption);
