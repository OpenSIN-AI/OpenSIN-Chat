// SPDX-License-Identifier: MIT
const consoleLogger = require("../logger/console.js");

const { getStoragePath } = require("../paths");
const fs = require("fs");
const path = require("path");
const { safeJsonParse } = require("../http");
const { isWithin, normalizePath } = require("../files");
const { CollectorApi } = require("../collectorApi");
const { safeFetch } = require("../ssrf");
const pluginsPath = getStoragePath("plugins", "agent-skills");
const sharedWebScraper = new CollectorApi();

// Hard limits for community plugin zip imports (see
// importCommunityItemFromUrl below) to prevent a malicious or corrupted
// asset from causing a disk-fill / decompression-bomb denial of service.
const MAX_ZIP_DOWNLOAD_BYTES = 50 * 1024 * 1024; // 50MB compressed download cap
const MAX_ZIP_UNCOMPRESSED_BYTES = 250 * 1024 * 1024; // 250MB extracted-size cap
const MAX_ZIP_ENTRY_COUNT = 5000; // max number of files/dirs in the archive

const ALLOWLIST_PATH = path.resolve(
  __dirname,
  "../../config/plugins-allowlist.toml",
);
const ALLOWLIST_CACHE = { fileMtimeMs: 0, ids: new Set() };

function loadAllowlist() {
  try {
    const stat = fs.statSync(ALLOWLIST_PATH);
    if (
      stat.mtimeMs === ALLOWLIST_CACHE.fileMtimeMs &&
      ALLOWLIST_CACHE.ids.size >= 0
    )
      return ALLOWLIST_CACHE.ids;
    const raw = fs.readFileSync(ALLOWLIST_PATH, "utf8");
    const ids = new Set();
    const arrayMatch = raw.match(/allow\s*=\s*\[([\s\S]*?)\]/);
    if (arrayMatch) {
      const strings = arrayMatch[1].match(/"([^"]*)"/g) || [];
      for (const token of strings) {
        const value = token.slice(1, -1).trim();
        if (/^[a-z0-9._-]+$/i.test(value)) ids.add(value);
      }
    }
    ALLOWLIST_CACHE.fileMtimeMs = stat.mtimeMs;
    ALLOWLIST_CACHE.ids = ids;
    return ids;
  } catch {
    ALLOWLIST_CACHE.ids = new Set();
    return ALLOWLIST_CACHE.ids;
  }
}

function isAllowlisted(hubId) {
  if (!hubId) return false;
  return loadAllowlist().has(hubId);
}

class ImportedPlugin {
  constructor(config) {
    this.config = config;
    this.handlerLocation = path.resolve(
      pluginsPath,
      this.config.hubId,
      "handler.js",
    );
    this.allowlisted = isAllowlisted(this.config.hubId);
    if (!this.allowlisted) {
      consoleLogger.log(
        `ImportedPlugin — hubId '${this.config.hubId}' not on config/plugins-allowlist.toml; skipping handler load`,
      );
      this.handler = null;
      this.name = config.hubId;
      this.startupConfig = { params: {} };
      return;
    }
    delete require.cache[require.resolve(this.handlerLocation)];
    this.handler = require(this.handlerLocation);
    this.name = config.hubId;
    this.startupConfig = {
      params: {},
    };
  }

  /**
   * Gets the imported plugin handler.
   * @param {string} hubId - The hub ID of the plugin.
   * @returns {ImportedPlugin} - The plugin handler.
   */
  static loadPluginByHubId(hubId) {
    const configLocation = path.resolve(
      pluginsPath,
      normalizePath(hubId),
      "plugin.json",
    );
    if (!this.isValidLocation(configLocation)) return;
    const config = safeJsonParse(fs.readFileSync(configLocation, "utf8"));
    return new ImportedPlugin(config);
  }

  static isValidLocation(pathToValidate) {
    if (!isWithin(pluginsPath, pathToValidate)) return false;
    if (!fs.existsSync(pathToValidate)) return false;
    return true;
  }

  /**
   * Checks if the plugin folder exists and if it does not, creates the folder.
   */
  static checkPluginFolderExists() {
    const dir = path.resolve(pluginsPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return;
  }

  /**
   * Loads plugins from `plugins` folder in storage that are custom loaded and defined.
   * only loads plugins that are active: true AND on the handler allowlist.
   * @returns {string[]} - array of plugin names to be loaded later.
   */
  static activeImportedPlugins() {
    const plugins = [];
    this.checkPluginFolderExists();
    const folders = fs.readdirSync(path.resolve(pluginsPath));
    for (const folder of folders) {
      const configLocation = path.resolve(
        pluginsPath,
        normalizePath(folder),
        "plugin.json",
      );
      if (!this.isValidLocation(configLocation)) continue;
      const config = safeJsonParse(fs.readFileSync(configLocation, "utf8"));
      if (config.active && isAllowlisted(config.hubId))
        plugins.push(`@@${config.hubId}`);
    }
    return plugins;
  }

  /**
   * Lists all imported plugins.
   * @returns {Array} - array of plugin configurations (JSON) augmented with `allowlisted`.
   */
  static listImportedPlugins() {
    const plugins = [];
    this.checkPluginFolderExists();
    if (!fs.existsSync(pluginsPath)) return plugins;

    const folders = fs.readdirSync(path.resolve(pluginsPath));
    for (const folder of folders) {
      const configLocation = path.resolve(
        pluginsPath,
        normalizePath(folder),
        "plugin.json",
      );
      if (!this.isValidLocation(configLocation)) continue;
      const config = safeJsonParse(fs.readFileSync(configLocation, "utf8"));
      config.allowlisted = isAllowlisted(config.hubId);
      plugins.push(config);
    }
    return plugins;
  }

  /**
   * Updates a plugin configuration.
   * @param {string} hubId - The hub ID of the plugin.
   * @param {object} config - The configuration to update.
   * @returns {object} - The updated configuration.
   */
  static updateImportedPlugin(hubId, config) {
    const configLocation = path.resolve(
      pluginsPath,
      normalizePath(hubId),
      "plugin.json",
    );
    if (!this.isValidLocation(configLocation)) return;

    const currentConfig = safeJsonParse(
      fs.readFileSync(configLocation, "utf8"),
      null,
    );
    if (!currentConfig) return;

    const updatedConfig = { ...currentConfig, ...config };
    fs.writeFileSync(configLocation, JSON.stringify(updatedConfig, null, 2));
    return updatedConfig;
  }

  /**
   * Deletes a plugin. Removes the entire folder of the object.
   * @param {string} hubId - The hub ID of the plugin.
   * @returns {boolean} - True if the plugin was deleted, false otherwise.
   */
  static deletePlugin(hubId) {
    if (!hubId) throw new Error("No plugin hubID passed.");
    const pluginFolder = path.resolve(pluginsPath, normalizePath(hubId));
    if (!this.isValidLocation(pluginFolder)) return;
    fs.rmSync(pluginFolder, { recursive: true });
    return true;
  }

  /**
   * Validates if the handler.js file exists for the given plugin.
   * @param {string} hubId - The hub ID of the plugin.
   * @returns {boolean} - True if the handler.js file exists, false otherwise.
   */
  static validateImportedPluginHandler(hubId) {
    const handlerLocation = path.resolve(
      pluginsPath,
      normalizePath(hubId),
      "handler.js",
    );
    return this.isValidLocation(handlerLocation);
  }

  parseCallOptions() {
    const callOpts = {};
    if (!this.config.setup_args || typeof this.config.setup_args !== "object") {
      return callOpts;
    }
    for (const [param, definition] of Object.entries(this.config.setup_args)) {
      if (definition.required && !definition?.value) {
        consoleLogger.log(
          `'${param}' required value for '${this.name}' plugin is missing. Plugin may not function or crash agent.`,
        );
        continue;
      }
      callOpts[param] = definition.value || definition.default || null;
    }
    return callOpts;
  }

  plugin(runtimeArgs = {}) {
    if (!this.handler) {
      return {
        runtimeArgs,
        name: this.name,
        config: this.config,
        setup(aibitat) {
          aibitat.function({
            super: aibitat,
            name: this.name,
            description:
              this.config?.description || "Imported plugin (not allowlisted)",
            parameters: {
              $schema: "http://json-schema.org/draft-07/schema#",
              type: "object",
              properties: {},
              additionalProperties: false,
            },
            handler: async () =>
              `Plugin ${this.name} is not on the allowlist and cannot be executed.`,
          });
        },
      };
    }
    const customFunctions = this.handler.runtime;
    return {
      runtimeArgs,
      name: this.name,
      config: this.config,
      setup(aibitat) {
        aibitat.function({
          super: aibitat,
          name: this.name,
          config: this.config,
          runtimeArgs: this.runtimeArgs,
          description: this.config.description,
          // eslint-disable-next-line no-console
          logger: aibitat?.handlerProps?.log || console.log, // Allows plugin to log to the console.
          // eslint-disable-next-line no-console
          introspect: aibitat?.introspect || console.log, // Allows plugin to display a "thought" the chat window UI.
          runtime: "docker",
          webScraper: sharedWebScraper,
          examples: this.config.examples ?? [],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: this.config.entrypoint.params ?? {},
            additionalProperties: false,
          },
          ...customFunctions,
        });
      },
    };
  }

  /**
   * Imports a community item from a URL.
   * The community item is a zip file that contains a plugin.json file and handler.js file.
   * This function will unzip the file and import the plugin into the agent-skills folder
   * based on the hubId found in the plugin.json file.
   * The zip file will be downloaded to the pluginsPath folder and then unzipped and finally deleted.
   * @param {string} url - The signed URL of the community item zip file.
   * @param {object} item - The community item.
   * @returns {Promise<object>} - The result of the import.
   */
  static async importCommunityItemFromUrl(url, item) {
    this.checkPluginFolderExists();
    const hubId = item.id;
    if (!hubId) return { success: false, error: "No hubId passed to import." };

    const zipFilePath = path.resolve(pluginsPath, `${item.id}.zip`);
    const pluginFile = item.manifest.files.find(
      (file) => file.name === "plugin.json",
    );
    if (!pluginFile)
      return {
        success: false,
        error: "No plugin.json file found in manifest.",
      };

    const pluginFolder = path.resolve(pluginsPath, normalizePath(hubId));
    if (fs.existsSync(pluginFolder))
      consoleLogger.log(
        "ImportedPlugin.importCommunityItemFromUrl - plugin folder already exists - will overwrite",
      );

    try {
      // safeFetch re-validates every redirect hop against the private-network
      // blocklist (plain http.get + validateUrl alone is redirect-SSRFable).
      consoleLogger.log(
        "ImportedPlugin.importCommunityItemFromUrl - downloading asset from ",
        new URL(url).origin,
      );
      let response;
      try {
        response = await safeFetch(url, {
          signal: AbortSignal.timeout(30_000),
        });
      } catch (error) {
        consoleLogger.error(
          "ImportedPlugin.importCommunityItemFromUrl - error downloading zip file: ",
          error,
        );
        return { success: false, error: "Failed to download zip file." };
      }
      if (!response.ok) {
        consoleLogger.error(
          "ImportedPlugin.importCommunityItemFromUrl - HTTP",
          response.status,
          "downloading zip file",
        );
        return { success: false, error: "Failed to download zip file." };
      }

      const contentLength = response.headers.get("content-length");
      if (
        contentLength &&
        parseInt(contentLength, 10) > MAX_ZIP_DOWNLOAD_BYTES
      ) {
        consoleLogger.error(
          `ImportedPlugin.importCommunityItemFromUrl - Content-Length ${contentLength} exceeds ${MAX_ZIP_DOWNLOAD_BYTES} byte limit, aborting.`,
        );
        return { success: false, error: "Failed to download zip file." };
      }

      // Stream to disk with a hard byte cap (Content-Length can be absent/liar).
      const reader = response.body?.getReader?.();
      if (!reader) {
        const buf = Buffer.from(await response.arrayBuffer());
        if (buf.length > MAX_ZIP_DOWNLOAD_BYTES) {
          consoleLogger.error(
            `ImportedPlugin.importCommunityItemFromUrl - download exceeded ${MAX_ZIP_DOWNLOAD_BYTES} byte limit, aborting.`,
          );
          return { success: false, error: "Failed to download zip file." };
        }
        fs.writeFileSync(zipFilePath, buf);
      } else {
        const chunks = [];
        let bytesReceived = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytesReceived += value.byteLength;
          if (bytesReceived > MAX_ZIP_DOWNLOAD_BYTES) {
            await reader.cancel().catch(() => {});
            consoleLogger.error(
              `ImportedPlugin.importCommunityItemFromUrl - download exceeded ${MAX_ZIP_DOWNLOAD_BYTES} byte limit, aborting.`,
            );
            try {
              fs.unlinkSync(zipFilePath);
            } catch {
              /* ignore */
            }
            return { success: false, error: "Failed to download zip file." };
          }
          chunks.push(Buffer.from(value));
        }
        fs.writeFileSync(zipFilePath, Buffer.concat(chunks));
      }
      consoleLogger.log(
        "ImportedPlugin.importCommunityItemFromUrl - downloaded zip file",
      );

      // Unzip the file to the plugin folder
      // Note: https://github.com/cthackers/adm-zip?tab=readme-ov-file#electron-original-fs
      const AdmZip = require("adm-zip");
      const zip = new AdmZip(zipFilePath);

      // Guard against decompression ("zip bomb") DoS: a tiny compressed
      // file can expand to an enormous amount of data or an enormous
      // number of files, exhausting disk space or inodes during
      // extraction. Check the *uncompressed* size and entry count
      // declared in the zip's central directory before extracting
      // anything.
      const zipEntries = zip.getEntries();
      if (zipEntries.length > MAX_ZIP_ENTRY_COUNT) {
        throw new Error(
          `Zip file contains ${zipEntries.length} entries, which exceeds the limit of ${MAX_ZIP_ENTRY_COUNT}.`,
        );
      }
      const totalUncompressedSize = zipEntries.reduce(
        (sum, entry) => sum + (entry.header?.size || 0),
        0,
      );
      if (totalUncompressedSize > MAX_ZIP_UNCOMPRESSED_BYTES) {
        throw new Error(
          `Zip file would extract to ${totalUncompressedSize} bytes, which exceeds the limit of ${MAX_ZIP_UNCOMPRESSED_BYTES}.`,
        );
      }

      // Validate all zip entries to prevent Zip Slip path traversal attacks (CWE-22)
      for (const entry of zip.getEntries()) {
        const entryPath = path.resolve(pluginFolder, entry.entryName);
        if (!isWithin(pluginFolder, entryPath) && pluginFolder !== entryPath) {
          throw new Error(
            `[ImportedPlugin.importCommunityItemFromUrl]: Entry "${entry.entryName}" would extract outside plugin folder - not allowed.`,
          );
        }
      }

      zip.extractAllTo(pluginFolder);

      // We want to make sure specific keys are set to the proper values for
      // plugin.json so we read and overwrite the file with the proper values.
      const pluginJsonPath = path.resolve(pluginFolder, "plugin.json");
      const pluginJson = safeJsonParse(fs.readFileSync(pluginJsonPath, "utf8"));
      pluginJson.active = false;
      pluginJson.hubId = hubId;
      fs.writeFileSync(pluginJsonPath, JSON.stringify(pluginJson, null, 2));

      consoleLogger.log(
        `ImportedPlugin.importCommunityItemFromUrl - successfully imported plugin to agent-skills/${hubId}`,
      );
      return { success: true, error: null };
    } catch (error) {
      consoleLogger.error(
        "ImportedPlugin.importCommunityItemFromUrl - error: ",
        error,
      );
      return { success: false, error: error.message };
    } finally {
      if (fs.existsSync(zipFilePath)) fs.unlinkSync(zipFilePath);
    }
  }
}

module.exports = ImportedPlugin;
