// SPDX-License-Identifier: MIT
const { SystemSettings } = require("../models/systemSettings");

function utilEndpoints(app) {
  if (!app) return;

  app.get("/utils/metrics", async (_, response) => {
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

  const { lemonadeUtilsEndpoints } = require("./utils/lemonadeUtilsEndpoints");
  lemonadeUtilsEndpoints(app);

  const { enhancePromptEndpoint } = require("./utils/enhancePrompt");
  enhancePromptEndpoint(app);

  const { terminalExecEndpoint } = require("./utils/terminalExec");
  terminalExecEndpoint(app);

  // Bundestag DIP API proxy — avoids CORS for the browser (Issue #57)
  app.get("/utils/bundestag/drucksachen", async (req, response) => {
    try {
      const apiKey = process.env.BUNDESTAG_API_KEY || "";
      const params = new URLSearchParams({
        f_fraktion: "AfD",
        format: "json",
        rows: req.query.rows || "10",
        ...(apiKey ? { apikey: apiKey } : {}),
      });
      const res = await fetch(
        `https://search.dip.bundestag.de/api/v1/drucksache?${params}`,
        { headers: { Accept: "application/json" } },
      );
      if (!res.ok) throw new Error(`DIP ${res.status}`);
      const json = await res.json();
      response.status(200).json(json);
    } catch (e) {
      response.status(502).json({ error: e.message });
    }
  });

  // Abgeordnetenwatch proxy — AfD politicians (Issue #57)
  app.get("/utils/bundestag/politicians", async (req, response) => {
    try {
      const params = new URLSearchParams({
        "party[label]": "AfD",
        "legislature[label]": "Bundestag",
        paginationlimit: req.query.limit || "10",
      });
      const res = await fetch(
        `https://www.abgeordnetenwatch.de/api/v2/politicians?${params}`,
        { headers: { Accept: "application/json" } },
      );
      if (!res.ok) throw new Error(`AW ${res.status}`);
      const json = await res.json();
      response.status(200).json(json);
    } catch (e) {
      response.status(502).json({ error: e.message });
    }
  });

  // AfD RSS feed proxy (Issue #58)
  app.get("/utils/political/rss", async (req, response) => {
    try {
      const feed =
        req.query.feed || "https://www.afd.de/feed/";
      const res = await fetch(feed, {
        headers: { "User-Agent": "OpenAfD-Chat/1.0" },
      });
      if (!res.ok) throw new Error(`RSS ${res.status}`);
      const xml = await res.text();
      // Parse titles + links from RSS with simple regex — no xml parser needed
      const items = [];
      const itemRe = /<item>([\s\S]*?)<\/item>/g;
      let m;
      while ((m = itemRe.exec(xml)) !== null && items.length < 8) {
        const block = m[1];
        const title = (/<title><!\[CDATA\[(.+?)\]\]><\/title>/.exec(block) ||
          /<title>(.+?)<\/title>/.exec(block) || [])[1] || "";
        const link = (/<link>([^<]+)<\/link>/.exec(block) || [])[1] || "";
        const pubDate = (/<pubDate>(.+?)<\/pubDate>/.exec(block) || [])[1] || "";
        if (title) items.push({ title: title.trim(), link: link.trim(), pubDate: pubDate.trim() });
      }
      response.status(200).json({ items });
    } catch (e) {
      response.status(502).json({ error: e.message });
    }
  });

  // Filesystem info for FilesystemSidebar (Issue #56)
  app.get("/utils/filesystem", async (_, response) => {
    try {
      const os = require("os");
      const path = require("path");
      const disk = await getDiskStorage();
      response.status(200).json({
        platform: os.platform(),
        nodeVersion: process.version,
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: Math.floor(os.uptime()),
        totalMemMB: Math.round(os.totalmem() / 1024 / 1024),
        freeMemMB: Math.round(os.freemem() / 1024 / 1024),
        uploadPath: process.env.STORAGE_DIR
          ? path.resolve(process.env.STORAGE_DIR)
          : path.resolve("./storage"),
        workDir: process.cwd(),
        storage: disk,
      });
    } catch (e) {
      console.error("filesystem endpoint error", e.message);
      response.sendStatus(500).end();
    }
  });

  // Report download for browser (public, no API key needed) — Issue #55
  // Reports stored in STORAGE_DIR/reports/ — prevent path traversal with basename
  app.get("/utils/reports/:fileName", async (req, response) => {
    try {
      const path = require("path");
      const fs = require("fs");
      const fileName = path.basename(req.params.fileName); // prevent ../../../etc/passwd
      const dir = process.env.STORAGE_DIR
        ? path.resolve(process.env.STORAGE_DIR)
        : path.resolve("./storage");
      const filePath = path.join(dir, "reports", fileName);

      // Verify resolved path is still under reports/ (security check)
      if (!filePath.startsWith(path.join(dir, "reports"))) {
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
  });
}

function getGitVersion() {
  if (process.env.ANYTHING_LLM_RUNTIME === "docker") return "--";
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
 * as well as build features in OpenAfD Chat directly for a specific model or capabilities.
 *
 * Disable with  {@link https://github.com/Family-Team-Projects/openafd-chat?tab=readme-ov-file#telemetry--privacy|Disable Telemetry}
 * @returns {string} The model tag.
 */
function getModelTag() {
  let model = null;
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
    case "togetherai":
      model = process.env.TOGETHER_AI_MODEL_PREF;
      break;
    case "azure":
      model =
        process.env.AZURE_OPENAI_MODEL_PREF || process.env.OPEN_MODEL_PREF;
      break;
    case "koboldcpp":
      model = process.env.KOBOLD_CPP_MODEL_PREF;
      break;
    case "localai":
      model = process.env.LOCAL_AI_MODEL_PREF;
      break;
    case "openrouter":
      model = process.env.OPENROUTER_MODEL_PREF;
      break;
    case "mistral":
      model = process.env.MISTRAL_MODEL_PREF;
      break;
    case "generic-openai":
      model = process.env.GENERIC_OPEN_AI_MODEL_PREF;
      break;
    case "perplexity":
      model = process.env.PERPLEXITY_MODEL_PREF;
      break;
    case "textgenwebui":
      model = "textgenwebui-default";
      break;
    case "bedrock":
      model = process.env.AWS_BEDROCK_LLM_MODEL_PREFERENCE;
      break;
    case "fireworksai":
      model = process.env.FIREWORKS_AI_LLM_MODEL_PREF;
      break;
    case "deepseek":
      model = process.env.DEEPSEEK_MODEL_PREF;
      break;
    case "litellm":
      model = process.env.LITE_LLM_MODEL_PREF;
      break;
    case "apipie":
      model = process.env.APIPIE_LLM_MODEL_PREF;
      break;
    case "xai":
      model = process.env.XAI_LLM_MODEL_PREF;
      break;
    case "novita":
      model = process.env.NOVITA_LLM_MODEL_PREF;
      break;
    case "nvidia-nim":
      model = process.env.NVIDIA_NIM_LLM_MODEL_PREF;
      break;
    case "ppio":
      model = process.env.PPIO_MODEL_PREF;
      break;
    case "gemini":
      model = process.env.GEMINI_LLM_MODEL_PREF;
      break;
    case "moonshotai":
      model = process.env.MOONSHOT_AI_MODEL_PREF;
      break;
    case "zai":
      model = process.env.ZAI_MODEL_PREF;
      break;
    case "giteeai":
      model = process.env.GITEE_AI_MODEL_PREF;
      break;
    case "cohere":
      model = process.env.COHERE_MODEL_PREF;
      break;
    case "docker-model-runner":
      model = process.env.DOCKER_MODEL_RUNNER_LLM_MODEL_PREF;
      break;
    case "privatemode":
      model = process.env.PRIVATEMODE_LLM_MODEL_PREF;
      break;
    case "sambanova":
      model = process.env.SAMBANOVA_LLM_MODEL_PREF;
      break;
    case "lemonade":
      model = process.env.LEMONADE_LLM_MODEL_PREF;
      break;
    case "minimax":
      model = process.env.MINIMAX_MODEL_PREF;
      break;
    case "cerebras":
      model = process.env.CEREBRAS_MODEL_PREF;
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
 * Returns the user agent for the OpenAfD Chat deployment.
 * @returns {string} The user agent.
 */
function getOpenAfDChatUserAgent() {
  const version = getDeploymentVersion() || "unknown";
  return `OpenAfD Chat/${version}`;
}

module.exports = {
  utilEndpoints,
  getGitVersion,
  getModelTag,
  getOpenAfDChatUserAgent,
  getDeploymentVersion,
};
