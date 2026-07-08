// SPDX-License-Identifier: MIT
// Localised file input button replacing browser-native "Choose File" text
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { UploadSimple } from "@phosphor-icons/react/dist/csr/UploadSimple";

interface PdfFileInputProps {
  inputRef: React.RefObject<HTMLInputElement>;
  multiple?: boolean;
  label: string;
  placeholder: string;
}

export function PdfFileInput({
  inputRef,
  multiple = false,
  label,
  placeholder,
}: PdfFileInputProps) {
  const { t } = useTranslation();
  const [fileNames, setFileNames] = useState<string[]>([]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileNames(Array.from(e.target.files || []).map((f) => f.name));
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple={multiple}
        onChange={handleChange}
        className="sr-only"
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-theme-sidebar-border bg-theme-bg-container text-sm text-theme-text-primary hover:bg-theme-bg-secondary transition-colors"
      >
        <UploadSimple size={14} aria-hidden="true" />
        {label}
      </button>
      <span className="text-sm text-theme-text-secondary truncate max-w-full flex-1 min-w-0">
        {fileNames.length === 0
          ? placeholder
          : fileNames.length === 1
            ? fileNames[0]
            : `${t("pdfAnalysis.panel.filesSelected", { count: fileNames.length })}`}
      </span>
    </div>
  );
}
