// SPDX-License-Identifier: MIT
const createFilesLib = require("../lib.js");

module.exports.ReadPdfFile = {
  name: "read-pdf-file",
  plugin: function () {
    return {
      name: "read-pdf-file",
      setup(aibitat) {
        aibitat.function({
          super: aibitat,
          name: "read-pdf-file",
          description:
            "Read and extract text content from a PDF file that has been previously created or uploaded. " +
            "Provide the storage filename of the PDF to read. Returns the text content of the PDF.",
          examples: [
            {
              prompt: "Read the text from my quarterly report PDF",
              call: JSON.stringify({
                storageFilename: "pdf-report-uuid.pdf",
              }),
            },
          ],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              storageFilename: {
                type: "string",
                description:
                  "The storage filename of the PDF to read (e.g., 'pdf-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.pdf'). This is the filename from a previously created or uploaded PDF.",
              },
            },
            required: ["storageFilename"],
            additionalProperties: false,
          },
          handler: async function ({ storageFilename = "" }) {
            try {
              this.super.handlerProps.log(
                `Using the read-pdf-file tool for "${storageFilename}".`,
              );

              if (!storageFilename) {
                return "No storage filename provided. Please specify which PDF file to read.";
              }

              if (!/\.pdf$/i.test(storageFilename)) {
                storageFilename = `${storageFilename}.pdf`;
              }

              const generatedFile =
                await createFilesLib.getGeneratedFile(storageFilename);
              if (!generatedFile) {
                return `PDF file "${storageFilename}" not found. The file may have been deleted or the filename is incorrect.`;
              }

              // pdf-parse v2+ exports the PDFParse class instead of a
              // callable function. See: https://www.npmjs.com/package/pdf-parse
              let PDFParse;
              try {
                ({ PDFParse } = require("pdf-parse"));
                if (typeof PDFParse !== "function")
                  throw new Error("PDFParse export missing");
              } catch {
                return "PDF parsing library is not available. Please ensure pdf-parse v2+ is installed.";
              }

              const parser = new PDFParse({ data: generatedFile.buffer });
              const data = await parser.getText();

              this.super.introspect(
                `${this.caller}: Successfully read PDF "${storageFilename}" (${data.total} pages, ${data.text.length} characters)`,
              );

              const maxLength = 50000;
              const text =
                data.text.length > maxLength
                  ? data.text.slice(0, maxLength) +
                    `\n\n[Truncated: showing first ${maxLength} of ${data.text.length} characters. Total ${data.total} pages.]`
                  : data.text;

              return `Content of "${storageFilename}":\n\n${text}`;
            } catch (e) {
              this.super.handlerProps.log(`read-pdf-file error: ${e.message}`);
              this.super.introspect(`Error: ${e.message}`);
              return `Error reading PDF file: ${e.message}`;
            }
          },
        });
      },
    };
  },
};
