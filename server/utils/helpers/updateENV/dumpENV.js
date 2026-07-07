// SPDX-License-Identifier: MIT
// Purpose: dumpENV — writes the current process.env to the .env file with sanitization.
// Docs: server/utils/helpers/updateENV.doc.md
const consoleLogger = require("../../logger/console.js");

const { KEY_MAPPING } = require("./keyMapping");

async function dumpENV() {
  const fs = require("fs");
  const path = require("path");

  const frozenEnvs = {};
  const protectedKeys = [
    ...Object.values(KEY_MAPPING).map((values) => values.envKey),
    // Manually Add Keys here which are not already defined in KEY_MAPPING
    // and are either managed or manually set ENV key:values.
    "JWT_EXPIRY",

    "STORAGE_DIR",
    "SERVER_PORT",
    "COLLECTOR_PORT",
    // For persistent data encryption
    "SIG_KEY",
    "SIG_SALT",
    // Password Schema Keys if present.
    "PASSWORDMINCHAR",
    "PASSWORDMAXCHAR",
    "PASSWORDLOWERCASE",
    "PASSWORDUPPERCASE",
    "PASSWORDNUMERIC",
    "PASSWORDSYMBOL",
    "PASSWORDREQUIREMENTS",
    // HTTPS SETUP KEYS
    "ENABLE_HTTPS",
    "HTTPS_CERT_PATH",
    "HTTPS_KEY_PATH",
    // Other Configuration Keys
    "DISABLE_VIEW_CHAT_HISTORY",
    "DISABLE_SWAGGER_DOCS",
    // Simple SSO
    "SIMPLE_SSO_ENABLED",
    "SIMPLE_SSO_NO_LOGIN",
    "SIMPLE_SSO_NO_LOGIN_REDIRECT",
    // Community Hub
    "COMMUNITY_HUB_BUNDLE_DOWNLOADS_ENABLED",

    // Nvidia NIM Keys that are automatically managed
    "NVIDIA_NIM_LLM_MODEL_TOKEN_LIMIT",

    // OpenCode Zen Keys that are automatically managed
    "OPENCODE_ZEN_MODEL_TOKEN_LIMIT",

    // OCR Language Support
    "TARGET_OCR_LANG",

    // Collector API common ENV - allows bypassing URL validation checks
    "COLLECTOR_ALLOW_ANY_IP",

    // Allow disabling of streaming for generic openai
    "GENERIC_OPENAI_STREAMING_DISABLED",
    // Custom headers for Generic OpenAI
    "GENERIC_OPEN_AI_CUSTOM_HEADERS",

    // Specify Chromium args for collector
    "ANYTHINGLLM_CHROMIUM_ARGS",

    // Allow setting a custom response timeout for Ollama
    "OLLAMA_RESPONSE_TIMEOUT",

    // Allow disabling of MCP tool cooldown
    "MCP_NO_COOLDOWN",

    // Allow capabilities for specific providers.
    "PROVIDER_SUPPORTS_NATIVE_TOOL_CALLING",
    "PROVIDER_SUPPORTS_REASONING",
    "PROVIDER_SUPPORTS_IMAGE_GENERATION",
    "PROVIDER_SUPPORTS_VISION",
    "GENERIC_OPEN_AI_REPORT_USAGE",

    // Allow auto-approval of skills
    "AGENT_AUTO_APPROVED_SKILLS",

    // Allow setting a custom fetch timeouts for providers
    "ANYTHINGLLM_FETCH_TIMEOUT",
    "ANYTHINGLLM_MAX_RETRIES",
  ];

  // Simple sanitization of each value to prevent ENV injection via newline or quote escaping.
  function sanitizeValue(value) {
    const controlChars =
      /[\n\r\t\v\f\u0085\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/g;
    return String(value).replace(controlChars, "").replace(/'/g, "'\\''");
  }

  for (const key of protectedKeys) {
    const envValue = process.env?.[key] || null;
    if (!envValue) continue;
    frozenEnvs[key] = process.env?.[key] || null;
  }

  var envResult = `# Auto-dump ENV from system call on ${new Date().toTimeString()}\n`;
  envResult += Object.entries(frozenEnvs)
    .map(([key, value]) => `${key}='${sanitizeValue(value)}'`)
    .join("\n");

  const envPath = path.join(__dirname, "../../../.env");
  try {
    await fs.promises.writeFile(envPath, envResult, { encoding: "utf8", flag: "w" });
    try {
      await fs.promises.chmod(envPath, 0o600);
    } catch (e) {
      consoleLogger.error(`Failed to chmod ${envPath} to 0o600: ${e.message}`);
    }
  } catch (e) {
    consoleLogger.error(`Failed to write .env file: ${e.message}`);
    return false;
  }
  return true;
}

module.exports = { dumpENV };
