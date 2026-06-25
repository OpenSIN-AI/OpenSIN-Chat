// SPDX-License-Identifier: MIT
const { htmlToText } = require("html-to-text");
const pdf = require("pdf-parse");
const fs = require("fs");
const os = require("os");
const path = require("path");

const MAX_DOCUMENT_BYTES = 500 * 1024 * 1024;
const MAX_PAGES = 10_000;
const PAPERLESS_MAX_RETRIES = 3;

class PaperlessNgxLoader {
  constructor({ baseUrl, apiToken }) {
    this.baseUrl = new URL(baseUrl).origin;
    this.apiToken = apiToken;
    this.baseHeaders = {
      Authorization: `Token ${this.apiToken}`,
    };
  }

  async load() {
    try {
      const documents = await this.fetchAllDocuments();
      return documents.map((doc) => this.createDocumentFromPage(doc));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error:", error);
      throw error;
    }
  }

  /**
   * Streams a Paperless-ngx document to a temp file while enforcing a hard
   * byte cap. Returns { tempPath, contentType } or null on failure. Caller is
   * responsible for fs.rmSync(tempPath, { force: true }) after use.
   * @param {string} documentId
   * @returns {Promise<{tempPath: string, contentType: string}|null>}
   */
  async downloadDocumentToTemp(documentId, retries = 0) {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 60_000);
    let response;
    try {
      response = await fetch(
        `${this.baseUrl}/api/documents/${documentId}/download/`,
        {
          headers: this.baseHeaders,
          signal: abortController.signal,
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 429 && retries < PAPERLESS_MAX_RETRIES) {
      const retryAfter = Number(response.headers.get("retry-after")) || 30;
      // eslint-disable-next-line no-console
      console.warn(
        `[PaperlessNgx] Rate limit (429) for document ${documentId}. Waiting ${retryAfter}s before retry ${
          retries + 1
        }/${PAPERLESS_MAX_RETRIES}…`
      );
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      return this.downloadDocumentToTemp(documentId, retries + 1);
    }

    if (!response.ok)
      throw new Error(`Failed to fetch document content: ${response.status}`);

    const contentType = (response.headers.get("content-type") || "")
      .toLowerCase()
      .split(";")[0]
      .trim();
    const contentLength = parseInt(
      response.headers.get("content-length") || "0",
      10
    );
    if (contentLength > MAX_DOCUMENT_BYTES)
      throw new Error(
        `Document too large (Content-Length ${contentLength} > ${MAX_DOCUMENT_BYTES})`
      );

    const tempPath = path.join(os.tmpdir(), `paperless-${documentId}`);
    const reader = response.body?.getReader?.();

    if (reader) {
      const writeStream = fs.createWriteStream(tempPath);
      let bytesWritten = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytesWritten += value.length;
          if (bytesWritten > MAX_DOCUMENT_BYTES) {
            await reader.cancel();
            writeStream.destroy();
            fs.rmSync(tempPath, { force: true });
            throw new Error(
              `Document exceeded ${MAX_DOCUMENT_BYTES} bytes during streaming (cap reached at ${bytesWritten})`
            );
          }
          if (!writeStream.write(value)) {
            await new Promise((resolve) => writeStream.once("drain", resolve));
          }
        }
        await new Promise((resolve, reject) => {
          writeStream.end((err) => (err ? reject(err) : resolve()));
        });
      } catch (e) {
        try {
          fs.rmSync(tempPath, { force: true });
        } catch {}
        throw e;
      }
    } else {
      try {
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > MAX_DOCUMENT_BYTES) {
          throw new Error(
            `Document exceeded ${MAX_DOCUMENT_BYTES} bytes (got ${buffer.byteLength})`
          );
        }
        await fs.promises.writeFile(tempPath, Buffer.from(buffer));
      } catch (e) {
        try {
          fs.rmSync(tempPath, { force: true });
        } catch {}
        throw e;
      }
    }

    return { tempPath, contentType };
  }

  /**
   * Fetches all documents from Paperless-ngx
   * @returns {Promise<{{[key: string]: any, content: string}[]}>} The documents with their content
   */
  async fetchAllDocuments() {
    try {
      const documents = [];
      let nextUrl = `${this.baseUrl}/api/documents/`;
      let page = 1;

      while (nextUrl && documents.length < MAX_PAGES) {
        // eslint-disable-next-line no-console
        console.log(`Fetching documents page ${page} from Paperless-ngx`);
        let rateLimitRetries = 0;
        try {
          const abortController = new AbortController();
          const timeout = setTimeout(() => abortController.abort(), 30_000);
          let response;
          try {
            response = await fetch(nextUrl, {
              headers: {
                "Content-Type": "application/json",
                ...this.baseHeaders,
              },
              signal: abortController.signal,
            });
          } finally {
            clearTimeout(timeout);
          }

          while (
            response.status === 429 &&
            rateLimitRetries < PAPERLESS_MAX_RETRIES
          ) {
            const retryAfter =
              Number(response.headers.get("retry-after")) || 30;
            // eslint-disable-next-line no-console
            console.warn(
              `[PaperlessNgx] Rate limit (429) on page ${page}. Waiting ${retryAfter}s (retry ${
                rateLimitRetries + 1
              }/${PAPERLESS_MAX_RETRIES})…`
            );
            await new Promise((r) => setTimeout(r, retryAfter * 1000));
            rateLimitRetries++;
            const retryAbort = new AbortController();
            const retryTimeout = setTimeout(() => retryAbort.abort(), 30_000);
            try {
              response = await fetch(nextUrl, {
                headers: {
                  "Content-Type": "application/json",
                  ...this.baseHeaders,
                },
                signal: retryAbort.signal,
              });
            } finally {
              clearTimeout(retryTimeout);
            }
          }

          if (response.status === 429) {
            // eslint-disable-next-line no-console
            console.warn(
              `[PaperlessNgx] Rate limit persists on page ${page} after ${PAPERLESS_MAX_RETRIES} retries. Stopping.`
            );
            break;
          }

          if (!response.ok)
            throw new Error(
              `Failed to fetch documents from Paperless-ngx: ${response.status}`
            );
          const data = await response.json();

          const validResults = Array.isArray(data.results)
            ? data.results.filter((doc) => doc?.id)
            : [];
          if (!validResults.length) break;

          documents.push(...validResults);
          if (documents.length >= MAX_PAGES) {
            // eslint-disable-next-line no-console
            console.warn(
              `[PaperlessNgx] Reached MAX_PAGES=${MAX_PAGES} — truncating document list.`
            );
            break;
          }

          if (data.next === nextUrl) break;
          nextUrl = data.next || null;
          page++;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(
            `Error fetching page ${page} from Paperless-ngx:`,
            error
          );
          break;
        }
      }

      // eslint-disable-next-line no-console
      console.log(
        `Fetched ${documents.length} documents from Paperless-ngx (Pages: ${
          page - 1
        })`
      );

      const documentsWithContent = [];
      for (const doc of documents) {
        const content = await this.fetchDocumentContent(doc.id);
        documentsWithContent.push({ ...doc, content });
      }

      return documentsWithContent.filter((doc) => !!doc.content);
    } catch (error) {
      throw new Error(
        `Failed to fetch documents from Paperless-ngx: ${error.message}`
      );
    }
  }

  /**
   * Fetches the content of a document from Paperless-ngx
   * @param {string} documentId - The ID of the document to fetch
   * @returns {Promise<string>} The content of the document
   */
  async fetchDocumentContent(documentId) {
    let downloaded = null;
    try {
      downloaded = await this.downloadDocumentToTemp(documentId);
      const { tempPath, contentType } = downloaded;

      try {
        switch (contentType) {
          case "text/plain":
            return await fs.promises.readFile(tempPath, "utf8");
          case "application/pdf":
            return await this.parsePdfFromTemp(tempPath);
          default:
            return await fs.promises.readFile(tempPath, "utf8");
        }
      } finally {
        try {
          fs.rmSync(tempPath, { force: true });
        } catch {}
      }
    } catch (error) {
      if (downloaded?.tempPath) {
        try {
          fs.rmSync(downloaded.tempPath, { force: true });
        } catch {}
      }
      // eslint-disable-next-line no-console
      console.error(
        `Failed to fetch content for document ${documentId}:`,
        error
      );
      return "";
    }
  }

  async parsePdfFromTemp(tempPath) {
    try {
      const buffer = await fs.promises.readFile(tempPath);
      const data = await pdf(buffer, { isEvalSupported: false });
      return data.text;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to parse PDF content:", error);
      return "";
    }
  }

  createDocumentFromPage(doc) {
    const content = doc.content || "";
    const plainTextContent = htmlToText(content, {
      wordwrap: false,
      preserveNewlines: true,
    });

    return {
      pageContent: plainTextContent,
      metadata: {
        id: doc.id,
        title: doc.original_file_name,
        created: doc.created,
        modified: doc.modified,
        added: doc.added,
        tags: doc.tags,
        correspondent: doc.correspondent,
        documentType: doc.document_type,
        url: `${this.baseUrl}/documents/${doc.id}`,
      },
    };
  }
}

module.exports = PaperlessNgxLoader;
