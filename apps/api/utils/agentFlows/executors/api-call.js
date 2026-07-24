// SPDX-License-Identifier: MIT
const consoleLogger = require("../../logger/console.js");

const { safeJsonParse } = require("../../http");
const { safeFetch } = require("../../ssrf");

const API_CALL_TIMEOUT_MS = 30_000; // 30s timeout for outbound API calls

/**
 * Execute an API call flow step
 * @param {Object} config Flow step configuration
 * @param {Object} context Execution context with introspect function
 * @returns {Promise<string>} Response data
 */
async function executeApiCall(config, context) {
  const { url, method = "GET", headers, body, bodyType, formData } = config;
  const { introspect, logger } = context;
  logger(`\x1b[43m[AgentFlowToolExecutor]\x1b[0m - executing API Call block`);
  introspect(`Making ${method} request to external API...`);

  const requestConfig = {
    method: method.toUpperCase(),
    headers: (headers || []).reduce(
      (acc, h) => ({ ...acc, [h.key]: h.value }),
      {},
    ),
  };

  if (["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
    if (bodyType === "form") {
      const formDataObj = new URLSearchParams();
      (formData || []).forEach(({ key, value }) =>
        formDataObj.append(key, value),
      );
      requestConfig.body = formDataObj.toString();
      requestConfig.headers["Content-Type"] =
        "application/x-www-form-urlencoded";
    } else if (bodyType === "json") {
      const parsedBody = safeJsonParse(body, null);
      if (parsedBody !== null) {
        requestConfig.body = JSON.stringify(parsedBody);
      }
      requestConfig.headers["Content-Type"] = "application/json";
    } else if (bodyType === "text") {
      requestConfig.body = String(body);
    } else {
      requestConfig.body = body;
    }
  }

  try {
    // safeFetch validates the initial URL and every redirect hop against the
    // private-network blocklist (plain fetch + validateUrl alone is not enough).
    introspect(`Sending ${method} request to ${url}`);
    const response = await safeFetch(url, {
      ...requestConfig,
      signal: AbortSignal.timeout(API_CALL_TIMEOUT_MS),
    });
    if (!response.ok) {
      introspect(`Request failed with status ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    introspect(`API call completed`);
    return await response
      .text()
      .then((text) =>
        safeJsonParse(text, "Failed to parse output from API call block"),
      );
  } catch (error) {
    consoleLogger.error(error);
    throw new Error(`API Call failed: ${error.message}`, { cause: error });
  }
}

module.exports = executeApiCall;
