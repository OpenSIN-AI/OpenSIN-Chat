// SPDX-License-Identifier: MIT
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import { FileCode } from "@phosphor-icons/react/dist/csr/FileCode";
import { FileCsv } from "@phosphor-icons/react/dist/csr/FileCsv";
import { FileDoc } from "@phosphor-icons/react/dist/csr/FileDoc";
import { FileHtml } from "@phosphor-icons/react/dist/csr/FileHtml";
import { FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { FileImage } from "@phosphor-icons/react/dist/csr/FileImage";
import { FilePdf } from "@phosphor-icons/react/dist/csr/FilePdf";
import { WarningOctagon } from "@phosphor-icons/react/dist/csr/WarningOctagon";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { REMOVE_ATTACHMENT_EVENT } from "../../DnDWrapper";
import { openImageLightbox } from "@/components/ImageLightbox";
import { useTranslation } from "react-i18next";

/**
 * @param {{attachments: import("../../DnDWrapper").Attachment[]}}
 * @returns
 */
export default function AttachmentManager({ attachments }: any) {
  if (attachments.length === 0) return null;

  function handleImageClick(attachment: any) {
    const imageAttachments = attachments
      .filter((a) => a.type === "attachment" && a.contentString)
      .map((a) => ({ contentString: a.contentString, name: a.file.name }));
    const idx = imageAttachments.findIndex(
      (img) => img.name === attachment.file?.name,
    );
    if (idx !== -1) openImageLightbox(imageAttachments, idx);
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2 mb-4">
      {(attachments as any).map((attachment) => (
        <AttachmentItem
          key={attachment.uid}
          attachment={attachment}
          onImageClick={() => handleImageClick(attachment)}
        />
      ))}
    </div>
  );
}

/**
 * @param {{attachment: import("../../DnDWrapper").Attachment}}
 */
function AttachmentItem({ attachment, onImageClick }: any) {
  const { t } = useTranslation();
  const { uid, file, status, error, document, type, contentString } =
    attachment;
  const { iconBgColor, Icon } = displayFromFile(file);

  function removeFileFromQueue() {
    window.dispatchEvent(
      new CustomEvent(REMOVE_ATTACHMENT_EVENT, { detail: { uid, document } }),
    );
  }

  if (status === "in_progress") {
    const isUploading =
      attachment.phase === "uploading" &&
      typeof attachment.progress === "number";
    const statusText = isUploading
      ? t("attachments.uploadingPercent", { percent: attachment.progress })
      : attachment.phase === "processing"
        ? t("attachments.processing")
        : t("attachments.uploading");

    return (
      <div className="relative flex items-center gap-x-1 rounded-lg bg-theme-attachment-bg border-none w-[180px] group overflow-hidden">
        <div
          className={`bg-theme-attachment-icon-spinner-bg rounded-md flex items-center justify-center flex-shrink-0 h-[32px] w-[32px] m-1`}
        >
          <CircleNotch
            size={18}
            weight="bold"
            className="text-theme-attachment-icon-spinner animate-spin"
          />
        </div>
        <div className="flex flex-col w-[125px]">
          <p className="text-theme-attachment-text text-xs font-semibold truncate">
            {file.name}
          </p>
          <p className="text-theme-attachment-text-secondary text-[10px] leading-[14px] font-medium">
            {statusText}
          </p>
        </div>
        {isUploading && (
          <div
            role="progressbar"
            aria-valuenow={attachment.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("attachments.uploading")}
            className="absolute bottom-0 left-0 h-[3px] w-full bg-theme-attachment-icon-spinner-bg"
          >
            <div
              className="h-full bg-theme-attachment-icon-spinner transition-[width] duration-200 ease-out"
              style={{ width: `${attachment.progress}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div
        data-tooltip-id="attachment-status-tooltip"
        data-tooltip-content={error}
        className={`relative flex items-center gap-x-1 rounded-lg bg-theme-attachment-error-bg border-none w-[180px] group`}
      >
        <div className="invisible group-hover:visible absolute -top-[5px] -right-[5px] w-fit h-fit z-[10]">
          <button
            onClick={removeFileFromQueue}
            type="button"
            className="bg-white hover:bg-error hover:text-theme-attachment-text rounded-full p-1 flex items-center justify-center hover:border-transparent border border-theme-attachment-bg"
          >
            <X size={10} className="flex-shrink-0" />
          </button>
        </div>
        <div
          className={`bg-error rounded-md flex items-center justify-center flex-shrink-0 h-[32px] w-[32px] m-1`}
        >
          <WarningOctagon size={24} className="text-theme-attachment-icon" />
        </div>
        <div className="flex flex-col w-[125px]">
          <p className="text-theme-attachment-text text-xs font-semibold truncate">
            {file.name}
          </p>
          <p className="text-theme-attachment-text-secondary text-[10px] leading-[14px] font-medium truncate">
            {error ?? t("attachments.fileNotEmbedded")}
          </p>
        </div>
      </div>
    );
  }

  if (type === "attachment") {
    if (contentString) {
      return (
        <div
          data-tooltip-id="attachment-status-tooltip"
          data-tooltip-content={t("attachments.willBeAttachedPrompt", {
            name: file.name,
          })}
          className={`relative flex items-center gap-x-1 rounded-lg border-none group`}
        >
          <div className="invisible group-hover:visible absolute -top-[5px] -right-[5px] w-fit h-fit z-[10]">
            <button
              onClick={removeFileFromQueue}
              type="button"
              className="bg-white hover:bg-error hover:text-theme-attachment-text rounded-full p-1 flex items-center justify-center hover:border-transparent border border-theme-attachment-bg"
            >
              <X size={10} className="flex-shrink-0" />
            </button>
          </div>
          <button
            type="button"
            onClick={onImageClick}
            className="p-0 border-none bg-transparent cursor-pointer"
          >
            <img
              alt={t("attachments.previewOf", { name: file.name })}
              src={contentString}
              className={`${iconBgColor} w-[40px] h-[40px] rounded-lg flex items-center justify-center object-cover object-center`}
            />
          </button>
        </div>
      );
    }

    return (
      <div
        data-tooltip-id="attachment-status-tooltip"
        data-tooltip-content={t("attachments.willBeAttachedPrompt", {
          name: file.name,
        })}
        className={`relative flex items-center gap-x-1 rounded-lg bg-theme-attachment-success-bg border-none w-[180px] group`}
      >
        <div className="invisible group-hover:visible absolute -top-[5px] -right-[5px] w-fit h-fit z-[10]">
          <button
            onClick={removeFileFromQueue}
            type="button"
            className="bg-white hover:bg-error hover:text-theme-attachment-text rounded-full p-1 flex items-center justify-center hover:border-transparent border border-theme-attachment-bg"
          >
            <X size={10} className="flex-shrink-0" />
          </button>
        </div>
        <div
          className={`${iconBgColor} rounded-md flex items-center justify-center flex-shrink-0 h-[32px] w-[32px] m-1`}
        >
          <Icon size={24} className="text-theme-attachment-icon" />
        </div>
        <div className="flex flex-col w-[125px]">
          <p className="text-theme-attachment-text text-xs font-semibold truncate">
            {file.name}
          </p>
          <p className="text-theme-attachment-text-secondary text-[10px] leading-[14px] font-medium">
            {t("attachments.imageAttached")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-tooltip-id="attachment-status-tooltip"
      data-tooltip-content={
        status === "embedded"
          ? t("attachments.wasEmbedded", { name: file.name })
          : t("attachments.willBeUsedAsContext", { name: file.name })
      }
      className={`relative flex items-center gap-x-1 rounded-lg bg-theme-attachment-bg border-none w-[180px] group`}
    >
      <div className="invisible group-hover:visible absolute -top-[5px] -right-[5px] w-fit h-fit z-[10]">
        <button
          onClick={removeFileFromQueue}
          type="button"
          className="bg-white hover:bg-error hover:text-theme-attachment-text rounded-full p-1 flex items-center justify-center hover:border-transparent border border-theme-attachment-bg"
        >
          <X size={10} className="flex-shrink-0" />
        </button>
      </div>
      <div
        className={`${iconBgColor} rounded-md flex items-center justify-center flex-shrink-0 h-[32px] w-[32px] m-1`}
      >
        <Icon size={24} weight="light" className="text-theme-attachment-icon" />
      </div>
      <div className="flex flex-col w-[125px]">
        <p className="text-theme-text-primary text-xs font-semibold truncate">
          {file.name}
        </p>
        <p className="text-theme-attachment-text-secondary text-[10px] leading-[14px] font-medium">
          {status === "embedded"
            ? t("attachments.fileEmbedded")
            : t("attachments.addedAsContext")}
        </p>
      </div>
    </div>
  );
}

/**
 * @param {File} file
 * @returns {{iconBgColor:string, Icon: React.Component}}
 */
function displayFromFile(file: any) {
  const extension = file?.name?.split(".")?.pop()?.toLowerCase() ?? "txt";
  switch (extension) {
    case "pdf":
      return { iconBgColor: "bg-magenta", Icon: FilePdf };
    case "doc":
    case "docx":
      return { iconBgColor: "bg-royalblue", Icon: FileDoc };
    case "html":
      return { iconBgColor: "bg-purple", Icon: FileHtml };
    case "csv":
    case "xlsx":
      return { iconBgColor: "bg-success", Icon: FileCsv };
    case "json":
    case "sql":
    case "js":
    case "jsx":
    case "cpp":
    case "c":
      return { iconBgColor: "bg-warn", Icon: FileCode };
    case "png":
    case "jpg":
    case "jpeg":
      return { iconBgColor: "bg-royalblue", Icon: FileImage };
    default:
      return { iconBgColor: "bg-royalblue", Icon: FileText };
  }
}
