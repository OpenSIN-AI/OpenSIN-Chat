// SPDX-License-Identifier: MIT
// Purpose: Search input with magnifying glass icon and clear button.
// Docs: Based on Issue #607 Phase 1 design tokens.
import React, { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { cn } from "@/utils/cn";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, ...props }, ref) => {
    const { t } = useTranslation();
    return (
      <div
        className={cn(
          "relative flex items-center gap-2 rounded-lg border border-theme-border bg-theme-bg-secondary px-3 py-2",
          "focus-within:border-theme-text-secondary focus-within:ring-1 focus-within:ring-theme-text-secondary",
          className,
        )}
      >
        <MagnifyingGlass
          size={16}
          className="flex-shrink-0 text-theme-text-muted"
          aria-hidden="true"
        />
        <input
          ref={ref}
          type="text"
          value={value}
          className="min-w-0 flex-1 border-none bg-transparent text-sm text-theme-text-primary outline-none placeholder:text-theme-text-muted"
          {...props}
        />
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label={t("common.clearSearch")}
            className="flex h-5 w-5 items-center justify-center rounded border-none bg-transparent cursor-pointer text-theme-text-muted hover:text-theme-text-primary"
          >
            <X size={12} />
          </button>
        )}
      </div>
    );
  },
);

SearchInput.displayName = "SearchInput";
