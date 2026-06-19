// SPDX-License-Identifier: MIT
const {
  getStoragePath,
  safeStorageJoin,
  ensureStorageDir,
} = require("../utils/paths");
const { SystemSettings } = require("../models/systemSettings");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { reqBody } = require("../utils/http");

/**
 * fetch() wrapper that aborts after `timeoutMs` so a hung upstream API
 * (Bundestag DIP, Abgeordnetenwatch, AfD RSS) can never block the request
 * indefinitely and leave the browser sidebar spinning forever.
 * @param {string} url
 * @param {RequestInit} options
 * @param {number} timeoutMs
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    if (e.name === "AbortError")
      throw new Error(`Zeitüberschreitung nach ${timeoutMs}ms`, { cause: e });
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function utilEndpoints(app) {
  if (!app) return;

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
      // eslint-disable-next-line no-console
      console.error(e);
      response.sendStatus(500).end();
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
        const apiKey = process.env.BUNDESTAG_API_KEY || "";
        const params = new URLSearchParams({
          f_fraktion: "AfD",
          format: "json",
          rows: req.query.rows || "10",
          ...(apiKey ? { apikey: apiKey } : {}),
        });
        const res = await fetchWithTimeout(
          `https://search.dip.bundestag.de/api/v1/drucksache?${params}`,
          { headers: { Accept: "application/json" } },
        );
        if (!res.ok) throw new Error(`DIP ${res.status}`);
        const json = await res.json();
        response.status(200).json(json);
      } catch (e) {
        response.status(502).json({ error: e?.message || String(e) });
      }
    },
  );

  // Abgeordnetenwatch proxy — AfD politicians (Issue #57)
  app.get(
    "/utils/bundestag/politicians",
    [validatedRequest],
    async (req, response) => {
      try {
        const params = new URLSearchParams({
          "party[label]": "AfD",
          "legislature[label]": "Bundestag",
          paginationlimit: req.query.limit || "10",
        });
        const res = await fetchWithTimeout(
          `https://www.abgeordnetenwatch.de/api/v2/politicians?${params}`,
          { headers: { Accept: "application/json" } },
        );
        if (!res.ok) throw new Error(`AW ${res.status}`);
        const json = await res.json();
        response.status(200).json(json);
      } catch (e) {
        response.status(502).json({ error: e?.message || String(e) });
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
      const res = await fetchWithTimeout(feed, {
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
      response.status(502).json({ error: e?.message || String(e) });
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
      console.error("filesystem endpoint error", e.message);
      response.sendStatus(500).end();
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

        const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
        const items = entries
          .filter((entry) => !entry.name.startsWith("."))
          .map((entry) => {
            const fullPath = path.join(resolvedPath, entry.name);
            const itemRelPath = path.relative(uploadsRoot, fullPath);
            let size = 0;
            let ext = "";
            try {
              if (entry.isFile()) {
                const stat = fs.statSync(fullPath);
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
          })
          .sort((a, b) => {
            if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
            return a.name.localeCompare(b.name);
          });

        response.status(200).json({
          path: resolvedPath,
          parent:
            resolvedPath === uploadsRoot
              ? null
              : path.relative(uploadsRoot, path.dirname(resolvedPath)),
          items,
        });
      } catch (e) {
        console.error("browse-directory endpoint error", e.message);
        response.status(500).json({ error: e?.message || String(e) });
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
        if (fs.existsSync(resolved)) {
          return response
            .status(409)
            .json({ error: "Directory already exists" });
        }

        fs.mkdirSync(resolved, { recursive: true });
        response.status(200).json({ success: true, path: resolved });
      } catch (e) {
        console.error("create-directory endpoint error", e.message);
        response.status(500).json({ error: e?.message || String(e) });
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
        if (fs.existsSync(resolved)) {
          return response.status(409).json({ error: "File already exists" });
        }

        fs.writeFileSync(resolved, content || "");
        response.status(200).json({ success: true, path: resolved });
      } catch (e) {
        console.error("create-file endpoint error", e.message);
        response.status(500).json({ error: e?.message || String(e) });
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
        if (!fs.existsSync(resolved)) {
          return response.status(404).json({ error: "Item not found" });
        }

        fs.rmSync(resolved, { recursive: true });
        response.status(200).json({ success: true });
      } catch (e) {
        console.error("delete-item endpoint error", e.message);
        response.status(500).json({ error: e?.message || String(e) });
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
        if (!filePath.startsWith(reportsDir)) {
          return response.sendStatus(403).end();
        }

        if (!fs.existsSync(filePath)) return response.sendStatus(404).end();

        const stat = fs.statSync(filePath);
        const stream = fs.createReadStream(filePath);
        response.setHeader("Content-Type", "application/pdf");
        response.setHeader("Content-Length", stat.size);
        response.setHeader("Cache-Control", "public, max-age=86400");
        stream.pipe(response);
        stream.on("error", () => response.sendStatus(500).end());
      } catch (e) {
        console.error("reports download error", e.message);
        response.sendStatus(500).end();
      }
    },
  );
}

function getGitVersion() {
  if (
    (process.env.OPENSIN_CHAT_RUNTIME || process.env.ANYTHING_LLM_RUNTIME) ===
    "docker"
  )
    return "--";
  try {
    return require("child_process")
      .execSync("git rev-parse HEAD")
      .toString()
      .trim();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("getGitVersion", e.message);
    return "--";
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
