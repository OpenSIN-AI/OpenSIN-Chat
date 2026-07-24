// SPDX-License-Identifier: MIT
// Purpose: Document query/read route handlers (list, folder listing, metadata, single doc).
// Extracted from document/index.js as part of issue #510 God-File split.

const consoleLogger = require("../../../utils/logger/console.js");
const { validApiKey } = require("../../../utils/middleware/validApiKey");
const {
  viewLocalFiles,
  findDocumentInDocuments,
  getDocumentsByFolder,
} = require("../../../utils/files");
const { CollectorApi } = require("../../../utils/collectorApi");

/**
 * Registers document query/read routes on the Express app.
 * @param {import('express').Express} app
 */
function registerQueryRoutes(app) {
  app.get("/v1/documents", [validApiKey], async (_, response) => {
    /*
    #swagger.tags = ['Documents']
    #swagger.description = 'List of all locally-stored documents in instance'
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
             "localFiles": {
              "name": "documents",
              "type": "folder",
              items: [
                {
                  "name": "my-stored-document.json",
                  "type": "file",
                  "id": "bb07c334-4dab-4419-9462-9d00065a49a1",
                  "url": "file://my-stored-document.txt",
                  "title": "my-stored-document.txt",
                  "cached": false
                },
              ]
             }
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
      const localFiles = await viewLocalFiles();
      response.status(200).json({ localFiles });
    } catch (e) {
      consoleLogger.error(e.message, e);
      response.sendStatus(500);
    }
  });

  app.get(
    "/v1/documents/folder/:folderName",
    [validApiKey],
    async (request, response) => {
      /*
    #swagger.tags = ['Documents']
    #swagger.description = 'Get all documents stored in a specific folder.'
    #swagger.parameters['folderName'] = {
      in: 'path',
      description: 'Name of the folder to retrieve documents from',
      required: true,
      type: 'string'
    }
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
              folder: "custom-documents",
              documents: [
                {
                  name: "document1.json",
                  type: "file",
                  cached: false,
                  pinnedWorkspaces: [],
                  watched: false,
                  more: "data",
                },
                {
                  name: "document2.json",
                  type: "file",
                  cached: false,
                  pinnedWorkspaces: [],
                  watched: false,
                  more: "data",
                },
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
        const { folderName } = request.params;
        const result = await getDocumentsByFolder(folderName);
        response.status(result.code).json({
          folder: result.folder,
          documents: result.documents,
          error: result.error,
        });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.get(
    "/v1/document/accepted-file-types",
    [validApiKey],
    async (_, response) => {
      /*
    #swagger.tags = ['Documents']
    #swagger.description = 'Check available filetypes and MIMEs that can be uploaded.'
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
              "types": {
                "application/mbox": [
                  ".mbox"
                ],
                "application/pdf": [
                  ".pdf"
                ],
                "application/vnd.oasis.opendocument.text": [
                  ".odt"
                ],
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
                  ".docx"
                ],
                "text/plain": [
                  ".txt",
                  ".md"
                ]
              }
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
        const types = await new CollectorApi().acceptedFileTypes();
        if (!types) {
          response.sendStatus(404);
          return;
        }

        response.status(200).json({ types });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.get(
    "/v1/document/metadata-schema",
    [validApiKey],
    async (_, response) => {
      /*
    #swagger.tags = ['Documents']
    #swagger.description = 'Get the known available metadata schema for when doing a raw-text upload and the acceptable type of value for each key.'
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
             "schema": {
                "keyOne": "string | number | nullable",
                "keyTwo": "string | number | nullable",
                "specialKey": "number",
                "title": "string",
              }
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
        response.status(200).json({
          schema: {
            // If you are updating this be sure to update the collector METADATA_KEYS constant in /processRawText.
            url: "string | nullable",
            title: "string",
            docAuthor: "string | nullable",
            description: "string | nullable",
            docSource: "string | nullable",
            chunkSource: "string | nullable",
            published: "epoch timestamp in ms | nullable",
          },
        });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  // Be careful and place as last route to prevent override of the other /document/ GET
  // endpoints!
  app.get("/v1/document/:docName", [validApiKey], async (request, response) => {
    /*
    #swagger.tags = ['Documents']
    #swagger.description = 'Get a single document by its unique OpenSIN Chat document name'
    #swagger.parameters['docName'] = {
        in: 'path',
        description: 'Unique document name to find (name in /documents)',
        required: true,
        type: 'string'
    }
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
             "localFiles": {
              "name": "documents",
              "type": "folder",
              items: [
                {
                  "name": "my-stored-document.txt-uuid1234.json",
                  "type": "file",
                  "id": "bb07c334-4dab-4419-9462-9d00065a49a1",
                  "url": "file://my-stored-document.txt",
                  "title": "my-stored-document.txt",
                  "cached": false
                },
              ]
             }
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
      const { docName } = request.params;
      const document = await findDocumentInDocuments(docName);
      if (!document) {
        response.sendStatus(404);
        return;
      }
      response.status(200).json({ document });
    } catch (e) {
      consoleLogger.error(e.message, e);
      response.sendStatus(500);
    }
  });
}

module.exports = { registerQueryRoutes };
