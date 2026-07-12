// SPDX-License-Identifier: MIT
import { useState, useEffect, useRef, memo } from "react";
import { useTranslation } from "react-i18next";
import { truncate } from "@/utils/strings";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { XCircle } from "@phosphor-icons/react/dist/csr/XCircle";
import { useDocumentUpload } from "@/hooks/useDocuments";
import { humanFileSize, milliToHms } from "../../../../../../utils/numbers";
import PreLoader from "../../../../../Preloader";

function FileUploadProgressComponent({
  slug,
  uuid,
  file,
  setFiles,
  rejected = false,
  reason = null,
  onUploadSuccess,
  onUploadError,
  setLoading,
  setLoadingMessage,
}: any) {
  const { t } = useTranslation();
  const [timerMs, setTimerMs] = useState<number>(10);
  const [status, setStatus] = useState("pending");
  const [error, setError] = useState("");
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const { upload } = useDocumentUpload();

  const fadeOut: any = (cb) => {
    setIsFadingOut(true);
    cb?.();
  };

  const beginFadeOut = () => {
    setIsFadingOut(false);
    setFiles((prev) => {
      return (prev as any).filter((item) => item.uid !== uuid);
    });
  };

  const mountedRef = useRef(true);
  const uploadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    mountedRef.current = true;
    let fadeTimeoutId: ReturnType<typeof setTimeout>;
    async function uploadFile() {
      setLoading(true);
      setLoadingMessage(t("uploadProgress.uploadingFile"));
      const start = Number(new Date());
      const formData = new FormData();
      formData.append("file", file, file.name);
      const timer = setInterval(() => {
        if (!mountedRef.current) {
          clearInterval(timer);
          return;
        }
        setTimerMs(Number(new Date()) - start);
      }, 100);
      uploadTimerRef.current = timer;

      // Chunk streaming not working in production so we just sit and wait
      try {
        const result = await upload({ slug, formData });
        const { response, data } = result;
        if (!mountedRef.current) return;
        if (!response.ok) {
          setStatus("failed");
          clearInterval(timer);
          onUploadError(data.error);
          setError(data.error);
        } else {
          setStatus("complete");
          clearInterval(timer);
          onUploadSuccess();
        }
      } catch (err: any) {
        if (!mountedRef.current) return;
        const message = err?.message || String(err);
        setStatus("failed");
        clearInterval(timer);
        onUploadError(message);
        setError(message);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setLoadingMessage("");
        }
      }

      // Begin fadeout timer to clear uploader queue.
      fadeTimeoutId = setTimeout(() => {
        if (!mountedRef.current) return;
        fadeOut(() => setTimeout(() => beginFadeOut(), 300));
      }, 5000);
    }
    if (!!file && !rejected) uploadFile();
    return () => {
      mountedRef.current = false;
      clearTimeout(fadeTimeoutId);
      if (uploadTimerRef.current) clearInterval(uploadTimerRef.current);
    };
  }, []);

  if (rejected) {
    return (
      <div
        className={`${
          isFadingOut ? "file-upload-fadeout" : "file-upload"
        } h-14 px-2 py-2 flex items-center gap-x-4 rounded-lg bg-error/40 light:bg-error/30 light:border-solid light:border-error/40 border border-transparent`}
      >
        <div className="w-6 h-6 flex-shrink-0">
          <XCircle
            color="var(--theme-bg-primary)"
            className="w-6 h-6 stroke-white bg-error rounded-full p-1 w-full h-full"
            aria-hidden="true"
          />
        </div>
        <div className="flex flex-col">
          <p className="text-white light:text-red-600 text-xs font-semibold">
            {truncate(file.name, 30)}
          </p>
          <p className="text-red-100 light:text-red-600 text-xs font-medium">
            {reason || t("uploadProgress.failedToUpload")}
          </p>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div
        className={`${
          isFadingOut ? "file-upload-fadeout" : "file-upload"
        } h-14 px-2 py-2 flex items-center gap-x-4 rounded-lg bg-error/40 light:bg-error/30 light:border-solid light:border-error/40 border border-transparent`}
      >
        <div className="w-6 h-6 flex-shrink-0">
          <XCircle
            color="var(--theme-bg-primary)"
            className="w-6 h-6 stroke-white bg-error rounded-full p-1 w-full h-full"
            aria-hidden="true"
          />
        </div>
        <div className="flex flex-col">
          <p className="text-white light:text-red-600 text-xs font-semibold">
            {truncate(file.name, 30)}
          </p>
          <p className="text-red-100 light:text-red-600 text-xs font-medium">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${
        isFadingOut ? "file-upload-fadeout" : "file-upload"
      } h-14 px-2 py-2 flex items-center gap-x-4 rounded-lg bg-zinc-800 light:border-solid light:border-theme-modal-border light:bg-theme-bg-sidebar border border-white/20 shadow-md`}
    >
      <div className="w-6 h-6 flex-shrink-0">
        {status !== "complete" ? (
          <div className="flex items-center justify-center">
            <PreLoader size="6" />
          </div>
        ) : (
          <CheckCircle
            color="var(--theme-bg-primary)"
            className="w-6 h-6 stroke-white bg-green-500 rounded-full p-1 w-full h-full"
            aria-hidden="true"
          />
        )}
      </div>
      <div className="flex flex-col">
        <p className="text-white light:text-theme-text-primary text-xs font-medium">
          {truncate(file.name, 30)}
        </p>
        <p className="text-theme-text-primary light:text-theme-text-secondary text-xs font-medium">
          {t("uploadProgress.fileSizeAndTime", {
            size: humanFileSize(file.size),
            time: milliToHms(timerMs),
          })}
        </p>
      </div>
    </div>
  );
}

export default memo(FileUploadProgressComponent);
