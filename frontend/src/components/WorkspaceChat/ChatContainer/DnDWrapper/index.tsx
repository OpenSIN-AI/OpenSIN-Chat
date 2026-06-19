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

export const DndUploaderContext = createContext<any>(undefined);
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
  const handleRemoveRef = useRef(null);
  const handlePastedAttachmentRef = useRef(null);
  const handleRemoveParsedFileRef = useRef(null);

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
      (prev as any).filter(
        (prevFile) => prevFile.document?.id !== document.id,
      ),
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
    const newAccepted = [];
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
   * Embeds attachments that are eligible for embedding - basically files that are not images.
   * @param {Attachment[]} newAttachments
   */
  async function embedEligibleAttachments(newAttachments: any = []) {
    window.dispatchEvent(new CustomEvent(ATTACHMENTS_PROCESSING_EVENT));
    const promises = [];

    const { currentContextTokenCount, contextWindow } =
      await mutateParsedFiles();
    const workspaceContextWindow = contextWindow
      ? Math.floor(contextWindow * Workspace.maxContextWindowLimit)
      : Number.POSITIVE_INFINITY;
    setMaxTokens(workspaceContextWindow);

    let totalTokenCount = currentContextTokenCount;
    const batchPendingFiles = [];

    for (const attachment of newAttachments) {
      // Images/attachments are chat specific.
      if (attachment.type === "attachment") continue;

      const formData = new FormData();
      formData.append("file", attachment.file, attachment.file.name);
      formData.append("threadSlug", threadSlug || null);
      promises.push(
        Workspace.parseFile(workspace.slug, formData).then(
          async ({ response, data }: any) => {
            if (!response.ok) {
              const updates = {
                status: "failed",
                error: data?.error ?? null,
              };
              setFiles((prev) =>
                (prev as any).map(
                  (
                    /** @type {Attachment} */
                    prevFile,
                  ) =>
                    prevFile.uid !== attachment.uid
                      ? prevFile
                      : { ...prevFile, ...updates },
                ),
              );
              return;
            }
            // Will always be one file in the array
            /** @type {ParsedFile} */
            const file = data.files[0];

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
            const result = {
              success: true,
              document: file,
              error: null as string | null,
            };
            const updates = {
              status: result.success ? "added_context" : "failed",
              error: result.error ?? null,
              document: result.document,
            };

            setFiles((prev) =>
              (prev as any).map(
                (
                  /** @type {Attachment} */
                  prevFile,
                ) =>
                  prevFile.uid !== attachment.uid
                    ? prevFile
                    : { ...prevFile, ...updates },
              ),
            );
          },
        ),
      );
    }

    // Wait for all promises to resolve in some way before dispatching the event to unlock the send button
    Promise.all(promises)
      .catch((e) => console.error("Attachment processing error:", e))
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
    const newAccepted = [];
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
    embedEligibleAttachmentsRef.current(newAccepted);
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
      console.error("Failed to delete parsed files:", e);
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
    const fileMap = new Map(
      (docData?.files || []).map((f: any) => [f.id, f]),
    );
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
        status: results[i].success ? "success" : "failed",
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
      console.error("Failed to embed files:", e);
      showToast(t("dndWrapper.embedFailed"), "error");
    } finally {
      setIsEmbedding(false);
    }
  };

  const contextValue = useMemo(
    () => ({ files, ready, dragging, setDragging, onDrop, parseAttachments }),
    [files, ready, dragging, onDrop, parseAttachments],
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
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    disabled: !ready,
    noClick: true,
    noKeyboard: true,
    onDragEnter: () => setDragging(true),
    onDragLeave: () => setDragging(false),
  });

  return (
    <div
      className={`relative flex flex-col h-full w-full md:mt-0 mt-[40px] p-[1px]`}
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
            <p className="text-white text-[24px] font-semibold">
              {t("dndWrapper.addAnything")}
            </p>
            <p className="text-white text-[16px] text-center">
              {t("dndWrapper.dropFileOrImage")}
              <br />
              {t("dndWrapper.workspaceAutoMagically")}
            </p>
          </div>
        </div>
      </div>
      <input id="dnd-chat-file-uploader" {...getInputProps()} />
      {children}
    </div>
  );
}

/**
 * Convert image types into Base64 strings for requests.
 * @param {File} file
 * @returns {Promise<string>}
 */
async function toBase64(file: any) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Unexpected result type"));
        return;
      }
      const base64String = reader.result.split(",")[1];
      resolve(`data:${file.type};base64,${base64String}`);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
