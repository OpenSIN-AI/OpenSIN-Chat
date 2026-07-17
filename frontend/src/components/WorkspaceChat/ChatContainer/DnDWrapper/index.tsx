// SPDX-License-Identifier: MIT
import {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { v4 } from "uuid";
import { useDropzone } from "react-dropzone";
import DndIcon from "./dnd-icon.png";
import Workspace from "@/models/workspace";
import useDocument from "@/hooks/useDocument";
import useDocumentProcessorOnline from "@/hooks/useDocumentProcessorOnline";
import showToast from "@/utils/toast";
import FileUploadWarningModal from "./FileUploadWarningModal";
import { useTranslation } from "react-i18next";
import { useChatSidebar } from "../ChatSidebar";
import logger from "@/utils/logger";

export const PDF_UPLOADED_EVENT = "PDF_UPLOADED";

function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

export const DndUploaderContext = createContext<{
  files: any[];
  parseAttachments: () => any[];
  onDrop?: (acceptedFiles: any[], rejections?: any[]) => void | Promise<void>;
  attachExternalFile?: (file: File) => Promise<string>;
  ready?: boolean;
  dragging?: boolean;
  setDragging?: (dragging: boolean) => void;
}>({
  files: [],
  parseAttachments: () => [],
});
export const REMOVE_ATTACHMENT_EVENT = "ATTACHMENT_REMOVE";
export const CLEAR_ATTACHMENTS_EVENT = "ATTACHMENT_CLEAR";
export const PASTE_ATTACHMENT_EVENT = "ATTACHMENT_PASTED";
export const ATTACHMENTS_PROCESSING_EVENT = "ATTACHMENTS_PROCESSING";
export const ATTACHMENTS_PROCESSED_EVENT = "ATTACHMENTS_PROCESSED";
export const PARSED_FILE_ATTACHMENT_REMOVED_EVENT =
  "PARSED_FILE_ATTACHMENT_REMOVED";

/**
 * File Attachment for automatic upload on the chat container page.
 * @typedef Attachment
 * @property {string} uid - unique file id.
 * @property {File} file - native File object
 * @property {string|null} contentString - base64 encoded string of file
 * @property {('in_progress'|'failed'|'embedded'|'added_context')} status - the automatic upload status.
 * @property {string|null} error - Error message
 * @property {{id:string, location:string}|null} document - uploaded document details
 * @property {('attachment'|'upload')} type - The type of upload. Attachments are chat-specific, uploads go to the workspace.
 * @property {('uploading'|'processing')|null} [phase] - current in_progress sub-phase (upload vs server-side parsing).
 * @property {number|null} [progress] - upload progress percent (0-100) while phase === "uploading".
 */

/**
 * @typedef {Object} ParsedFile
 * @property {number} id - The id of the parsed file.
 * @property {string} filename - The name of the parsed file.
 * @property {number} workspaceId - The id of the workspace the parsed file belongs to.
 * @property {string|null} userId - The id of the user the parsed file belongs to.
 * @property {string|null} threadId - The id of the thread the parsed file belongs to.
 * @property {string} metadata - The metadata of the parsed file.
 * @property {number} tokenCountEstimate - The estimated token count of the parsed file.
 */

export function DnDFileUploaderProvider({
  workspace,
  threadSlug = null,
  children,
}: any) {
  const { t } = useTranslation();
  const [files, setFiles] = useState([] as any);
  const { isOnline: ready } = useDocumentProcessorOnline();
  const [dragging, setDragging] = useState(false as any);
  const [showWarningModal, setShowWarningModal] = useState(false as any);
  const [isEmbedding, setIsEmbedding] = useState(false as any);
  const [embedProgress, setEmbedProgress] = useState(0 as any);
  const [pendingFiles, setPendingFiles] = useState([] as any);
  const [tokenCount, setTokenCount] = useState(0 as any);
  const [maxTokens, setMaxTokens] = useState(Number.POSITIVE_INFINITY as any);

  const { mutate: mutateParsedFiles } = useDocument(
    workspace?.slug,
    threadSlug,
  );

  // Refs to always point at the latest handler closures so the
  // window event listeners (registered once on mount) never go stale.
  const handleRemoveRef = useRef<any>(null);
  const handlePastedAttachmentRef = useRef<any>(null);
  const handleRemoveParsedFileRef = useRef<any>(null);

  useEffect(() => {
    function onRemove(e) {
      handleRemoveRef.current?.(e);
    }
    function onReset() {
      setFiles([]);
    }
    function onPasted(e) {
      handlePastedAttachmentRef.current?.(e);
    }
    function onParsedRemove(e) {
      handleRemoveParsedFileRef.current?.(e);
    }
    window.addEventListener(REMOVE_ATTACHMENT_EVENT, onRemove);
    window.addEventListener(CLEAR_ATTACHMENTS_EVENT, onReset);
    window.addEventListener(PASTE_ATTACHMENT_EVENT, onPasted);
    window.addEventListener(
      PARSED_FILE_ATTACHMENT_REMOVED_EVENT,
      onParsedRemove,
    );

    return () => {
      window.removeEventListener(REMOVE_ATTACHMENT_EVENT, onRemove);
      window.removeEventListener(CLEAR_ATTACHMENTS_EVENT, onReset);
      window.removeEventListener(PASTE_ATTACHMENT_EVENT, onPasted);
      window.removeEventListener(
        PARSED_FILE_ATTACHMENT_REMOVED_EVENT,
        onParsedRemove,
      );
    };
  }, []);

  /**
   * Handles the removal of a parsed file attachment from the uploader queue.
   * Only uses the document id to remove the file from the queue
   * @param {CustomEvent<{document: ParsedFile}>} event
   */
  async function handleRemoveParsedFile(event: any) {
    const { document } = event.detail;
    setFiles((prev) =>
      (prev as any).filter((prevFile) => prevFile.document?.id !== document.id),
    );
  }

  /**
   * Remove file from uploader queue.
   * @param {CustomEvent<{uid: string}>} event
   */
  async function handleRemove(event: any) {
    /** @type {{uid: Attachment['uid'], document: Attachment['document']}} */
    const { uid, document } = event.detail;
    setFiles((prev) =>
      (prev as any).filter((prevFile) => prevFile.uid !== uid),
    );
    if (!document?.location) return;
    await Workspace.deleteAndUnembedFile(workspace.slug, document.location);
  }

  /**
   * Clear queue of attached files currently in prompt box
   */
  function resetAttachments() {
    setFiles([]);
  }

  /**
   * Turns files into attachments we can send as body request to backend
   * for a chat.
   * @returns {{name:string,mime:string,contentString:string}[]}
   */
  const parseAttachments = useCallback(() => {
    return (
      files
        ?.filter((file) => file.type === "attachment")
        ?.map(
          (
            /** @type {Attachment} */
            attachment,
          ) => {
            return {
              name: attachment.file.name,
              mime: attachment.file.type,
              contentString: attachment.contentString,
            };
          },
        ) || []
    );
  }, [files]);

  /**
   * Handle pasted attachments.
   * @param {CustomEvent<{files: File[]}>} event
   */
  async function handlePastedAttachment(event: any) {
    const { files = [] } = event.detail;
    if (!files.length) return;
    const newAccepted: any[] = [];
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        newAccepted.push({
          uid: v4(),
          file,
          contentString: await toBase64(file),
          status: "success",
          error: null,
          type: "attachment",
        });
      } else {
        newAccepted.push({
          uid: v4(),
          file,
          contentString: null,
          status: "in_progress",
          error: null,
          type: "upload",
        });
      }
    }
    setFiles((prev) => [...prev, ...newAccepted]);
    embedEligibleAttachments(newAccepted);
  }

  /**
   * Updates a single attachment in the queue by uid.
   * @param {string} uid
   * @param {object} updates
   */
  function updateAttachment(uid: string, updates: any) {
    setFiles((prev) =>
      (prev as any).map((prevFile) =>
        prevFile.uid !== uid ? prevFile : { ...prevFile, ...updates },
      ),
    );
  }

  /**
   * Polls the async parse job until it completes or fails.
   * @param {string} jobId
   * @returns {Promise<{status: string, files?: object[]|null, error?: string|null}>}
   */
  async function pollParseJob(jobId: string) {
    const POLL_INTERVAL_MS = 300; // Fast polling for instant feedback (was 1500ms)
    const MAX_POLL_MS = 5 * 60 * 1000; // Match server-side 5min timeout (was 30min)
    const MAX_TRANSIENT_RETRIES = 20; // consecutive 429/5xx/network failures
    const MAX_BACKOFF_MS = 30 * 1000;
    const startedAt = Date.now();
    let transientFailures = 0;

    while (Date.now() - startedAt < MAX_POLL_MS) {
      const result = (await Workspace.parseFileStatus(
        workspace.slug,
        jobId,
      )) as {
        success?: boolean;
        status?: string;
        error?: string;
        statusCode?: number;
        retryAfterMs?: number;
      };

      if (result?.success) {
        transientFailures = 0;
        if (result.status === "completed" || result.status === "failed")
          return result;
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        continue;
      }

      // Terminal: the job no longer exists (expired, swept, or invalid id).
      // Parsing itself may have succeeded — the caller refreshes the parsed
      // file list either way, so only the poll result is lost.
      if (result?.statusCode === 404)
        return { status: "failed", error: result?.error ?? null };

      // Transient: 429 (rate limited), 5xx (restart), or network blip.
      // The job keeps running server-side — back off and retry instead of
      // declaring the upload dead on the first hiccup.
      transientFailures += 1;
      if (transientFailures > MAX_TRANSIENT_RETRIES)
        return { status: "failed", error: result?.error ?? null };
      const backoffMs =
        result?.retryAfterMs ??
        Math.min(
          POLL_INTERVAL_MS * 2 ** Math.min(transientFailures, 4),
          MAX_BACKOFF_MS,
        );
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
    return { status: "failed", error: "Processing timed out." };
  }

  /**
   * Embeds attachments that are eligible for embedding - basically files that are not images.
   * Uploads with real progress reporting, then polls the async parse job
   * until the document is ready as chat context.
   * @param {Attachment[]} newAttachments
   */
  async function embedEligibleAttachments(newAttachments: any = []) {
    window.dispatchEvent(new CustomEvent(ATTACHMENTS_PROCESSING_EVENT));
    const promises: any[] = [];

    const { currentContextTokenCount, contextWindow } =
      await mutateParsedFiles();
    const workspaceContextWindow = contextWindow
      ? Math.floor(contextWindow * Workspace.maxContextWindowLimit)
      : Number.POSITIVE_INFINITY;
    setMaxTokens(workspaceContextWindow);

    let totalTokenCount = currentContextTokenCount;
    const batchPendingFiles: any[] = [];

    for (const attachment of newAttachments) {
      // Images/attachments are chat specific.
      if (attachment.type === "attachment") continue;

      const formData = new FormData();
      formData.append("file", attachment.file, attachment.file.name);
      if (threadSlug) formData.append("threadSlug", threadSlug);
      updateAttachment(attachment.uid, { phase: "uploading", progress: 0 });

      promises.push(
        (async () => {
          const uploadResult = (await Workspace.uploadAndParseFile(
            workspace.slug,
            formData,
            {
              onUploadProgress: (percent: number) =>
                updateAttachment(attachment.uid, {
                  phase: "uploading",
                  progress: percent,
                }),
            },
          )) as { success?: boolean; jobId?: string; error?: string };

          if (!uploadResult?.success || !uploadResult?.jobId) {
            const errorMsg =
              uploadResult?.error ?? t("attachments.fileNotEmbedded");
            showToast(errorMsg, "error");
            updateAttachment(attachment.uid, {
              status: "failed",
              error: uploadResult?.error ?? null,
              phase: null,
              progress: null,
            });
            return;
          }

          // Upload finished — server is now parsing in the background.
          updateAttachment(attachment.uid, {
            phase: "processing",
            progress: null,
          });

          const jobResult = (await pollParseJob(uploadResult.jobId)) as {
            status: string;
            files?: any[];
            error?: string;
            success?: boolean;
            statusCode?: number;
            retryAfterMs?: number;
          };
          if (jobResult.status !== "completed" || !jobResult.files?.[0]) {
            const errorMsg =
              jobResult.error ?? t("attachments.fileNotEmbedded");
            showToast(errorMsg, "error");
            updateAttachment(attachment.uid, {
              status: "failed",
              error: jobResult.error ?? null,
              phase: null,
              progress: null,
            });
            return;
          }

          // Will always be one file in the array
          /** @type {ParsedFile} */
          const file = jobResult.files[0];

          // Add token count for this file
          // and add it to the batch pending files
          totalTokenCount += file.tokenCountEstimate;
          batchPendingFiles.push({
            attachment,
            parsedFileId: file.id,
            tokenCount: file.tokenCountEstimate,
          });

          if (totalTokenCount > workspaceContextWindow) {
            setTokenCount(totalTokenCount);
            setPendingFiles(batchPendingFiles);
            setShowWarningModal(true);
            return;
          }

          // File is within limits, keep in parsed files
          updateAttachment(attachment.uid, {
            status: "added_context",
            error: null,
            document: file,
            phase: null,
            progress: null,
          });
        })(),
      );
    }

    // Wait for all promises to resolve in some way before dispatching the event to unlock the send button
    Promise.all(promises)
      .catch((e) => logger.error("Attachment processing error:", e))
      .finally(() =>
        window.dispatchEvent(new CustomEvent(ATTACHMENTS_PROCESSED_EVENT)),
      );
  }

  // Keep a ref to the latest embedEligibleAttachments so onDrop can be
  // useCallback-stable without embedding the function in its deps.
  const embedEligibleAttachmentsRef = useRef(embedEligibleAttachments);
  embedEligibleAttachmentsRef.current = embedEligibleAttachments;

  // Keep refs to the latest event handler closures so the window event
  // listeners (registered once on mount) always call current versions.
  handleRemoveRef.current = handleRemove;
  handlePastedAttachmentRef.current = handlePastedAttachment;
  handleRemoveParsedFileRef.current = handleRemoveParsedFile;

  /**
   * Handle dropped files.
   * @param {Attachment[]} acceptedFiles
   * @param {any[]} _rejections
   */
  const onDrop = useCallback(async (acceptedFiles: any, _rejections: any) => {
    setDragging(false);

    /** @type {Attachment[]} */
    const newAccepted: any[] = [];
    for (const file of acceptedFiles) {
      if (file.type.startsWith("image/")) {
        newAccepted.push({
          uid: v4(),
          file,
          contentString: await toBase64(file),
          status: "success",
          error: null,
          type: "attachment",
        });
      } else {
        newAccepted.push({
          uid: v4(),
          file,
          contentString: null,
          status: "in_progress",
          error: null,
          type: "upload",
        });
      }
    }

    setFiles((prev) => [...prev, ...newAccepted]);
    if (newAccepted.some((f) => isPdfFile(f.file))) {
      window.dispatchEvent(new CustomEvent(PDF_UPLOADED_EVENT));
    }
    embedEligibleAttachmentsRef.current(newAccepted);
  }, []);

  /**
   * Attach a single externally-sourced File (e.g. fetched from the file
   * browser) as a chat attachment, reusing the same image-vs-embed logic as
   * onDrop, and return the generated uid so the caller can later remove it via
   * REMOVE_ATTACHMENT_EVENT (bidirectional list↔pill sync).
   * @param {File} file
   * @returns {Promise<string>} the attachment uid
   */
  const attachExternalFile = useCallback(async (file: File) => {
    const uid = v4();
    const isImage = file.type.startsWith("image/");
    const attachment = isImage
      ? {
          uid,
          file,
          contentString: await toBase64(file),
          status: "success",
          error: null,
          type: "attachment",
        }
      : {
          uid,
          file,
          contentString: null,
          status: "in_progress",
          error: null,
          type: "upload",
        };
    setFiles((prev) => [...prev, attachment]);
    if (isPdfFile(file)) {
      window.dispatchEvent(new CustomEvent(PDF_UPLOADED_EVENT));
    }
    if (!isImage) embedEligibleAttachmentsRef.current([attachment]);
    return uid;
  }, []);

  // Handle modal actions
  const handleCloseModal = async () => {
    if (!pendingFiles.length) return;

    try {
      // Delete all files from this batch
      await Workspace.deleteParsedFiles(
        workspace.slug,
        (pendingFiles as any).map((file) => file.parsedFileId),
      );
    } catch (e) {
      logger.error("Failed to delete parsed files:", e);
    }

    // Remove all files from this batch from the UI
    setFiles((prev) =>
      (prev as any).filter(
        (prevFile) =>
          !(pendingFiles as any).some(
            (file) => file.attachment.uid === prevFile.uid,
          ),
      ),
    );
    setShowWarningModal(false);
    setPendingFiles([]);
    setTokenCount(0);
    window.dispatchEvent(new CustomEvent(ATTACHMENTS_PROCESSED_EVENT));
  };

  const handleContinueAnyway = async () => {
    if (!pendingFiles.length) return;
    // Fetch the full document metadata (including `location`) for each
    // pending file so that subsequent removal via handleRemove can properly
    // call deleteAndUnembedFile. Without `location`, handleRemove silently
    // skips the backend delete, orphaning the document in the vector store.
    const docData = await mutateParsedFiles().catch(() => null);
    const fileMap = new Map((docData?.files || []).map((f: any) => [f.id, f]));
    const results = (pendingFiles as any).map((file) => {
      const fullDoc = fileMap.get(file.parsedFileId);
      return {
        success: true,
        document: fullDoc ?? { id: file.parsedFileId },
      };
    });

    const fileUpdates = (pendingFiles as any).map((file, i) => ({
      uid: file.attachment.uid,
      updates: {
        status: results[i].success ? "added_context" : "failed",
        error: results[i].error ?? null,
        document: results[i].document,
      },
    }));

    setFiles((prev) =>
      (prev as any).map((prevFile) => {
        const update = fileUpdates.find((f) => f.uid === prevFile.uid);
        return update ? { ...prevFile, ...update.updates } : prevFile;
      }),
    );
    setShowWarningModal(false);
    setPendingFiles([]);
    setTokenCount(0);
  };

  const handleEmbed = async () => {
    if (!pendingFiles.length) return;
    setIsEmbedding(true);
    setEmbedProgress(0);

    try {
      // Embed all pending files
      let completed = 0;
      const results = await Promise.all(
        (pendingFiles as any).map((file) =>
          Workspace.embedParsedFile(workspace.slug, file.parsedFileId).then(
            (result) => {
              completed++;
              setEmbedProgress(completed);
              return result;
            },
          ),
        ),
      );

      // Update status for all files
      const fileUpdates = (pendingFiles as any).map((file, i) => ({
        uid: file.attachment.uid,
        updates: {
          status: results[i].response.ok ? "embedded" : "failed",
          error: results[i].data?.error ?? null,
          document: results[i].data?.document,
        },
      }));

      setFiles((prev) =>
        (prev as any).map((prevFile) => {
          const update = fileUpdates.find((f) => f.uid === prevFile.uid);
          return update ? { ...prevFile, ...update.updates } : prevFile;
        }),
      );
      setShowWarningModal(false);
      setPendingFiles([]);
      setTokenCount(0);
      window.dispatchEvent(new CustomEvent(ATTACHMENTS_PROCESSED_EVENT));
      showToast(
        t("dndWrapper.filesEmbedded", { count: pendingFiles.length }),
        "success",
      );
    } catch (e) {
      logger.error("Failed to embed files:", e);
      showToast(t("dndWrapper.embedFailed"), "error");
    } finally {
      setIsEmbedding(false);
    }
  };

  const contextValue = useMemo(
    () => ({
      files,
      ready,
      dragging,
      setDragging,
      onDrop,
      attachExternalFile,
      parseAttachments,
    }),
    [files, ready, dragging, onDrop, attachExternalFile, parseAttachments],
  );

  return (
    <DndUploaderContext.Provider value={contextValue}>
      <FileUploadWarningModal
        show={showWarningModal}
        onClose={handleCloseModal}
        onContinue={handleContinueAnyway}
        onEmbed={handleEmbed}
        tokenCount={tokenCount}
        maxTokens={maxTokens}
        fileCount={pendingFiles.length}
        isEmbedding={isEmbedding}
        embedProgress={embedProgress}
      />
      {children}
    </DndUploaderContext.Provider>
  );
}

export default function DnDFileUploaderWrapper({ children }: any) {
  const { t } = useTranslation();
  const { onDrop, ready, dragging, setDragging } =
    useContext(DndUploaderContext);
  const { openSidebar } = useChatSidebar();

  useEffect(() => {
    function onPdfUploaded() {
      openSidebar("pdf-analysis");
    }
    window.addEventListener(PDF_UPLOADED_EVENT, onPdfUploaded);
    return () => window.removeEventListener(PDF_UPLOADED_EVENT, onPdfUploaded);
  }, [openSidebar]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    disabled: !ready,
    noClick: true,
    noKeyboard: true,
    onDragEnter: () => setDragging?.(true),
    onDragLeave: () => setDragging?.(false),
  });

  return (
    <div
      className={`relative flex flex-col h-full w-full mt-0 p-[1px]`}
      {...getRootProps()}
    >
      <div
        hidden={!dragging}
        className="absolute top-0 w-full h-full bg-dark-text/90 light:bg-[#C2E7FE]/90 rounded-2xl border-[4px] border-white z-[9999]"
      >
        <div className="w-full h-full flex justify-center items-center rounded-xl">
          <div className="flex flex-col gap-y-[14px] justify-center items-center">
            <img
              src={DndIcon}
              width={69}
              height={69}
              alt={t("dndWrapper.dragAndDropIcon")}
            />
            <p className="text-theme-text-primary light:text-zinc-900 text-[24px] font-semibold">
              {t("dndWrapper.addAnything")}
            </p>
            <p className="text-theme-text-primary light:text-zinc-700 text-[16px] text-center">
              {t("dndWrapper.dropFileOrImage")}
              <br />
              {t("dndWrapper.workspaceAutoMagically")}
            </p>
          </div>
        </div>
      </div>
      <input
        id="dnd-chat-file-uploader"
        aria-label={t("chat_window.attach_file")}
        {...getInputProps()}
      />
      {children}
    </div>
  );
}

/**
 * Maximum dimension (width or height) for compressed images.
 * Images larger than this are scaled down proportionally.
 */
const IMAGE_MAX_DIMENSION = 1024;
/**
 * JPEG quality for compressed images (0–1).
 * 0.8 keeps good visual quality while significantly reducing base64 size.
 */
const IMAGE_QUALITY = 0.8;
/**
 * Target maximum size for the base64 data URL (~600 KB).
 * The Fireworks API proxy enforces a 1 MB request body limit; the
 * system prompt + chat history + user text can consume 200–400 KB,
 * so the image data URL must stay well under 700 KB to avoid HTTP 413.
 */
const IMAGE_MAX_DATA_URL_BYTES = 600_000;

/**
 * Compress and resize an image File using a canvas, then return a
 * data URL.  Falls back to the original file if canvas is unavailable
 * (SSR / non-image types) or if the original is already small enough.
 * @param {File} file
 * @returns {Promise<string>}
 */
async function toBase64(file: any) {
  if (!file.type.startsWith("image/")) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") {
          reject(new Error("Unexpected result type"));
          return;
        }
        resolve(reader.result);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Unexpected result type"));
        return;
      }

      if (reader.result.length <= IMAGE_MAX_DATA_URL_BYTES) {
        resolve(reader.result);
        return;
      }

      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > IMAGE_MAX_DIMENSION || height > IMAGE_MAX_DIMENSION) {
          const scale = IMAGE_MAX_DIMENSION / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        let quality = IMAGE_QUALITY;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (dataUrl.length > IMAGE_MAX_DATA_URL_BYTES && quality > 0.3) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(dataUrl);
      };
      img.onerror = () => resolve(reader.result);
      img.src = reader.result;
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
