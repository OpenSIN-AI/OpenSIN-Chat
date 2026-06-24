// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");

const crypto = require("crypto");
const {
  getStoragePath,
  safeStorageJoin,
  ensureStorageDir,
} = require("../utils/paths");
const { SystemSettings } = require("../models/systemSettings");
// NOTE: validatedRequest / flexUserRoleValid / ROLES are required lazily inside
// utilEndpoints() instead of being destructured here. These middleware modules
// participate in a circular dependency chain; a top-level destructure captures
// `undefined` when this file is evaluated while the middleware module is still
// mid-load, which crashed the server at boot ("argument handler must be a
// function"). Requiring at call time guarantees the fully-resolved functions.
const { reqBody } = require("../utils/http");
const { fetchWithTimeout } = require("../utils/helpers/fetchWithTimeout");
const { ResilientHttpClient } = require("../utils/helpers/resilientHttpClient");

const rssClient = new ResilientHttpClient({
  timeoutMs: 10_000,
  maxRetries: 2,
  retryDelayMs: 500,
  rateLimitDelayMs: 200,
  circuitBreakerThreshold: 5,
  circuitBreakerCooldownMs: 60_000,
  cacheTtlMs: 5 * 60 * 1000,
});

function utilEndpoints(app) {
  if (!app) return;

  // Resolve middleware at call time to avoid the circular-dependency capture
  // described in the import notes above.
  const { validatedRequest } = require("../utils/middleware/validatedRequest");
  const {
    flexUserRoleValid,
    ROLES,
  } = require("../utils/middleware/multiUserProtected");

  app.get("/utils/metrics", [validatedRequest], async (_, response) => {
    try {
      const metrics = {
        online: true,
        version: getGitVersion(),
        mode: (await SystemSettings.isMultiUserMode())
          ? "multi-user"
          : "single-user",
        vectorDB: process.env.VECTOR_DB || "lancedb",
        storage: await getDiskStorage(),
        appVersion: getDeploymentVersion(),
      };
      response.status(200).json(metrics);
    } catch (e) {
      consoleLogger.error(e);
      response.sendStatus(500);
    }
  });

  const {
    dockerModelRunnerUtilsEndpoints,
  } = require("./utils/dockerModelRunnerUtils");
  dockerModelRunnerUtilsEndpoints(app);

  const { enhancePromptEndpoint } = require("./utils/enhancePrompt");
  enhancePromptEndpoint(app);

  const { terminalExecEndpoint } = require("./utils/terminalExec");
  terminalExecEndpoint(app);

  // Bundestag DIP API proxy — avoids CORS for the browser (Issue #57)
  app.get(
    "/utils/bundestag/drucksachen",
    [validatedRequest],
    async (req, response) => {
      try {
        const apiKey =
          process.env.BUNDESTAG_DIP_API_KEY ||
          process.env.BUNDESTAG_API_KEY ||
          "";
        const params = new URLSearchParams({
          f_fraktion: "AfD",
          format: "json",
          rows: req.query.rows || "10",
          ...(apiKey ? { apikey: apiKey } : {}),
        });
        const res = await fetchWithTimeout(
          `https://search.dip.bundestag.de/api/v1/drucksache?${params}`,
          { headers: { Accept: "application/json" } },
          8_000,
        );
        if (!res.ok) {
          const msg =
            res.status === 401
              ? "DIP API-Schlüssel erforderlich"
              : `DIP ${res.status}`;
          throw new Error(msg);
        }
        const json = await res.json();
        response.status(200).json(json);
      } catch (e) {
        const errorId = crypto.randomUUID();
        consoleLogger.error(`[endpoint error ${errorId}]`, e);
        response.status(200).json({
          documents: [],
          error: e.message || "Upstream unavailable",
          errorId,
        });
      }
    },
  );

  // Local politician database — AfD politicians (Issue #57)
  // Falls back to Abgeordnetenwatch proxy only if the local DB is empty.
  // The Abgeordnetenwatch API v2.9.0 no longer supports `paginationlimit` or
  // bracket-style filter params (e.g. `party[label]=AfD`) — they cause HTTP 500.
  // Instead we fetch the default page (100 results) and filter client-side.
  app.get(
    "/utils/bundestag/politicians",
    [validatedRequest],
    async (req, response) => {
      try {
        const { PoliticianDB } = require("../utils/politician");
        const db = new PoliticianDB();
        const limit = Math.min(parseInt(req.query.limit || "10", 10), 50);
        let results = await db.searchPoliticians("", { party: "AfD" });
        if (!results || results.length === 0) {
          const res = await fetchWithTimeout(
            `https://www.abgeordnetenwatch.de/api/v2/politicians`,
            { headers: { Accept: "application/json" } },
            8_000,
          );
          if (!res.ok) throw new Error(`AW ${res.status}`);
          const json = await res.json();
          // Filter AfD politicians client-side — the API does not support
          // server-side party filtering in v2.9.0.
          const afdPoliticians = (json.data || []).filter(
            (p) => p.party?.label === "AfD",
          );
          const data = afdPoliticians.slice(0, limit).map((p) => ({
            id: p.id,
            first_name: p.first_name || null,
            last_name: p.last_name || null,
            label: p.label || null,
            party: p.party || { label: "AfD" },
            constituency: null,
            electoral_data: null,
            abgeordnetenwatch_url: p.abgeordnetenwatch_url || null,
            photo: null,
          }));
          return response.status(200).json({ data });
        }
        results = results.slice(0, limit);
        const data = results.map((p) => ({
          id: p.id,
          first_name: p.firstName || null,
          last_name: p.lastName || null,
          label: p.fullName || null,
          party: { label: p.party || null },
          constituency: p.electoralDistrict
            ? { label: p.electoralDistrict }
            : null,
          electoral_data: p.electoralDistrict
            ? { constituency: { label: p.electoralDistrict } }
            : null,
          abgeordnetenwatch_url: p.profileUrl || null,
          photo: p.photoUrl || null,
        }));
        response.status(200).json({ data });
      } catch (e) {
        const errorId = crypto.randomUUID();
        consoleLogger.error(`[endpoint error ${errorId}]`, e);
        response
          .status(200)
          .json({ data: [], error: "Upstream unavailable", errorId });
      }
    },
  );

  // AfD RSS feed proxy (Issue #58)
  app.get("/utils/political/rss", [validatedRequest], async (req, response) => {
    try {
      const feed = req.query.feed || "https://www.afd.de/feed/";
      const parsed = new URL(feed);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return response.status(400).json({ error: "Invalid protocol" });
      }
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === "localhost" ||
        hostname.endsWith(".local") ||
        /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|0\.|169\.254\.)/.test(
          hostname,
        )
      ) {
        return response
          .status(403)
          .json({ error: "Blocked: internal address" });
      }
      const res = await rssClient.fetch(feed, {
        headers: { "User-Agent": "OpenSIN-Chat/1.0" },
      });
      if (!res.ok) throw new Error(`RSS ${res.status}`);
      const xml = await res.text();
      // Parse titles + links from RSS with simple regex — no xml parser needed
      const items = [];
      const itemRe = /<item>([\s\S]*?)<\/item>/g;
      let m;
      while ((m = itemRe.exec(xml)) !== null && items.length < 8) {
        const block = m[1];
        const title =
          (/<title><!\[CDATA\[(.+?)\]\]><\/title>/.exec(block) ||
            /<title>(.+?)<\/title>/.exec(block) ||
            [])[1] || "";
        const link = (/<link>([^<]+)<\/link>/.exec(block) || [])[1] || "";
        const pubDate =
          (/<pubDate>(.+?)<\/pubDate>/.exec(block) || [])[1] || "";
        if (title)
          items.push({
            title: title.trim(),
            link: link.trim(),
            pubDate: pubDate.trim(),
          });
      }
      response.status(200).json({ items });
    } catch (e) {
      const errorId = crypto.randomUUID();
      consoleLogger.error(`[endpoint error ${errorId}]`, e);
      response
        .status(200)
        .json({ items: [], error: "Upstream unavailable", errorId });
    }
  });

  // Filesystem info for FilesystemSidebar (Issue #56)
  app.get("/utils/filesystem", [validatedRequest], async (_, response) => {
    try {
      const os = require("os");
      const disk = await getDiskStorage();
      response.status(200).json({
        platform: os.platform(),
        nodeVersion: process.version,
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: Math.floor(os.uptime()),
        totalMemMB: Math.round(os.totalmem() / 1024 / 1024),
        freeMemMB: Math.round(os.freemem() / 1024 / 1024),
        uploadPath: getStoragePath(),
        workDir: process.cwd(),
        storage: disk,
      });
    } catch (e) {
      consoleLogger.error("filesystem endpoint error", e.message);
      response.sendStatus(500);
    }
  });

  // Directory browser for FileBrowserSidebar — sandboxed to uploads/
  // The `path` query param is RELATIVE to the uploads directory.
  app.get(
    "/utils/browse-directory",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (req, response) => {
      try {
        const path = require("path");
        const fs = require("fs");

        const uploadsRoot = ensureStorageDir("uploads");
        const relativePath = req.query.path || "";
        const resolvedPath = safeStorageJoin("uploads", relativePath);

        const entries = await fs.promises.readdir(resolvedPath, {
          withFileTypes: true,
        });
        const items = (
          await Promise.all(
            entries
              .filter((entry) => !entry.name.startsWith("."))
              .map(async (entry) => {
                const fullPath = path.join(resolvedPath, entry.name);
                const itemRelPath = path.relative(uploadsRoot, fullPath);
                let size = 0;
                let ext = "";
                try {
                  if (entry.isFile()) {
                    const stat = await fs.promises.stat(fullPath);
                    size = stat.size;
                    ext = path.extname(entry.name).toLowerCase();
                  }
                } catch {}
                return {
                  name: entry.name,
                  type: entry.isDirectory() ? "directory" : "file",
                  path: itemRelPath,
                  size,
                  ext,
                };
              }),
          )
        ).sort((a, b) => {
          if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

        response.status(200).json({
          path: path.relative(uploadsRoot, resolvedPath) || "",
          parent:
            resolvedPath === uploadsRoot
              ? null
              : path.relative(uploadsRoot, path.dirname(resolvedPath)) || "",
          items,
        });
      } catch (e) {
        const errorId = crypto.randomUUID();
        consoleLogger.error(`[endpoint error ${errorId}]`, e);
        response.status(500).json({ error: "Internal server error", errorId });
      }
    },
  );

  // Create a directory inside uploads/ — parentPath is relative to uploads root
  app.post(
    "/utils/create-directory",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (req, response) => {
      try {
        const fs = require("fs");
        const { name, parentPath = "" } = reqBody(req);

        if (!name || typeof name !== "string") {
          return response.status(400).json({ error: "Name is required" });
        }
        if (/[/\\]/.test(name) || name.includes("..") || name.startsWith(".")) {
          return response.status(400).json({ error: "Invalid directory name" });
        }

        const resolved = safeStorageJoin("uploads", parentPath, name);
        if (
          await fs.promises
            .access(resolved, fs.constants.F_OK)
            .then(() => true)
            .catch(() => false)
        ) {
          return response
            .status(409)
            .json({ error: "Directory already exists" });
        }

        await fs.promises.mkdir(resolved, { recursive: true });
        response.status(200).json({ success: true, path: resolved });
      } catch (e) {
        const errorId = crypto.randomUUID();
        consoleLogger.error(`[endpoint error ${errorId}]`, e);
        response.status(500).json({ error: "Internal server error", errorId });
      }
    },
  );

  // Create a file inside uploads/ — parentPath is relative to uploads root
  app.post(
    "/utils/create-file",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (req, response) => {
      try {
        const fs = require("fs");
        const { name, parentPath = "", content = "" } = reqBody(req);

        if (!name || typeof name !== "string") {
          return response.status(400).json({ error: "Name is required" });
        }
        if (/[/\\]/.test(name) || name.includes("..") || name.startsWith(".")) {
          return response.status(400).json({ error: "Invalid file name" });
        }

        const resolved = safeStorageJoin("uploads", parentPath, name);
        if (
          await fs.promises
            .access(resolved, fs.constants.F_OK)
            .then(() => true)
            .catch(() => false)
        ) {
          return response.status(409).json({ error: "File already exists" });
        }

        await fs.promises.writeFile(resolved, content || "");
        response.status(200).json({ success: true, path: resolved });
      } catch (e) {
        const errorId = crypto.randomUUID();
        consoleLogger.error(`[endpoint error ${errorId}]`, e);
        response.status(500).json({ error: "Internal server error", errorId });
      }
    },
  );

  // Delete a file or directory inside uploads/ — path is relative to uploads root
  app.delete(
    "/utils/delete-item",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (req, response) => {
      try {
        const fs = require("fs");
        const itemPath = reqBody(req).path || req.query.path;

        if (!itemPath || typeof itemPath !== "string" || itemPath === "") {
          return response.status(400).json({ error: "Path is required" });
        }

        const resolved = safeStorageJoin("uploads", itemPath);
        if (resolved === getStoragePath("uploads")) {
          return response
            .status(400)
            .json({ error: "Cannot delete uploads root" });
        }
        if (
          !(await fs.promises
            .access(resolved, fs.constants.F_OK)
            .then(() => true)
            .catch(() => false))
        ) {
          return response.status(404).json({ error: "Item not found" });
        }

        await fs.promises.rm(resolved, { recursive: true });
        response.status(200).json({ success: true });
      } catch (e) {
        const errorId = crypto.randomUUID();
        consoleLogger.error(`[endpoint error ${errorId}]`, e);
        response.status(500).json({ error: "Internal server error", errorId });
      }
    },
  );

  // Report download for browser (public, no API key needed) — Issue #55
  // Reports are stored in STORAGE_DIR/generated-reports/ by the ReportGenerator
  // (server/utils/reports). This mirrors that exact resolution so the
  // PreviewSidebar iframe can load the PDF without an API key.
  app.get(
    "/utils/reports/:fileName",
    [validatedRequest],
    async (req, response) => {
      try {
        const path = require("path");
        const fs = require("fs");
        const fileName = path.basename(req.params.fileName); // prevent ../../../etc/passwd
        const reportsDir = getStoragePath("generated-reports");
        const filePath = path.join(reportsDir, fileName);

        // Verify resolved path is still under generated-reports/ (security check)
        if (
          filePath !== reportsDir &&
          !filePath.startsWith(reportsDir + path.sep)
        ) {
          return response.sendStatus(403);
        }

        if (
          !(await fs.promises
            .access(filePath, fs.constants.F_OK)
            .then(() => true)
            .catch(() => false))
        )
          return response.sendStatus(404);

        const stat = await fs.promises.stat(filePath);
        const stream = fs.createReadStream(filePath);
        response.setHeader("Content-Type", "application/pdf");
        response.setHeader("Content-Length", stat.size);
        response.setHeader("Cache-Control", "public, max-age=86400");
        stream.on("error", () => {
          if (!response.headersSent) response.sendStatus(500);
          else response.end();
        });
        stream.pipe(response);
      } catch (e) {
        consoleLogger.error("reports download error", e.message);
        response.sendStatus(500);
      }
    },
  );
}

let _cachedGitVersion = null;

function getGitVersion() {
  if (_cachedGitVersion !== null) return _cachedGitVersion;
  if (
    (process.env.OPENSIN_CHAT_RUNTIME || process.env.ANYTHING_LLM_RUNTIME) ===
    "docker"
  ) {
    _cachedGitVersion = "--";
    return _cachedGitVersion;
  }
  try {
    _cachedGitVersion = require("child_process")
      .execSync("git rev-parse HEAD")
      .toString()
      .trim();
    return _cachedGitVersion;
  } catch (e) {
    consoleLogger.error("getGitVersion", e.message);
    _cachedGitVersion = "--";
    return _cachedGitVersion;
  }
}

function byteToGigaByte(n) {
  return n / Math.pow(10, 9);
}

async function getDiskStorage() {
  try {
    const checkDiskSpace = require("check-disk-space").default;
    const { free, size } = await checkDiskSpace("/");
    return {
      current: Math.floor(byteToGigaByte(free)),
      capacity: Math.floor(byteToGigaByte(size)),
    };
  } catch {
    return {
      current: null,
      capacity: null,
    };
  }
}

/**
 * Returns the model tag based on the provider set in the environment.
 * This information is used to identify the parent model for the system
 * so that we can prioritize the correct model and types for future updates
 * as well as build features in OpenSIN Chat directly for a specific model or capabilities.
 *
 * Disable with  {@link https://github.com/Family-Team-Projects/opensin-chat?tab=readme-ov-file#telemetry--privacy|Disable Telemetry}
 * @returns {string} The model tag.
 */
function getModelTag() {
  let model;
  const provider = process.env.LLM_PROVIDER;

  switch (provider) {
    case "openai":
      model = process.env.OPEN_MODEL_PREF;
      break;
    case "anthropic":
      model = process.env.ANTHROPIC_MODEL_PREF;
      break;
    case "lmstudio":
      model = process.env.LMSTUDIO_MODEL_PREF;
      break;
    case "ollama":
      model = process.env.OLLAMA_MODEL_PREF;
      break;
    case "groq":
      model = process.env.GROQ_MODEL_PREF;
      break;
    case "localai":
      model = process.env.LOCAL_AI_MODEL_PREF;
      break;
    case "mistral":
      model = process.env.MISTRAL_MODEL_PREF;
      break;
    case "generic-openai":
      model = process.env.GENERIC_OPEN_AI_MODEL_PREF;
      break;
    case "fireworksai":
      model = process.env.FIREWORKS_AI_LLM_MODEL_PREF;
      break;
    case "litellm":
      model = process.env.LITE_LLM_MODEL_PREF;
      break;
    case "xai":
      model = process.env.XAI_LLM_MODEL_PREF;
      break;
    case "nvidia-nim":
      model = process.env.NVIDIA_NIM_LLM_MODEL_PREF;
      break;
    case "gemini":
      model = process.env.GEMINI_LLM_MODEL_PREF;
      break;
    case "docker-model-runner":
      model = process.env.DOCKER_MODEL_RUNNER_LLM_MODEL_PREF;
      break;
    case "opencode-zen":
      model = process.env.OPENCODE_ZEN_MODEL_PREF;
      break;
    case "huggingface":
      model = null;
      break;
    default:
      model = "--";
      break;
  }
  return model;
}

/**
 * Returns the deployment version.
 * - Dev: reads from package.json
 * - Prod: reads from ENV
 * expected format: major.minor.patch
 * @returns {string|null} The deployment version.
 */
function getDeploymentVersion() {
  if (process.env.NODE_ENV === "development")
    return require("../../package.json").version;
  if (process.env.DEPLOYMENT_VERSION) return process.env.DEPLOYMENT_VERSION;
  return null;
}

/**
 * Returns the user agent for the OpenSIN Chat deployment.
 * @returns {string} The user agent.
 */
function getOpenSINChatUserAgent() {
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`;
}

module.exports = {
  utilEndpoints,
  getGitVersion,
  getModelTag,
  getOpenSINChatUserAgent,
  getDeploymentVersion,
};
