// SPDX-License-Identifier: MIT
const fs = require("fs").promises;
const { validateArchive } = require("../../../../utils/safeUnzip");

const HARD_MAX_BYTES = 5 * 1024 * 1024 * 1024;

class PDFLoader {
  constructor(filePath, { splitPages = true } = {}) {
    this.filePath = filePath;
    this.splitPages = splitPages;
  }

  async load() {
    const stat = await fs.stat(this.filePath);
    if (stat.size > HARD_MAX_BYTES) {
      throw new Error(
        `[PDFLoader] Refusing ${this.filePath}: ${stat.size} bytes exceeds hard cap of ${HARD_MAX_BYTES}`
      );
    }
    if (stat.size > 100 * 1024 * 1024) {
      // eslint-disable-next-line no-console
      console.warn(
        `[PDFLoader] Large file detected (${(stat.size / 1024 / 1024).toFixed(
          1
        )}MB). Using streaming mode...`
      );
    }

    try {
      const guard = await validateArchive(this.filePath, {
        maxTotalBytes: HARD_MAX_BYTES,
        maxFiles: 1000,
        maxRatio: 1000,
      });
      if (guard?.safe === false) {
        throw new Error(
          `[PDFLoader] Archive pre-flight failed: ${guard.reason || "unknown"}`
        );
      }
    } catch (e) {
      if (e?.message?.startsWith("[PDFLoader]")) throw e;
      console.warn(
        `[PDFLoader] Archive pre-flight check threw an unexpected error, continuing without validation: ${e.message}`
      );
    }

    const { getDocument, version } = await this.getPdfJS();

    let pdf;
    try {
      if (stat.size > 100 * 1024 * 1024) {
        const fd = await fs.open(this.filePath, "r");
        pdf = await getDocument({
          data: {
            read: async (offset, length) => {
              const buf = Buffer.alloc(length);
              const { bytesRead } = await fd.read(buf, 0, length, offset);
              return new Uint8Array(buf.buffer, 0, bytesRead);
            },
            length: stat.size,
            chunkSize: 1024 * 1024 * 2,
          },
          useWorkerFetch: false,
          isEvalSupported: false,
          useSystemFonts: true,
        }).promise;
        await fd.close();
      } else {
        const buffer = await fs.readFile(this.filePath);
        pdf = await getDocument({
          data: new Uint8Array(
            buffer.buffer,
            buffer.byteOffset,
            buffer.byteLength
          ),
          useWorkerFetch: false,
          isEvalSupported: false,
          useSystemFonts: true,
        }).promise;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`[PDFLoader] Failed to load PDF: ${e.message}`);
      return [];
    }

    const meta = await pdf.getMetadata().catch(() => null);
    const documents = [];

    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      let content;
      try {
        content = await page.getTextContent();

        if (content.items.length === 0) {
          continue;
        }

        let lastY;
        const textItems = [];
        for (const item of content.items) {
          if ("str" in item) {
            if (lastY === undefined || lastY === item.transform[5]) {
              textItems.push(item.str);
            } else {
              textItems.push(`\n${item.str}`);
            }
            lastY = item.transform[5];
          }
        }

        const text = textItems.join("");
        documents.push({
          pageContent: text.trim(),
          metadata: {
            source: this.filePath,
            pdf: {
              version,
              info: meta?.info,
              metadata: meta?.metadata,
              totalPages: pdf.numPages,
            },
            loc: { pageNumber: i },
          },
        });
      } finally {
        try {
          if (typeof page.cleanup === "function") await page.cleanup();
        } catch {}
      }
    }

    if (this.splitPages) {
      return documents;
    }

    if (documents.length === 0) {
      return [];
    }

    return [
      {
        pageContent: documents.map((doc) => doc.pageContent).join("\n\n"),
        metadata: {
          source: this.filePath,
          pdf: {
            version,
            info: meta?.info,
            metadata: meta?.metadata,
            totalPages: pdf.numPages,
          },
        },
      },
    ];
  }

  async getPdfJS() {
    try {
      const pdfjs = await import("pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js");
      return { getDocument: pdfjs.getDocument, version: pdfjs.version };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      throw new Error(
        "Failed to load pdf-parse. Please install it with eg. `npm install pdf-parse`."
      );
    }
  }
}

module.exports = PDFLoader;
