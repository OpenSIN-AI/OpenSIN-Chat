// SPDX-License-Identifier: MIT
import { CloudArrowUp } from "@phosphor-icons/react/dist/csr/CloudArrowUp";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import showToast from "../../../../../utils/toast";
import { useDropzone } from "react-dropzone";
import { v4 } from "uuid";
import FileUploadProgress from "./FileUploadProgress";
import Workspace from "../../../../../models/workspace";
import debounce from "lodash.debounce";
import useDocumentProcessorOnline from "@/hooks/useDocumentProcessorOnline";

export default function UploadFile({
  workspace,
  fetchKeys,
  setLoading,
  setLoadingMessage,
}: any) {
  const { t } = useTranslation();
  const [files, setFiles] = useState<string[]>([]);
  const [fetchingUrl, setFetchingUrl] = useState<boolean>(false);
  const { isOnline: ready } = useDocumentProcessorOnline();

  const handleSendLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoadingMessage(t("connectors.upload.scrapingLink"));
    setFetchingUrl(true);
    const formEl = e.target;
    const form = new FormData(formEl);
    try {
      const { response, data } = await Workspace.uploadLink(
        workspace.slug,
        form.get("link"),
      );
      if (!response.ok) {
        showToast(
          t("connectors.upload.linkUploadError", { error: data.error }),
          "error",
        );
      } else {
        await fetchKeys(true, { autoSelectNew: true });
        showToast(t("connectors.upload.linkUploadSuccess"), "success");
        formEl.reset();
      }
    } catch (err) {
      showToast(
        t("connectors.upload.linkUploadError", { error: String(err) }),
        "error",
      );
    }
    setLoading(false);
    setFetchingUrl(false);
  };

  const debouncedFetchKeysRef = useRef(
    debounce((fn, opts) => fn(true, opts), 1000),
  );
  const handleUploadSuccess = () =>
    debouncedFetchKeysRef.current(fetchKeys, { autoSelectNew: true });
  const handleUploadError = () => debouncedFetchKeysRef.current(fetchKeys, {});

  const onDrop = async (acceptedFiles, rejections) => {
    const newAccepted = (acceptedFiles as any).map((file) => {
      return {
        uid: v4(),
        file,
      };
    });
    const newRejected = (rejections as any).map((file) => {
      return {
        uid: v4(),
        file: file.file,
        rejected: true,
        reason: file.errors?.[0]?.code ?? "unknown",
      };
    });
    setFiles([...newAccepted, ...newRejected]);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    disabled: !ready,
  });

  return (
    <div>
      <div
        className={`w-[560px] border-dashed border-[2px] border-theme-modal-border light:border-[#686C6F] rounded-2xl bg-theme-bg-primary transition-colors duration-300 p-3 ${
          ready
            ? " light:bg-[#E0F2FE] cursor-pointer hover:bg-theme-bg-secondary light:hover:bg-transparent"
            : "cursor-not-allowed"
        }`}
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        {ready === false ? (
          <div className="flex flex-col items-center justify-center h-full">
            <CloudArrowUp
              className="w-8 h-8 text-theme-text-primary light:invert"
              aria-hidden="true"
            />
            <div className="text-theme-text-primary text-sm font-semibold py-1">
              {t("connectors.upload.processor-offline")}
            </div>
            <div className="text-theme-text-secondary text-xs font-medium py-1 px-20 text-center">
              {t("connectors.upload.processor-offline-desc")}
            </div>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center">
            <CloudArrowUp
              className="w-8 h-8 text-theme-text-primary light:invert"
              aria-hidden="true"
            />
            <div className="text-theme-text-primary text-sm font-semibold py-1">
              {t("connectors.upload.click-upload")}
            </div>
            <div className="text-theme-text-secondary text-xs font-medium py-1">
              {t("connectors.upload.file-types")}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 overflow-auto max-h-[180px] p-1 overflow-y-scroll no-scroll">
            {(files as any).map((file) => (
              <FileUploadProgress
                key={file.uid}
                file={file.file}
                uuid={file.uid}
                setFiles={setFiles}
                slug={workspace.slug}
                rejected={file?.rejected}
                reason={file?.reason}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
                setLoading={setLoading}
                setLoadingMessage={setLoadingMessage}
              />
            ))}
          </div>
        )}
      </div>
      <div className="text-center text-theme-text-secondary text-xs font-medium w-[560px] py-2">
        {t("connectors.upload.or-submit-link")}
      </div>
      <form onSubmit={handleSendLink} className="flex gap-x-2">
        <input
          disabled={fetchingUrl}
          name="link"
          type="url"
          className="border-none disabled:bg-theme-settings-input-bg disabled:text-theme-settings-input-placeholder bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-3/4 p-2.5"
          placeholder={t("connectors.upload.placeholder-link")}
          autoComplete="off"
        />
        <button
          disabled={fetchingUrl}
          type="submit"
          className="disabled:bg-white/20 disabled:text-slate-300 disabled:border-slate-400 disabled:cursor-wait bg bg-transparent hover:bg-slate-200 hover:text-slate-800 w-auto border border-white light:border-theme-modal-border text-sm text-white p-2.5 rounded-lg"
        >
          {fetchingUrl
            ? t("connectors.upload.fetching")
            : t("connectors.upload.fetch-website")}
        </button>
      </form>
      <div className="mt-6 text-center text-theme-text-primary text-xs font-medium w-[560px]">
        {t("connectors.upload.privacy-notice")}
      </div>
    </div>
  );
}
