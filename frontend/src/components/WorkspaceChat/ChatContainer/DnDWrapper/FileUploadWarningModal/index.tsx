// SPDX-License-Identifier: MIT
import { useTranslation, Trans } from "react-i18next";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import ModalWrapper from "@/components/ModalWrapper";
import pluralize from "pluralize";
import { numberWithCommas } from "@/utils/numbers";
import useUser from "@/hooks/useUser";
import { Link } from "react-router";
import Paths from "@/utils/paths";
import Workspace from "@/models/workspace";

export default function FileUploadWarningModal({
  show,
  onClose,
  onContinue,
  onEmbed,
  tokenCount,
  maxTokens,
  fileCount = 1,
  isEmbedding = false,
  embedProgress = 0,
}: any) {
  const { t } = useTranslation();
  const { user } = useUser();
  const canEmbed = !user || user.role !== "default";
  if (!show) return null;

  if (isEmbedding) {
    return (
      <ModalWrapper isOpen={show}>
        <div className="relative max-w-[600px] bg-theme-bg-primary rounded-lg shadow border border-theme-modal-border">
          <div className="p-6 flex flex-col items-center justify-center">
            <p className="text-theme-text-primary text-lg font-semibold mb-4">
              {t("fileUploadWarning.embeddingProgress", {
                current: embedProgress + 1,
                total: fileCount,
                fileWord: pluralize("file", fileCount),
              })}
            </p>
            <CircleNotch
              size={32}
              className="animate-spin text-theme-text-primary"
            />
            <p className="text-theme-text-secondary text-sm mt-2">
              {t("fileUploadWarning.pleaseWait")}
            </p>
          </div>
        </div>
      </ModalWrapper>
    );
  }

  return (
    <ModalWrapper isOpen={show}>
      <div className="relative max-w-[600px] bg-theme-bg-primary rounded-lg shadow border border-theme-modal-border">
        <div className="relative p-6 border-b border-theme-modal-border">
          <div className="w-full flex gap-x-2 items-center">
            <h3 className="text-xl font-semibold text-theme-text-primary overflow-hidden overflow-ellipsis whitespace-nowrap">
              {t("fileUploadWarning.title")}
            </h3>
          </div>
        </div>

        <div className="py-7 px-9 space-y-4">
          <p className="text-theme-text-primary text-sm">
            <Trans
              i18nKey="fileUploadWarning.description"
              values={{
                tokenCount: numberWithCommas(tokenCount),
                maxTokens: numberWithCommas(maxTokens),
                limit: (Workspace.maxContextWindowLimit * 100).toFixed(0),
                fileCount,
                fileWord: pluralize("file", fileCount),
              }}
              components={{
                a: (
                  <Link
                    target="_blank"
                    to={Paths.documentation.contextWindows()}
                    className="text-theme-text-secondary text-sm underline"
                  />
                ),
              }}
            />
          </p>
          <p className="text-theme-text-primary text-sm">
            {t("fileUploadWarning.chooseAction")}
          </p>
        </div>

        <div className="flex w-full justify-between items-center p-6 space-x-2 border-t border-theme-modal-border rounded-b">
          <button
            onClick={onClose}
            type="button"
            className="border-none transition-all duration-300 bg-theme-modal-border text-theme-text-primary hover:opacity-60 px-4 py-2 rounded-lg text-sm"
          >
            {t("fileUploadWarning.cancel")}
          </button>
          <div className="flex w-full justify-end items-center space-x-2">
            <button
              onClick={onContinue}
              type="button"
              className="border-none transition-all duration-300 bg-theme-modal-border text-theme-text-primary hover:opacity-60 px-4 py-2 rounded-lg text-sm"
            >
              {t("fileUploadWarning.continueAnyway")}
            </button>
            {canEmbed && (
              <button
                onClick={onEmbed}
                disabled={isEmbedding || !canEmbed}
                type="button"
                className="border-none transition-all duration-300 bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm"
              >
                {t("fileUploadWarning.embedFile", {
                  fileWord: pluralize("File", fileCount),
                })}
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}
