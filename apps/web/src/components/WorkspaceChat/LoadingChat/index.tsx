// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";

function LoadingLine({ width }: { width: string }) {
  return (
    <span
      aria-hidden="true"
      className="block h-2 rounded-full bg-[var(--chat-border)]/70 motion-safe:animate-pulse"
      style={{ width }}
    />
  );
}

export default function LoadingChat() {
  const { t } = useTranslation();
  const isMobile = useIsMobileLayout();

  return (
    <div
      aria-busy="true"
      aria-label={t("threadContainer.loadingThreads")}
      style={{
        "--content-height": isMobile ? "100%" : "calc(100% - 32px)",
      }}
      className="relative h-[var(--content-height)] w-full overflow-hidden bg-[var(--chat-canvas)] md:mx-4 md:my-4 md:rounded-2xl md:border md:border-[var(--chat-border)]"
    >
      <span className="sr-only">{t("threadContainer.loadingThreads")}</span>
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4 pb-32 pt-8 md:px-6 md:pt-12">
        <div className="flex flex-col gap-3 py-4">
          <LoadingLine width="34%" />
          <LoadingLine width="82%" />
          <LoadingLine width="68%" />
        </div>
        <div className="flex justify-end py-4">
          <div className="flex w-3/5 flex-col gap-3 rounded-2xl rounded-br-md bg-[var(--chat-user-bubble)] p-4 sm:w-2/5">
            <LoadingLine width="88%" />
            <LoadingLine width="56%" />
          </div>
        </div>
        <div className="flex flex-col gap-3 py-4">
          <LoadingLine width="28%" />
          <LoadingLine width="91%" />
          <LoadingLine width="74%" />
          <LoadingLine width="48%" />
        </div>
      </div>
      <div className="absolute inset-x-3 bottom-3 mx-auto h-20 max-w-3xl rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-3 shadow-[0_8px_28px_rgba(0,0,0,0.1)] md:inset-x-6">
        <LoadingLine width="42%" />
        <div className="mt-6 flex items-center justify-between">
          <LoadingLine width="24%" />
          <span className="h-7 w-7 rounded-full bg-[var(--chat-border)]/70 motion-safe:animate-pulse" />
        </div>
      </div>
    </div>
  );
}
