#!/usr/bin/env node
// SPDX-License-Identifier: MIT
/**
 * sync-env-example.js — Keep .env.example synchronized with keyMapping.js.
 *
 * Usage:
 *   node scripts/sync-env-example.js
 *
 * This script reads KEY_MAPPING (the source of truth for all configurable envs)
 * and generates a comprehensive .env.example comment/section. It appends new
 * keys to .env.example that are missing, with placeholders and descriptions.
 *
 * Manually-crafted sections (LLM providers, security, etc.) are preserved;
 * only the auto-generated KEY_MAPPING documentation is updated.
 */

const fs = require("fs");
const path = require("path");

// Lazy logger (optional) — if it can't load, that's ok for this script
let consoleLogger;
try {
  consoleLogger = require("../utils/logger/console.js");
} catch {
  consoleLogger = { error: console.error, log: console.log };
}

// Extract KEY_MAPPING statically to avoid pulling in prisma
// (which hasn't been generated yet in fresh installs).
const KEY_MAPPING = {};
try {
  const keyMappingPath = path.join(
    __dirname,
    "../utils/helpers/updateENV/keyMapping.js",
  );
  const fileContent = fs.readFileSync(keyMappingPath, "utf-8");
  // Safe extraction: parse the object literal without eval().
  // We use a simple regex to find key-value pairs in the KEY_MAPPING object.
  const match = fileContent.match(/const KEY_MAPPING = ({[\s\S]*?});/);
  if (match) {
    // Use Function constructor instead of eval — safer and scoped.
    // The content is our own source file, not user input.
    const parseFn = new Function(`return ${match[1]}`);
    const parsed = parseFn();
    if (parsed && typeof parsed === "object") {
      Object.assign(KEY_MAPPING, parsed);
    }
  }
} catch {
  // Fall back to dynamic require with lazy loading
}

// Load KEY_MAPPING dynamically with try-catch for missing prisma client
let keyMappingModule;
try {
  keyMappingModule = require("../utils/helpers/updateENV/keyMapping.js");
} catch (e) {
  if (e.code === "MODULE_NOT_FOUND" && e.message.includes("prisma")) {
    console.warn(
      "[sync-env-example] Warning: Prisma client not yet generated. This is normal on fresh installs.",
    );
    console.warn(
      "[sync-env-example] Run 'npm run prisma:setup' after this script.",
    );
    // Use a minimal fallback
    keyMappingModule = { KEY_MAPPING: {} };
  } else {
    throw e;
  }
}

const { KEY_MAPPING: KEY_MAPPING_LOADED } = keyMappingModule;
Object.assign(KEY_MAPPING, KEY_MAPPING_LOADED);

const ENV_EXAMPLE_PATH = path.join(__dirname, "../.env.example");
const AUTO_SECTION_START = "# ===== AUTO-GENERATED from KEY_MAPPING =====";
const AUTO_SECTION_END = "# ===== END AUTO-GENERATED =====";

/**
 * Group KEY_MAPPING entries by category (derived from envKey prefix or field name).
 */
function groupByCategory() {
  const groups = {};

  Object.entries(KEY_MAPPING).forEach(([key, config]) => {
    const envKey = config.envKey;
    // Heuristic: derive category from envKey prefix
    let category = "Other";
    if (
      envKey.includes("OPEN_AI") ||
      envKey.includes("GEMINI") ||
      envKey.includes("ANTHROPIC") ||
      envKey.includes("GROQ") ||
      envKey.includes("MISTRAL") ||
      envKey.includes("COHERE") ||
      envKey.includes("FIREWORKS") ||
      envKey.includes("TOGETHERAI") ||
      envKey.includes("PERPLEXITY") ||
      envKey.includes("DEEPSEEK") ||
      envKey.includes("OPENROUTER") ||
      envKey.includes("HUGGING_FACE") ||
      envKey.includes("KOBOLD") ||
      envKey.includes("TEXT_GEN") ||
      envKey.includes("GENERIC_OPEN_AI") ||
      envKey.includes("LITELLM") ||
      envKey.includes("LMSTUDIO") ||
      envKey.includes("LOCAL_AI") ||
      envKey.includes("OLLAMA") ||
      envKey.includes("BEDROCK") ||
      envKey.includes("AZURE") ||
      envKey.includes("LLM_") ||
      envKey.includes("MODEL_") ||
      envKey.startsWith("OPENCODE") ||
      envKey.startsWith("DOCKER_MODEL") ||
      envKey.includes("NIM") ||
      envKey.includes("XAI") ||
      envKey.includes("AZURE") ||
      envKey.includes("COMETAPI") ||
      envKey.includes("NOVITA") ||
      envKey.includes("APIPIE") ||
      envKey.includes("ZAI") ||
      envKey.includes("MOONSHOT") ||
      envKey.includes("GITEE_AI") ||
      envKey.includes("SAMBANOVA") ||
      envKey.includes("LEMONADE") ||
      envKey.includes("MINIMAX") ||
      envKey.includes("CEREBRAS") ||
      envKey.includes("PRIVATEMODE") ||
      envKey.includes("FOUNDRY")
    ) {
      category = "LLM Providers";
    } else if (envKey.includes("EMBEDDING")) {
      category = "Embedding Engines";
    } else if (
      envKey.includes("VECTOR_DB") ||
      envKey.includes("CHROMA") ||
      envKey.includes("PINECONE") ||
      envKey.includes("WEAVIATE") ||
      envKey.includes("QDRANT") ||
      envKey.includes("PGVECTOR") ||
      envKey.includes("MILVUS") ||
      envKey.includes("ASTRA") ||
      envKey.includes("ZILLIZ") ||
      envKey.includes("LANCEDB")
    ) {
      category = "Vector Databases";
    } else if (
      envKey.includes("TTS_") ||
      envKey.includes("STT_") ||
      envKey.includes("WHISPER")
    ) {
      category = "Audio / TTS / STT";
    } else if (envKey.includes("AGENT_")) {
      category = "Agent Tools";
    } else if (
      envKey === "AUTH_TOKEN" ||
      envKey === "JWT_SECRET" ||
      envKey.includes("VANE")
    ) {
      category = "System";
    }

    if (!groups[category]) groups[category] = [];
    groups[category].push({ key, config });
  });

  return groups;
}

/**
 * Generate a commented-out entry for a KEY_MAPPING key.
 */
function _generateEnvEntry(_key, config) {
  const envKey = config.envKey;
  const example = `# ${envKey}=`;
  return example;
}

/**
 * Extract the manually-written (non-auto) portion of .env.example.
 */
function extractManualContent(fileContent) {
  const startIdx = fileContent.indexOf(AUTO_SECTION_START);
  if (startIdx === -1) {
    // No auto section yet — entire file is manual
    return fileContent.trim();
  }
  return fileContent.substring(0, startIdx).trim();
}

/**
 * Generate the auto-generated section from KEY_MAPPING.
 */
function generateAutoSection() {
  const groups = groupByCategory();
  let section = `\n\n${AUTO_SECTION_START}\n`;
  section += `# Auto-generated from server/utils/helpers/updateENV/keyMapping.js\n`;
  section += `# Keep this section in sync by running: npm run env:sync\n\n`;

  Object.entries(groups).forEach(([category, entries]) => {
    section += `### ${category}\n`;
<<<<<<< HEAD
    entries.forEach(({ key: _key, config }) => {
=======
    entries.forEach(({ config }) => {
>>>>>>> 0334f658 (refactor: streamline EmbeddingProgressContext logic and update tests)
      section += `# ${config.envKey}=\n`;
    });
    section += `\n`;
  });

  section += AUTO_SECTION_END;
  return section;
}

/**
 * Main: sync .env.example.
 */
async function main() {
  try {
    let fileContent = "";
    if (fs.existsSync(ENV_EXAMPLE_PATH)) {
      fileContent = fs.readFileSync(ENV_EXAMPLE_PATH, "utf-8");
    }

    const manualContent = extractManualContent(fileContent);
    const autoSection = generateAutoSection();
    const newContent = manualContent + autoSection + "\n";

    fs.writeFileSync(ENV_EXAMPLE_PATH, newContent, "utf-8");
    console.log(
      `[sync-env-example] ✓ Updated ${ENV_EXAMPLE_PATH} (${newContent.length} bytes)`,
    );
  } catch (e) {
    consoleLogger.error(`[sync-env-example] Failed: ${e.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateAutoSection, extractManualContent };
