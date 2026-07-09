// SPDX-License-Identifier: MIT
const fs = require("fs").promises;
const path = require("path");
const { validateArchive } = require("../../../../utils/safeUnzip");

const HARD_MAX_BYTES = 5 * 1024 * 1024 * 1024;

class PDFLoader {
  constructor(filePath, { splitPages = true } = {}) {
    this.filePath = filePath;
    this.splitPages = splitPages;
  }

  /**
   * Attempt to parse the PDF via the Docling HTTP service.
   *
   * Docling (IBM, MIT licence) runs a Vision-based layout analyser that
   * understands two-column layouts, tables, and headings — far better than
   * pdf.js text extraction for German parliamentary PDFs (Drucksachen,
   * Plenarprotokolle).
   *
   * Activation: set DOCLING_ENDPOINT in the environment (e.g.
   *   DOCLING_ENDPOINT=http://localhost:5001
   * The Docker service can be added to docker/docker-compose.yml — see the
   * comment at the bottom of this file).
   *
   * If Docling is unavailable or returns an error the method returns null
   * and the caller falls back to the standard pdf.js path — no data is lost.
   *
   * @returns {Promise<string|null>} Markdown string on success, null on any failure.
   */
  async #parseWithDocling() {
    const endpoint = process.env.DOCLING_ENDPOINT;
    if (!endpoint) return null;

    try {
      const { FormData, Blob, fetch } = await import("node-fetch").catch(
        () => {
          // Node 18+ ships native fetch; fall back gracefully if node-fetch
          // is not installed so this never breaks existing installations.
          return { FormData: global.FormData, Blob: global.Blob, fetch: global.fetch };
        },
      );

      const fileBuffer = await fs.readFile(this.filePath);
      const form = new FormData();
      form.append(
        "files",
        new Blob([fileBuffer], { type: "application/pdf" }),
        path.basename(this.filePath),
      );

      const res = await fetch(`${endpoint}/v1alpha/convert/file`, {
        method: "POST",
        body: form,
        // 2-minute timeout per file — large Drucksachen can take ~60 s.
        signal: AbortSignal.timeout(120_000),
      });

      if (!res.ok) {
        console.warn(
          `[PDFLoader] Docling HTTP ${res.status} for ${path.basename(this.filePath)} — falling back to pdf.js`,
        );
        return null;
      }

      const data = await res.json();
      // Docling ≥ 1.x: { document: { md_content: "..." } }
      // Docling 0.x fallback: { markdown: "..." }
      const markdown =
        data?.document?.md_content ?? data?.markdown ?? null;

      if (!markdown || markdown.trim().length === 0) return null;

      console.log(
        `[PDFLoader] Docling parsed ${path.basename(this.filePath)} (${markdown.length} chars)`,
      );
      return markdown;
    } catch (e) {
      console.warn(
        `[PDFLoader] Docling unavailable (${e.message}) — falling back to pdf.js`,
      );
      return null;
    }
  }

  async load() {
    // --- Docling fast-path (opt-in via DOCLING_ENDPOINT env var) ----------
    // Docling uses a vision model for layout analysis and returns Markdown
    // with real table / heading structure. This is significantly better for
    // German parliamentary documents than the pdf.js text extraction below.
    const doclingMarkdown = await this.#parseWithDocling();
    if (doclingMarkdown) {
      // Count heading lines as a rough proxy for "pages" when splitPages is
      // not applicable (Docling returns the whole document as one Markdown string).
      const headingCount =
        (doclingMarkdown.match(/^#{1,2} /gm) ?? []).length || 1;

      if (this.splitPages) {
        // Split on top-level markdown headings so each section becomes its
        // own document — preserves chunk granularity expected by downstream
        // embedders.
        const sections = doclingMarkdown
          .split(/(?=^# )/m)
          .filter((s) => s.trim().length > 0);

        if (sections.length > 1) {
          return sections.map((section, i) => ({
            pageContent: section.trim(),
            metadata: {
              source: this.filePath,
              parser: "docling",
              pdf: { totalPages: headingCount },
              loc: { pageNumber: i + 1 },
            },
          }));
        }
      }

      // Either splitPages = false or the document has no top-level headings
      // — return as a single document.
      return [
        {
          pageContent: doclingMarkdown,
          metadata: {
            source: this.filePath,
            parser: "docling",
            pdf: { totalPages: headingCount },
          },
        },
      ];
    }
    // --- End Docling fast-path — fall through to standard pdf.js path -----

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

    // Extract text from a single page number. pdf.js `PDFDocumentProxy.getPage`
    // and `PDFPageProxy.getTextContent` are safe to call concurrently on the
    // same document instance, so we batch them with a bounded concurrency limit
    // instead of running them sequentially.
    // Increased from 8 to 16 for faster parallel text extraction.
    // Modern Node.js handles 16 concurrent pdfjs.getPage() calls without
    // issues, and this cuts extraction time roughly in half for large PDFs.
    const BATCH_SIZE = 16;
    const pageNumbers = Array.from({ length: pdf.numPages }, (_, k) => k + 1);
    const results = []; // sparse: index = pageNumber - 1, value = text | null

    for (let b = 0; b < pageNumbers.length; b += BATCH_SIZE) {
      const batch = pageNumbers.slice(b, b + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (pageNum) => {
          const page = await pdf.getPage(pageNum);
          try {
            const content = await page.getTextContent();
            if (content.items.length === 0) return { pageNum, text: null };

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
            return { pageNum, text: textItems.join("").trim() };
          } finally {
            try {
              if (typeof page.cleanup === "function") await page.cleanup();
            } catch {}
          }
        })
      );
      results.push(...batchResults);
    }

    const documents = [];
    for (const { pageNum, text } of results) {
      if (text === null) continue;
      documents.push({
        pageContent: text,
        metadata: {
          source: this.filePath,
          pdf: {
            version,
            info: meta?.info,
            metadata: meta?.metadata,
            totalPages: pdf.numPages,
          },
          loc: { pageNumber: pageNum },
        },
      });
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
