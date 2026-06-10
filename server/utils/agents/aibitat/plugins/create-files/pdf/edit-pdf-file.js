// SPDX-License-Identifier: MIT
const createFilesLib = require("../lib.js");
const { applyBranding } = require("./utils.js");

module.exports.EditPdfFile = {
  name: "edit-pdf-file",
  plugin: function () {
    return {
      name: "edit-pdf-file",
      setup(aibitat) {
        aibitat.function({
          super: aibitat,
          name: "edit-pdf-file",
          description:
            "Create or replace a PDF document with new markdown or plain text content. " +
            "This is similar to create-pdf-file but always applies full OpenSIN branding " +
            "and is intended for regenerating existing documents with updated content. " +
            "Supports markdown formatting including headers, lists, code blocks, tables, and more.",
          examples: [
            {
              prompt: "Update the quarterly report PDF with new data",
              call: JSON.stringify({
                filename: "updated-quarterly-report.pdf",
                content:
                  "# Updated Quarterly Report\n\n## Revised Numbers\n- Revenue: $1.5M\n- Growth: 18% YoY",
              }),
            },
            {
              prompt: "Create a branded PDF meeting summary",
              call: JSON.stringify({
                filename: "meeting-summary.pdf",
                content:
                  "# Meeting Summary\n\n**Date:** February 2024\n\n## Key Decisions\n1. Approved budget increase\n2. New hiring plan",
              }),
            },
          ],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              filename: {
                type: "string",
                description:
                  "The filename for the PDF document. The .pdf extension will be added automatically if not provided.",
              },
              content: {
                type: "string",
                description:
                  "The markdown or plain text content to convert to PDF. Supports full markdown syntax including headers (#, ##, ###), bold (**text**), italic (*text*), lists, code blocks, tables, and more.",
              },
            },
            required: ["filename", "content"],
            additionalProperties: false,
          },
          handler: async function ({
            filename = "document.pdf",
            content = "",
          }) {
            try {
              this.super.handlerProps.log(
                `Using the edit-pdf-file tool for "${filename}".`,
              );

              const hasExtension = /\.pdf$/i.test(filename);
              if (!hasExtension) filename = `${filename}.pdf`;

              if (this.super.requestToolApproval) {
                const approval = await this.super.requestToolApproval({
                  skillName: this.name,
                  payload: { filename },
                  description: `Create branded PDF document "${filename}"`,
                });
                if (!approval.approved) {
                  this.super.introspect(
                    `${this.caller}: User rejected the ${this.name} request.`,
                  );
                  return approval.message;
                }
              }

              this.super.introspect(
                `${this.caller}: Creating branded PDF document "${filename}"`,
              );

              const { markdownToPdf } = await import(
                "@mintplex-labs/mdpdf"
              );
              const { PDFDocument, rgb, StandardFonts } = await import(
                "pdf-lib"
              );

              const rawBuffer = await markdownToPdf(content);
              const pdfDoc = await PDFDocument.load(rawBuffer);
              await applyBranding(pdfDoc, { rgb, StandardFonts });

              const buffer = await pdfDoc.save();
              const bufferSizeKB = (buffer.length / 1024).toFixed(2);
              const displayFilename = filename.split("/").pop();

              const savedFile = await createFilesLib.saveGeneratedFile({
                fileType: "pdf",
                extension: "pdf",
                buffer,
                displayFilename,
              });

              this.super.socket.send("fileDownloadCard", {
                filename: savedFile.displayFilename,
                storageFilename: savedFile.filename,
                fileSize: savedFile.fileSize,
              });

              createFilesLib.registerOutput(
                this.super,
                "PdfFileDownload",
                {
                  filename: savedFile.displayFilename,
                  storageFilename: savedFile.filename,
                  fileSize: savedFile.fileSize,
                },
              );

              this.super.introspect(
                `${this.caller}: Successfully created branded PDF "${displayFilename}"`,
              );

              return `Successfully created branded PDF document "${displayFilename}" (${bufferSizeKB}KB).`;
            } catch (e) {
              this.super.handlerProps.log(
                `edit-pdf-file error: ${e.message}`,
              );
              this.super.introspect(`Error: ${e.message}`);
              return `Error creating PDF document: ${e.message}`;
            }
          },
        });
      },
    };
  },
};
