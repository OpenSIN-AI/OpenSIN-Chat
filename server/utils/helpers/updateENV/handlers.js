// SPDX-License-Identifier: MIT
// Purpose: Pre-update and post-update handler functions for ENV variable changes.
// Docs: server/utils/helpers/updateENV.doc.md
const {
  resetAllVectorStores,
} = require("../../vectorStore/resetAllVectorStores");

async function handleVectorStoreReset(key, prevValue, nextValue) {
  if (prevValue === nextValue) return;
  if (key === "VectorDB") {
    // eslint-disable-next-line no-console
    console.log(
      `Vector configuration changed from ${prevValue} to ${nextValue} - resetting ${prevValue} namespaces`,
    );
    return await resetAllVectorStores({ vectorDbKey: prevValue });
  }

  if (key === "EmbeddingEngine" || key === "EmbeddingModelPref") {
    // eslint-disable-next-line no-console
    console.log(
      `${key} changed from ${prevValue} to ${nextValue} - resetting ${process.env.VECTOR_DB} namespaces`,
    );
    return await resetAllVectorStores({ vectorDbKey: process.env.VECTOR_DB });
  }
  return false;
}

/**
 * Downloads the embedding model in background if the user has selected a different model
 * - Only supported for the native embedder
 * - Must have the native embedder selected prior (otherwise will download on embed)
 */
async function downloadEmbeddingModelIfRequired(key, prevValue, nextValue) {
  if (prevValue === nextValue) return;
  if (key !== "EmbeddingModelPref" || process.env.EMBEDDING_ENGINE !== "native")
    return;

  const { NativeEmbedder } = require("../../EmbeddingEngines/native");
  if (!NativeEmbedder.supportedModels[nextValue]) return; // if the model is not supported, don't download it
  new NativeEmbedder().embedderClient();
  return false;
}

/**
 * Validates the Postgres connection string for the PGVector options.
 * @param {string} key - The ENV key we are validating.
 * @param {string} prevValue - The previous value of the key.
 * @param {string} nextValue - The next value of the key.
 * @returns {string} - An error message if the connection string is invalid, otherwise null.
 */
async function validatePGVectorConnectionString(key, prevValue, nextValue) {
  const { KEY_MAPPING } = require("./keyMapping");
  const envKey = KEY_MAPPING[key].envKey;

  if (prevValue === nextValue) return; // If the value is the same as the previous value, don't validate it.
  if (!nextValue) return; // If the value is not set, don't validate it.
  if (nextValue === process.env[envKey]) return; // If the value is the same as the current connection string, don't validate it.

  const { PGVector } = require("../../vectorDbProviders/pgvector");
  const { error, success } = await PGVector.validateConnection({
    connectionString: nextValue,
  });
  if (!success) return error;

  // Set the ENV variable for the PGVector connection string early so we can use it in the table check.
  process.env[envKey] = nextValue;
  return null;
}

/**
 * Validates the Postgres table name for the PGVector options.
 * - Table should not already exist in the database.
 * @param {string} key - The ENV key we are validating.
 * @param {string} prevValue - The previous value of the key.
 * @param {string} nextValue - The next value of the key.
 * @returns {string} - An error message if the table name is invalid, otherwise null.
 */
async function validatePGVectorTableName(key, prevValue, nextValue) {
  const { KEY_MAPPING } = require("./keyMapping");
  const envKey = KEY_MAPPING[key].envKey;

  if (prevValue === nextValue) return; // If the value is the same as the previous value, don't validate it.
  if (!nextValue) return; // If the value is not set, don't validate it.
  if (nextValue === process.env[envKey]) return; // If the value is the same as the current table name, don't validate it.
  if (!process.env.PGVECTOR_CONNECTION_STRING) return; // if connection string is not set, don't validate it since it will fail.

  const { PGVector } = require("../../vectorDbProviders/pgvector");
  const { error, success } = await PGVector.validateConnection({
    connectionString: process.env.PGVECTOR_CONNECTION_STRING,
    tableName: nextValue,
  });
  if (!success) return error;

  return null;
}

module.exports = {
  handleVectorStoreReset,
  downloadEmbeddingModelIfRequired,
  validatePGVectorConnectionString,
  validatePGVectorTableName,
};
