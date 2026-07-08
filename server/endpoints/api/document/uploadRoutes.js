// SPDX-License-Identifier: MIT
// Purpose: Document upload route handlers (file upload, link upload, raw text).
// Extracted from document/index.js as part of issue #510 God-File split.

const consoleLogger = require("../../../utils/logger/console.js");
const { Telemetry } = require("../../../models/telemetry");
const { validApiKey } = require("../../../utils/middleware/validApiKey");
const { simpleRateLimit } = require("../../../utils/middleware/simpleRateLimit");
const {
  handleAPIFileUpload,
  mirrorToSupabase,
} = require("../../../utils/files/multer");
const { normalizePath, isWithin } = require("../../../utils/files");
const { reqBody, safeJsonParse } = require("../../../utils/http");
const { EventLogs } = require("../../../models/eventLogs");
const { CollectorApi } = require("../../../utils/collectorApi");
const fs = require("fs");
const path = require("path");
const { Document } = require("../../../models/documents");
const { validateBody } = require("../../../utils/middleware/validateBody");
const { DocumentSchemas } = require("../../../utils/validation/schemas");
const { getStoragePath } = require("../../../utils/paths");
const documentsPath = getStoragePath("documents");
const { validateWorkspaceSlugQuery, cleanupHotdirFile } = require("./helpers");

/**
 * Registers document upload routes on the Express app.
 * @param {import('express').Express} app
 */
function registerUploadRoutes(app) {
  app.post(
    "/v1/document/upload",
    [validApiKey, handleAPIFileUpload, validateWorkspaceSlugQuery, simpleRateLimit({ bucket: "doc-upload", max: 10, windowMs: 60 * 1000 })],
    async (request, response) => {
      /*
    #swagger.tags = ['Documents']
    #swagger.description = 'Upload a new file to OpenSIN Chat to be parsed and prepared for embedding, with optional metadata.'
    #swagger.requestBody = {
      description: 'File to be uploaded.',
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: 'object',
            required: ['file'],
            properties: {
              file: {
                type: 'string',
                format: 'binary',
                description: 'The file to upload'
              },
              addToWorkspaces: {
                type: 'string',
                description: 'comma-separated text-string of workspace slugs to embed the document into post-upload. eg: workspace1,workspace2',
              },
              metadata: {
                type: 'object',
                description: 'Key:Value pairs of metadata to attach to the document in JSON Object format. Only specific keys are allowed - see example.',
                example: { 'title': 'Custom Title', 'docAuthor': 'Author Name', 'description': 'A brief description', 'docSource': 'Source of the document' }
              }
            },
            required: ['file']
          }
        }
      }
    }
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
              success: true,
              error: null,
              documents: [
                {
                  "location": "custom-documents/opensin.txt-6e8be64c-c162-4b43-9997-b068c0071e8b.json",
                  "name": "opensin.txt-6e8be64c-c162-4b43-9997-b068c0071e8b.json",
                  "url": "file:///Users/tim/Documents/opensin-chat/collector/hotdir/opensin.txt",
                  "title": "opensin.txt",
                  "docAuthor": "Unknown",
                  "description": "Unknown",
                  "docSource": "a text file uploaded by the user.",
                  "chunkSource": "opensin.txt",
                  "published": "1/16/2024, 3:07:00 PM",
                  "wordCount": 93,
                  "token_count_estimate": 115,
                }
              ]
            }
          }
        }
      }
    }
    #swagger.responses[403] = {
      schema: {
        "$ref": "#/definitions/InvalidAPIKey"
      }
    }
    */
      try {
        const Collector = new CollectorApi();
        const { originalname } = request.file;
        const { addToWorkspaces = "", metadata: _metadata = {} } =
          reqBody(request);
        const metadata =
          typeof _metadata === "string"
            ? safeJsonParse(_metadata, {})
            : _metadata;
        const collectorFilename = request.file.filename || originalname;
        if (!metadata.title) metadata.title = originalname;
        const processingOnline = await Collector.online();

        if (!processingOnline) {
          await cleanupHotdirFile(request);
          response
            .status(500)
            .json({
              success: false,
              error: `Document processing API is not online. Document ${originalname} will not be processed automatically.`,
            })
            .end();
          return;
        }

        // Out-of-band Supabase durability mirror — the API client never
        // waits for the OCI → Supabase roundtrip.
        const mirrorPromise = mirrorToSupabase(request).catch(() => {});

        const { success, reason, documents } = await Collector.processDocument(
          collectorFilename,
          metadata,
        );

        if (!success || !documents?.length) {
          await mirrorPromise;
          await cleanupHotdirFile(request);
          return response
            .status(500)
            .json({ success: false, error: reason, documents })
            .end();
        }

        Collector.log(
          `Document ${originalname} uploaded processed and successfully. It is now available in documents.`,
        );
        await Telemetry.sendTelemetry("document_uploaded");
        await EventLogs.logEvent("api_document_uploaded", {
          documentName: originalname,
        });

        if (!!addToWorkspaces)
          await Document.api.uploadToWorkspace(
            addToWorkspaces,
            documents?.[0].location,
          );
        response.status(200).json({ success: true, error: null, documents });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.post(
    "/v1/document/upload/:folderName",
    [validApiKey, handleAPIFileUpload, validateWorkspaceSlugQuery, simpleRateLimit({ bucket: "doc-upload", max: 10, windowMs: 60 * 1000 })],
    async (request, response) => {
      /*
      #swagger.tags = ['Documents']
      #swagger.description = 'Upload a new file to a specific folder in OpenSIN Chat to be parsed and prepared for embedding. If the folder does not exist, it will be created.'
      #swagger.parameters['folderName'] = {
        in: 'path',
        description: 'Target folder path (defaults to \"custom-documents\" if not provided)',
        required: true,
        type: 'string',
        example: 'my-folder'
      }
      #swagger.requestBody = {
        description: 'File to be uploaded, with optional metadata.',
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: 'object',
              required: ['file'],
              properties: {
                file: {
                  type: 'string',
                  format: 'binary',
                  description: 'The file to upload'
                },
                addToWorkspaces: {
                  type: 'string',
                  description: 'comma-separated text-string of workspace slugs to embed the document into post-upload. eg: workspace1,workspace2',
                },
                metadata: {
                  type: 'object',
                  description: 'Key:Value pairs of metadata to attach to the document in JSON Object format. Only specific keys are allowed - see example.',
                  example: { 'title': 'Custom Title', 'docAuthor': 'Author Name', 'description': 'A brief description', 'docSource': 'Source of the document' }
                }
              }
            }
          }
        }
      }
      #swagger.responses[200] = {
        content: {
          "application/json": {
            schema: {
              type: 'object',
              example: {
                success: true,
                error: null,
                documents: [{
                  "location": "custom-documents/opensin.txt-6e8be64c-c162-4b43-9997-b068c0071e8b.json",
                  "name": "opensin.txt-6e8be64c-c162-4b43-9997-b068c0071e8b.json",
                  "url": "file:///Users/tim/Documents/opensin-chat/collector/hotdir/opensin.txt",
                  "title": "opensin.txt",
                  "docAuthor": "Unknown",
                  "description": "Unknown",
                  "docSource": "a text file uploaded by the user.",
                  "chunkSource": "opensin.txt",
                  "published": "1/16/2024, 3:07:00 PM",
                  "wordCount": 93,
                  "token_count_estimate": 115
                }]
              }
            }
          }
        }
      }
      #swagger.responses[403] = {
        schema: {
          "$ref": "#/definitions/InvalidAPIKey"
        }
      }
      #swagger.responses[500] = {
        description: "Internal Server Error",
        content: {
          "application/json": {
            schema: {
              type: 'object',
              example: {
                success: false,
                error: "Document processing API is not online. Document will not be processed automatically."
              }
            }
          }
        }
      }
      */
      try {
        const { originalname } = request.file;
        const { addToWorkspaces = "", metadata: _metadata = {} } =
          reqBody(request);
        const metadata =
          typeof _metadata === "string"
            ? safeJsonParse(_metadata, {})
            : _metadata;
        const collectorFilename = request.file.filename || originalname;
        if (!metadata.title) metadata.title = originalname;

        let folder = request.params?.folderName || "custom-documents";
        folder = normalizePath(folder);
        const targetFolderPath = path.join(documentsPath, folder);

        if (
          !isWithin(path.resolve(documentsPath), path.resolve(targetFolderPath))
        )
          throw new Error("Invalid folder name");
        try {
          await fs.promises.access(targetFolderPath);
        } catch {
          await fs.promises.mkdir(targetFolderPath, { recursive: true });
        }

        const Collector = new CollectorApi();
        const processingOnline = await Collector.online();
        if (!processingOnline) {
          await cleanupHotdirFile(request);
          return response
            .status(500)
            .json({
              success: false,
              error: `Document processing API is not online. Document ${originalname} will not be processed automatically.`,
            })
            .end();
        }

        // Out-of-band Supabase durability mirror (see /v1/document/upload).
        const mirrorPromise = mirrorToSupabase(request).catch(() => {});

        // Process the uploaded document with metadata
        const { success, reason, documents } = await Collector.processDocument(
          collectorFilename,
          metadata,
        );
        if (!success || !documents?.length) {
          await mirrorPromise;
          await cleanupHotdirFile(request);
          return response
            .status(500)
            .json({ success: false, error: reason, documents })
            .end();
        }

        // For each processed document, check if it is already in the desired folder.
        // If not, move it using similar logic as in the move-files endpoint.
        for (const doc of documents) {
          const currentFolder = path.dirname(doc.location);
          if (currentFolder !== folder) {
            const sourcePath = path.join(
              documentsPath,
              normalizePath(doc.location),
            );
            const destinationPath = path.join(
              targetFolderPath,
              path.basename(doc.location),
            );

            if (
              !isWithin(documentsPath, sourcePath) ||
              !isWithin(documentsPath, destinationPath)
            )
              throw new Error("Invalid file location");

            await fs.promises.rename(sourcePath, destinationPath);
            doc.location = path.join(folder, path.basename(doc.location));
            doc.name = path.basename(doc.location);
          }
        }

        Collector.log(
          `Document ${originalname} uploaded, processed, and moved to folder ${folder} successfully.`,
        );

        await Telemetry.sendTelemetry("document_uploaded");
        await EventLogs.logEvent("api_document_uploaded", {
          documentName: originalname,
          folder,
        });

        if (!!addToWorkspaces)
          await Document.api.uploadToWorkspace(
            addToWorkspaces,
            documents?.[0].location,
          );
        response.status(200).json({ success: true, error: null, documents });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.post(
    "/v1/document/upload-link",
    [validApiKey, validateWorkspaceSlugQuery, validateBody(DocumentSchemas.uploadLink), simpleRateLimit({ bucket: "doc-upload", max: 10, windowMs: 60 * 1000 })],
    async (request, response) => {
      /*
    #swagger.tags = ['Documents']
    #swagger.description = 'Upload a valid URL for OpenSIN Chat to scrape and prepare for embedding. Optionally, specify a comma-separated list of workspace slugs to embed the document into post-upload.'
    #swagger.requestBody = {
      description: 'Link of web address to be scraped and optionally a comma-separated list of workspace slugs to embed the document into post-upload, and optional metadata.',
      required: true,
      content: {
          "application/json": {
            schema: {
              type: 'object',
              example: {
                "link": "https://sinchat.delqhi.com",
                "addToWorkspaces": "workspace1,workspace2",
                "scraperHeaders": {
                  "Authorization": "Bearer token123",
                  "My-Custom-Header": "value"
                },
                "metadata": {
                  "title": "Custom Title",
                  "docAuthor": "Author Name",
                  "description": "A brief description",
                  "docSource": "Source of the document"
                }
              }
            }
          }
        }
    }
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
              success: true,
              error: null,
              documents: [
                {
                  "id": "c530dbe6-bff1-4b9e-b87f-710d539d20bc",
                  "url": "file://useanything_com.html",
                  "title": "useanything_com.html",
                  "docAuthor": "no author found",
                  "description": "No description found.",
                  "docSource": "URL link uploaded by the user.",
                  "chunkSource": "https:sinchat.delqhi.com.html",
                  "published": "1/16/2024, 3:46:33 PM",
                  "wordCount": 252,
                  "pageContent": "OpenSIN Chat is the best....",
                  "token_count_estimate": 447,
                  "location": "custom-documents/url-useanything_com-c530dbe6-bff1-4b9e-b87f-710d539d20bc.json"
                }
              ]
            }
          }
        }
      }
    }
    #swagger.responses[403] = {
      schema: {
        "$ref": "#/definitions/InvalidAPIKey"
      }
    }
    */
      try {
        const Collector = new CollectorApi();
        const {
          link,
          addToWorkspaces = "",
          scraperHeaders = {},
          metadata: _metadata = {},
        } = reqBody(request);
        if (!link || typeof link !== "string" || !link.trim()) {
          return response
            .status(400)
            .json({
              success: false,
              error: "link is required and must be a non-empty string.",
            })
            .end();
        }
        const metadata =
          typeof _metadata === "string"
            ? safeJsonParse(_metadata, {})
            : _metadata;
        const processingOnline = await Collector.online();

        if (!processingOnline) {
          return response
            .status(500)
            .json({
              success: false,
              error: `Document processing API is not online. Link ${link} will not be processed automatically.`,
            })
            .end();
        }

        const { success, reason, documents } = await Collector.processLink(
          link,
          scraperHeaders,
          metadata,
        );
        if (!success || !documents?.length) {
          return response
            .status(500)
            .json({ success: false, error: reason, documents })
            .end();
        }

        Collector.log(
          `Link ${link} uploaded processed and successfully. It is now available in documents.`,
        );
        await Telemetry.sendTelemetry("link_uploaded");
        await EventLogs.logEvent("api_link_uploaded", {
          link,
        });

        if (!!addToWorkspaces)
          await Document.api.uploadToWorkspace(
            addToWorkspaces,
            documents?.[0].location,
          );
        response.status(200).json({ success: true, error: null, documents });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.post(
    "/v1/document/raw-text",
    [validApiKey, validateWorkspaceSlugQuery, validateBody(DocumentSchemas.uploadText), simpleRateLimit({ bucket: "doc-upload", max: 10, windowMs: 60 * 1000 })],
    async (request, response) => {
      /*
     #swagger.tags = ['Documents']
     #swagger.description = 'Upload a file by specifying its raw text content and metadata values without having to upload a file.'
     #swagger.requestBody = {
      description: 'Text content and metadata of the file to be saved to the system. Use metadata-schema endpoint to get the possible metadata keys',
      required: true,
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
              "textContent": "This is the raw text that will be saved as a document in OpenSIN Chat.",
              "addToWorkspaces": "workspace1,workspace2",
              "metadata": {
                "title": "This key is required. See in /server/endpoints/api/document/index.js:287",
                "keyOne": "valueOne",
                "keyTwo": "valueTwo",
                "etc": "etc"
              }
            }
          }
        }
      }
     }
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
              success: true,
              error: null,
              documents: [
                {
                  "id": "c530dbe6-bff1-4b9e-b87f-710d539d20bc",
                  "url": "file://my-document.txt",
                  "title": "hello-world.txt",
                  "docAuthor": "no author found",
                  "description": "No description found.",
                  "docSource": "My custom description set during upload",
                  "chunkSource": "no chunk source specified",
                  "published": "1/16/2024, 3:46:33 PM",
                  "wordCount": 252,
                  "pageContent": "OpenSIN Chat is the best....",
                  "token_count_estimate": 447,
                  "location": "custom-documents/raw-my-doc-text-c530dbe6-bff1-4b9e-b87f-710d539d20bc.json"
                }
              ]
            }
          }
        }
      }
     }
     #swagger.responses[403] = {
       schema: {
         "$ref": "#/definitions/InvalidAPIKey"
       }
     }
     */
      try {
        const Collector = new CollectorApi();
        const requiredMetadata = ["title"];
        const {
          textContent,
          metadata: _metadata = {},
          addToWorkspaces = "",
        } = reqBody(request);
        const metadata =
          typeof _metadata === "string"
            ? safeJsonParse(_metadata, {})
            : _metadata;
        const processingOnline = await Collector.online();

        if (!processingOnline) {
          return response
            .status(500)
            .json({
              success: false,
              error: `Document processing API is not online. Request will not be processed.`,
            })
            .end();
        }

        if (
          !requiredMetadata.every(
            (reqKey) =>
              Object.keys(metadata).includes(reqKey) && !!metadata[reqKey],
          )
        ) {
          return response
            .status(422)
            .json({
              success: false,
              error: `You are missing required metadata key:value pairs in your request. Required metadata key:values are ${requiredMetadata
                .map((v) => `'${v}'`)
                .join(", ")}`,
            })
            .end();
        }

        if (
          !textContent ||
          typeof textContent !== "string" ||
          textContent?.length === 0
        ) {
          return response
            .status(422)
            .json({
              success: false,
              error: `The 'textContent' key cannot have an empty value.`,
            })
            .end();
        }

        const { success, reason, documents } = await Collector.processRawText(
          textContent,
          metadata,
        );
        if (!success || !documents?.length) {
          return response
            .status(500)
            .json({ success: false, error: reason, documents })
            .end();
        }

        Collector.log(
          `Document created successfully. It is now available in documents.`,
        );
        await Telemetry.sendTelemetry("raw_document_uploaded");
        await EventLogs.logEvent("api_raw_document_uploaded");

        if (!!addToWorkspaces)
          await Document.api.uploadToWorkspace(
            addToWorkspaces,
            documents?.[0].location,
          );
        response.status(200).json({ success: true, error: null, documents });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );
}

module.exports = { registerUploadRoutes };
