// SPDX-License-Identifier: MIT
// Helper functions and constants for FilesystemSidebar
import { FilePdf } from "@phosphor-icons/react/dist/csr/FilePdf";
import { FileImage } from "@phosphor-icons/react/dist/csr/FileImage";
import { FileVideo } from "@phosphor-icons/react/dist/csr/FileVideo";
import { FileAudio } from "@phosphor-icons/react/dist/csr/FileAudio";
import { FileArchive } from "@phosphor-icons/react/dist/csr/FileArchive";
import { FileCode } from "@phosphor-icons/react/dist/csr/FileCode";
import { FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { File } from "@phosphor-icons/react/dist/csr/File";

export const ALL_FILE_EXTENSIONS = [
  ".txt",
  ".md",
  ".pdf",
  ".csv",
  ".json",
  ".html",
  ".docx",
  ".doc",
  ".rtf",
  ".epub",
  ".xlsx",
  ".pptx",
  ".xml",
  ".yaml",
  ".yml",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".bmp",
  ".tiff",
  ".mp4",
  ".avi",
  ".mov",
  ".mkv",
  ".webm",
  ".mp3",
  ".wav",
  ".flac",
  ".ogg",
  ".m4a",
  ".zip",
  ".tar",
  ".gz",
  ".rar",
  ".7z",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".c",
  ".cpp",
];

export const IMAGE_EXTS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".bmp",
  ".tiff",
];
export const VIDEO_EXTS = [".mp4", ".avi", ".mov", ".mkv", ".webm"];
export const AUDIO_EXTS = [".mp3", ".wav", ".flac", ".ogg", ".m4a"];
export const ARCHIVE_EXTS = [".zip", ".tar", ".gz", ".rar", ".7z"];
export const CODE_EXTS = [
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".c",
  ".cpp",
];

export function getFileIcon(ext: string) {
  if (ext === ".pdf") return FilePdf;
  if (IMAGE_EXTS.includes(ext)) return FileImage;
  if (VIDEO_EXTS.includes(ext)) return FileVideo;
  if (AUDIO_EXTS.includes(ext)) return FileAudio;
  if (ARCHIVE_EXTS.includes(ext)) return FileArchive;
  if (CODE_EXTS.includes(ext)) return FileCode;
  if (ALL_FILE_EXTENSIONS.includes(ext)) return FileText;
  return File;
}

/**
 * Maps a file extension to a PreviewSidebar `previewData.type`. Every file is
 * previewable: PDFs/images render natively, everything else falls back to the
 * IframePreview (which itself offers a download/open-externally view for types
 * the browser can't render inline).
 */
export function getPreviewType(ext: string): "pdf" | "image" | "file" {
  if (ext === ".pdf") return "pdf";
  if (IMAGE_EXTS.includes(ext)) return "image";
  return "file";
}

const EXT_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".tiff": "image/tiff",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".csv": "text/csv",
  ".json": "application/json",
  ".html": "text/html",
  ".xml": "application/xml",
};

/**
 * Best-effort MIME type from an extension, used as a fallback when a downloaded
 * blob has no `type` (some servers return application/octet-stream). Matters for
 * the DnD uploader: image MIME → chat attachment (vision), otherwise → embed.
 */
export function mimeFromExt(ext: string) {
  return EXT_MIME[ext?.toLowerCase()] || "application/octet-stream";
}

export function getFileColor(ext: string) {
  if (ext === ".pdf") return "text-red-400 light:text-red-500";
  if (IMAGE_EXTS.includes(ext)) return "text-green-400 light:text-green-500";
  if (VIDEO_EXTS.includes(ext)) return "text-purple-400 light:text-purple-500";
  if (AUDIO_EXTS.includes(ext)) return "text-amber-400 light:text-amber-500";
  if (ARCHIVE_EXTS.includes(ext))
    return "text-orange-400 light:text-orange-500";
  if (CODE_EXTS.includes(ext)) return "text-blue-400 light:text-blue-500";
  return "text-zinc-400 light:text-slate-500";
}

export function formatSize(bytes: number) {
  if (!bytes || bytes === 0) return "\u2014";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatRelativeDate(dateStr: string, t: any) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = (now as any) - (date as any);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return t("sidebar.filesystem.today", "heute");
  if (diffDays === 1) return t("sidebar.filesystem.yesterday", "gestern");
  if (diffDays < 7)
    return t("sidebar.filesystem.daysAgo", "vor {{count}} Tagen", {
      count: diffDays,
    });
  if (diffDays < 30)
    return t("sidebar.filesystem.weeksAgo", "vor {{count}} Wochen", {
      count: Math.floor(diffDays / 7),
    });
  return date.toLocaleDateString();
}

export function getBreadcrumbs(path: string, t: any) {
  const crumbs = [{ name: t("sidebar.filesystem.uploadsRoot"), path: "" }];
  if (!path) return crumbs;
  const parts = path.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current = current ? current + "/" + part : part;
    crumbs.push({ name: part, path: current });
  }
  return crumbs;
}
