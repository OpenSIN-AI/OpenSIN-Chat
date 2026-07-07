// SPDX-License-Identifier: MIT
import { Fragment } from "react";
import { CaretLeft } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { decode as HTMLDecode } from "he";
import { truncate } from "@/utils/strings";
import { useTranslation } from "react-i18next";
import { omitChunkHeader } from "../../../ChatHistory/Citation";
import { toPercentString } from "@/utils/numbers";

export default function SourceDetailView({ source, onBack, onClose }: any) {
  const { t } = useTranslation();
  // Guard: source.chunks may be undefined for malformed citations; without
  // this guard the .map() below throws a TypeError.
  const chunks = Array.isArray(source?.chunks) ? source.chunks : [];
  return (
    <>
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          type="button"
          className="text-theme-text-secondary light:text-slate-400 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors"
        >
          <CaretLeft size={20} weight="bold" />
        </button>
        <p className="font-semibold text-base leading-6 text-theme-text-primary light:text-theme-text-primary truncate px-2">
          {truncate(source?.title ?? "", 30)}
        </p>
        <button
          onClick={onClose}
          type="button"
          className="text-theme-text-secondary light:text-slate-400 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors"
        >
          <X size={16} weight="bold" />
        </button>
      </div>
      <div className="flex flex-col overflow-y-auto no-scroll">
        {(chunks as any).map(({ text, score }, idx) => (
          <Fragment key={`chunk-${text?.slice(0, 30) || ""}-${idx}`}>
            <div className="flex flex-col gap-y-1 py-4">
              <p className="text-sm leading-[20px] text-theme-text-primary light:text-theme-text-primary">
                {HTMLDecode(omitChunkHeader(text))}
              </p>
              {!!score && (
                <div className="flex items-center text-xs text-theme-text-secondary light:text-slate-500 gap-x-1">
                  <Info size={14} />
                  <p>
                    {toPercentString(score)} {t("chat_window.similarity_match")}
                  </p>
                </div>
              )}
            </div>
            {idx !== chunks.length - 1 && (
              <hr className="border-zinc-700 light:border-slate-300" />
            )}
          </Fragment>
        ))}
      </div>
    </>
  );
}
