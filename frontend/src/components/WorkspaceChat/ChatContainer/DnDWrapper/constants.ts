// SPDX-License-Identifier: MIT
import { createContext } from "react";

export const PDF_UPLOADED_EVENT = "PDF_UPLOADED";
export const REMOVE_ATTACHMENT_EVENT = "ATTACHMENT_REMOVE";
export const CLEAR_ATTACHMENTS_EVENT = "ATTACHMENT_CLEAR";
export const PASTE_ATTACHMENT_EVENT = "ATTACHMENT_PASTED";
export const ATTACHMENTS_PROCESSING_EVENT = "ATTACHMENTS_PROCESSING";
export const ATTACHMENTS_PROCESSED_EVENT = "ATTACHMENTS_PROCESSED";
export const PARSED_FILE_ATTACHMENT_REMOVED_EVENT =
  "PARSED_FILE_ATTACHMENT_REMOVED";

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
