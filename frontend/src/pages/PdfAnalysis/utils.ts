// SPDX-License-Identifier: MIT
// Utility functions for PdfAnalysis: formatting, heading extraction, and file downloads
import React from "react";

let docxMod = null;
let jsPDFMod = null;
const docxReady = () =>
  docxMod
    ? Promise.resolve(docxMod)
    : import("docx").then((m) => (docxMod = m));
const jsPDFReady = () =>
  jsPDFMod
    ? Promise.resolve(jsPDFMod)
    : import("jspdf").then((m) => (jsPDFMod = m.default ?? m));

export function formatEta(seconds: number | null): string | null {
  if (seconds == null) return null;
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h} h ${m} min`;
}

export interface Heading {
  level: number;
  text: string;
  id: string;
}

/**
 * Recursively extracts plain text from React children (strings, numbers,
 * arrays, and elements with nested children).  Needed because
 * String(children) on a React element yields "[object Object]".
 */
export function nodeToText(node: React.ReactNode): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (React.isValidElement(node))
    return nodeToText((node.props as any).children);
  return "";
}

/**
 * Parses a Markdown string and returns a flat list of heading objects
 * { level: 1|2|3, text: string, id: string } for the table of contents.
 */
export function extractHeadings(markdown = ""): Heading[] {
  const lines = markdown.split("\n");
  const headings: Heading[] = [];
  for (const line of lines) {
    const m = line.match(/^(#{1,3})\s+(.+)/);
    if (m) {
      const text = m[2].trim();
      headings.push({
        level: m[1].length,
        text,
        id: text
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-"),
      });
    }
  }
  return headings;
}

/**
 * Download the report as plain Markdown (.md).
 */
export function downloadMarkdown(
  filename: string,
  content: string,
  suffix: string,
) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/\.pdf$/i, "") + suffix + ".md";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Download the report as a DOCX file using the `docx` library.
 * Converts basic Markdown headings and paragraphs — bold/italic are preserved.
 */
export async function downloadDocx(
  filename: string,
  content: string,
  suffix: string,
) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } =
    await docxReady();
  const lines = content.split("\n");
  const children = [];

  for (const line of lines) {
    if (!line.trim()) {
      children.push(new Paragraph({ text: "" }));
      continue;
    }
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);
    if (h1) {
      children.push(
        new Paragraph({ text: h1[1], heading: HeadingLevel.HEADING_1 }),
      );
    } else if (h2) {
      children.push(
        new Paragraph({ text: h2[1], heading: HeadingLevel.HEADING_2 }),
      );
    } else if (h3) {
      children.push(
        new Paragraph({ text: h3[1], heading: HeadingLevel.HEADING_3 }),
      );
    } else {
      // Inline bold: **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const runs = parts.map((part) => {
        const bold = part.match(/^\*\*(.+)\*\*$/);
        return new TextRun({ text: bold ? bold[1] : part, bold: !!bold });
      });
      children.push(new Paragraph({ children: runs }));
    }
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/\.pdf$/i, "") + suffix + ".docx";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Download the report as a PDF using jsPDF.
 * Renders the text content line by line with basic heading detection.
 */
export async function downloadPdf(
  filename: string,
  content: string,
  suffix: string,
) {
  const JsPDF = await jsPDFReady();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const maxW = pageW - margin * 2;
  let y = margin;

  const lines = content.split("\n");

  for (const raw of lines) {
    const h1 = raw.match(/^#\s+(.*)/);
    const h2 = raw.match(/^##\s+(.*)/);
    const h3 = raw.match(/^###\s+(.*)/);
    const stripped = raw.replace(/^#{1,3}\s+/, "").replace(/\*\*/g, "");

    if (!stripped.trim()) {
      y += 4;
      continue;
    }

    if (h1) {
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
    } else if (h2) {
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
    } else if (h3) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
    }

    const wrapped = doc.splitTextToSize(stripped, maxW);
    for (const wline of wrapped) {
      if (y + 8 > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(wline, margin, y);
      y += h1 ? 9 : h2 ? 7 : h3 ? 6 : 5.5;
    }
  }

  doc.save(filename.replace(/\.pdf$/i, "") + suffix + ".pdf");
}
