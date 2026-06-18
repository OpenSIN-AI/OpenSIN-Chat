// SPDX-License-Identifier: MIT
// Purpose: Central data-access layer for application-wide system settings.
// Docs: server/models/systemSettings.doc.md
process.env.NODE_ENV === "development"
  ? require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` })
  : require("dotenv").config();

const { default: slugify } = require("slugify");
const { isValidUrl, safeJsonParse } = require("../utils/http");
const { getStoragePath } = require("../utils/paths");
const prisma = require("../utils/prisma");
const { MetaGenerator } = require("../utils/boot/MetaGenerator");
const { PGVector } = require("../utils/vectorDbProviders/pgvector");
const { NativeEmbedder } = require("../utils/EmbeddingEngines/native");
const { getBaseLLMProviderModel } = require("../utils/helpers");
const {
  ConnectionStringParser,
} = require("../utils/agents/aibitat/plugins/sql-agent/SQLConnectors/utils");

function isNullOrNaN(value) {
  if (value === null) return true;
  return isNaN(value);
}

/**
 * Merges a string field from source to target if it passes validation.
 * @param {Object} target - The target object to merge into
 * @param {Object} source - The source object to read from
 * @param {string} fieldName - The field name to merge
 * @param {Function|null} validator - Optional validator function that returns false to reject the value
 */
function mergeStringField(target, source, fieldName, validator = null) {
  const value = source[fieldName];
  if (value && typeof value === "string" && value.trim()) {
    if (validator && !validator(value)) return;
    target[fieldName] = value.trim();
  }
}

const SystemSettings = {
  /** A default system prompt that is used when no other system prompt is set or available to the function caller.
   * OpenSIN Chat — German-language default with mandatory source citation.
   * Designed for political and policy work: every claim must be backed by a document or explicit reasoning.
   */
  saneDefaultSystemPrompt: [
    "Du bist OpenSIN Chat — ein sovereiner KI-Arbeitsraum für patriotische Politik.",
    "",
    "Antworte immer auf Deutsch, präzise, sachlich und auf Quellen gestützt.",
    "",
    "Pflicht-Regeln für jede Antwort:",
    "1. Wenn dir Kontext aus hochgeladenen Dokumenten vorliegt, zitiere ihn mit konkretem Quellen-Hinweis (Dokumentname, Seite, Absatz).",
    "2. Wenn du aus deinem Trainings-Wissen antwortest, kennzeichne das transparent als 'allgemeine Information' und nicht als 'aus den Dokumenten belegt'.",
    "3. Erfinde keine Zitate, Zahlen, Daten, Personen oder Ereignisse. Wenn du etwas nicht sicher weißt, sage es offen.",
    "4. Bei politischen oder juristischen Fragen: nenne immer auch die zugrundeliegende Quelle (Gesetz, Bundestags-Drucksache, Pressemitteilung, Gerichtsurteil).",
    "5. Antworte ausgewogen, aber parteilich im Sinne einer freiheitlich-konservativen politischen Analyse — so wie es dein Nutzer erwartet. Bleibe dabei respektvoll und faktenbasiert.",
    "6. Werkzeug-Zugriff: Du hast KEINE Werkzeuge (kein Webzugriff, kein Dateisystem, keine Suche) im normalen Chat-Modus. Wenn der Nutzer Aufgaben verlangt, die Live-Daten, Webrecherche, Datei-Operationen oder andere Aktionen erfordern, sage ehrlich, dass du das im normalen Chat nicht kannst, und weise den Nutzer darauf hin, dass er die Anfrage mit dem Präfix `@agent` (z. B. `@agent Suche im Web nach Wetter Berlin`) erneut senden muss, um den Agenten-Modus mit vollem Werkzeug-Zugriff zu aktivieren. Auf Fragen nach deinen Fähigkeiten (Webzugriff, Internet, Tools) antworte transparent, dass Werkzeuge über `@agent` verfügbar sind.",
    "",
    "Struktur & Formatierung (Markdown — wie ein erstklassiger Analyst):",
    "- Beginne komplexe Antworten mit einem kurzen Fazit-Satz (1–2 Zeilen), der die Kernaussage vorwegnimmt; dann folgen die Details.",
    "- Gliedere mit aussagekräftigen Überschriften (##, ###), sobald eine Antwort mehrere Aspekte hat. Kurze, einfache Antworten bleiben aber kurz — formatiere nicht künstlich auf.",
    "- Nutze Aufzählungen (-) für Listen und nummerierte Listen (1.) für Reihenfolgen oder Schritte. Halte Listenpunkte parallel und knapp.",
    "- Hebe Schlüsselbegriffe, Namen, Zahlen und Fristen mit **Fettschrift** hervor.",
    "- Verwende Tabellen, wenn du mehrere Optionen, Positionen oder Daten vergleichst.",
    "- Setze Gesetzes-, Paragraphen- und Aktenzeichen sowie wörtliche Zitate in `Code-Spans` oder Blockzitate (>), damit sie klar erkennbar sind.",
    "- Schreibe in klaren, kurzen Sätzen. Vermeide Füllwörter, Wiederholungen und Behörden-Deutsch. Ein Gedanke pro Satz.",
    "- Schließe längere Antworten mit einer kurzen Zusammenfassung oder den konkreten nächsten Schritten ab.",
    "- Passe Länge und Tiefe an die Frage an: einfache Frage → knappe Antwort; komplexe Analyse → vollständige Struktur.",
    "",
    "Antworte auf die Frage des Nutzers unter Berücksichtigung dieser Regeln und des bereitgestellten Kontexts.",
  ].join("\n"),
  protectedFields: ["multi_user_mode", "hub_api_key", "onboarding_complete"],
  publicFields: [
    "footer_data",
    "support_email",
    "text_splitter_chunk_size",
    "text_splitter_chunk_overlap",
    "max_embed_chunk_size",
    "agent_search_provider",
    "agent_sql_connections",
    "default_agent_skills",
    "disabled_agent_skills",
    "disabled_filesystem_skills",
    "disabled_create_files_skills",
    "disabled_gmail_skills",
    "gmail_agent_config",
    "disabled_google_calendar_skills",
    "google_calendar_agent_config",
    "disabled_outlook_skills",
    "outlook_agent_config",
    "imported_agent_skills",
    "agent_clarifying_questions_enabled",
    "agent_clarifying_questions_max_per_turn",
    "custom_app_name",
    "feature_flags",
    "meta_page_title",
    "meta_page_favicon",
    "memory_enabled",
    "memory_auto_extraction",

    // Image generation settings
    "image_generation_base_path",
    "image_generation_model",
  ],
  supportedFields: [
    "logo_filename",
    "telemetry_id",
    "footer_data",
    "support_email",

    "text_splitter_chunk_size",
    "text_splitter_chunk_overlap",
    "agent_search_provider",
    "default_agent_skills",
    "disabled_agent_skills",
    "disabled_filesystem_skills",
    "disabled_create_files_skills",
    "disabled_gmail_skills",
    "gmail_agent_config",
    "disabled_google_calendar_skills",
    "google_calendar_agent_config",
    "disabled_outlook_skills",
    "outlook_agent_config",
    "agent_sql_connections",
    "agent_clarifying_questions_enabled",
    "agent_clarifying_questions_max_per_turn",
    "custom_app_name",
    "default_system_prompt",

    // Meta page customization
    "meta_page_title",
    "meta_page_favicon",

    // beta feature flags
    "experimental_live_file_sync",

    // Hub settings
    "hub_api_key",

    // Memory/Personalization
    "memory_enabled",
    "memory_auto_extraction",

    // Image generation settings
    "image_generation_base_path",
    "image_generation_api_key",
    "image_generation_model",
  ],
  validations: {
    footer_data: (updates) => {
      try {
        const array = JSON.parse(updates)
          .filter((setting) => isValidUrl(setting.url))
          .slice(0, 3); // max of 3 items in footer.
        return JSON.stringify(array);
      } catch {
        // eslint-disable-next-line no-console
        console.error(`Failed to run validation function on footer_data`);
        return JSON.stringify([]);
      }
    },
    text_splitter_chunk_size: (update) => {
      try {
        if (isNullOrNaN(update)) throw new Error("Value is not a number.");
        if (Number(update) <= 0) throw new Error("Value must be non-zero.");
        const { purgeEntireVectorCache } = require("../utils/files");
        purgeEntireVectorCache();
        return Number(update);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(
          `Failed to run validation function on text_splitter_chunk_size`,
          e.message,
        );
        return 1000;
      }
    },
    text_splitter_chunk_overlap: (update) => {
      try {
        if (isNullOrNaN(update)) throw new Error("Value is not a number");
        if (Number(update) < 0) throw new Error("Value cannot be less than 0.");
        const { purgeEntireVectorCache } = require("../utils/files");
        purgeEntireVectorCache();
        return Number(update);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(
          `Failed to run validation function on text_splitter_chunk_overlap`,
          e.message,
        );
        return 20;
      }
    },
    agent_search_provider: (update) => {
      try {
        if (update === "none") return null;
        if (
          ![
            "google-search-engine",
            "serpapi",
            "searchapi",
            "serper-dot-dev",
            "bing-search",
            "baidu-search",
            "serply-engine",
            "searxng-engine",
            "tavily-search",
            "duckduckgo-engine",
            "exa-search",
            "perplexity-search",
            "vane",
          ].includes(update)
        )
          throw new Error("Invalid SERP provider.");
        return String(update);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(
          `Failed to run validation function on agent_search_provider`,
          e.message,
        );
        return null;
      }
    },
    default_agent_skills: (updates) => {
      try {
        const skills = updates.split(",").filter((skill) => !!skill);
        return JSON.stringify(skills);
      } catch {
        // eslint-disable-next-line no-console
        console.error(`Could not validate agent skills.`);
        return JSON.stringify([]);
      }
    },
    memory_enabled: async (update) => {
      try {
        const enabled = String(update) === "true";
        const {
          BackgroundService,
        } = require("../utils/BackgroundWorkers/index.js");
        const bgService = new BackgroundService();
        const autoSetting = await SystemSettings.get({
          label: "memory_auto_extraction",
        });
        const autoOn = !autoSetting || autoSetting.value === "true";
        await bgService.syncMemoryJob(enabled && autoOn);
        return String(enabled);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(
          `Failed to run validation function on memory_enabled`,
          e.message,
        );
        return String(update);
      }
    },
    memory_auto_extraction: async (update) => {
      try {
        const enabled = String(update) === "true";
        const {
          BackgroundService,
        } = require("../utils/BackgroundWorkers/index.js");
        const bgService = new BackgroundService();
        const memoriesOn = await SystemSettings.memoriesEnabled();
        await bgService.syncMemoryJob(memoriesOn && enabled);
        return String(enabled);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(
          `Failed to run validation function on memory_auto_extraction`,
          e.message,
        );
        return String(update);
      }
    },
    disabled_agent_skills: (updates) => {
      try {
        const skills = updates.split(",").filter((skill) => !!skill);
        return JSON.stringify(skills);
      } catch {
        // eslint-disable-next-line no-console
        console.error(`Could not validate disabled agent skills.`);
        return JSON.stringify([]);
      }
    },
    disabled_filesystem_skills: (updates) => {
      try {
        const skills = updates.split(",").filter((skill) => !!skill);
        return JSON.stringify(skills);
      } catch {
        // eslint-disable-next-line no-console
        console.error(`Could not validate disabled filesystem skills.`);
        return JSON.stringify([]);
      }
    },
    disabled_create_files_skills: (updates) => {
      try {
        const skills = updates.split(",").filter((skill) => !!skill);
        return JSON.stringify(skills);
      } catch {
        // eslint-disable-next-line no-console
        console.error(`Could not validate disabled create files skills.`);
        return JSON.stringify([]);
      }
    },
    disabled_gmail_skills: (updates) => {
      try {
        const skills = updates.split(",").filter((skill) => !!skill);
        return JSON.stringify(skills);
      } catch {
        // eslint-disable-next-line no-console
        console.error(`Could not validate disabled gmail skills.`);
        return JSON.stringify([]);
      }
    },
    gmail_agent_config: async (update) => {
      const GmailBridge = require("../utils/agents/aibitat/plugins/gmail/lib");
      try {
        if (!update) return JSON.stringify({});

        const newConfig =
          typeof update === "string" ? safeJsonParse(update, {}) : update;
        const existingConfig = safeJsonParse(
          (await SystemSettings.get({ label: "gmail_agent_config" }))?.value,
          {},
        );

        const mergedConfig = { ...existingConfig };

        mergeStringField(mergedConfig, newConfig, "deploymentId");
        mergeStringField(
          mergedConfig,
          newConfig,
          "apiKey",
          (v) => !v.match(/^\*+$/),
        );

        return JSON.stringify(mergedConfig);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`Could not validate gmail agent config:`, e.message);
        return JSON.stringify({});
      } finally {
        GmailBridge.reset();
      }
    },
    disabled_google_calendar_skills: (updates) => {
      try {
        const skills = updates.split(",").filter((skill) => !!skill);
        return JSON.stringify(skills);
      } catch {
        // eslint-disable-next-line no-console
        console.error(`Could not validate disabled google calendar skills.`);
        return JSON.stringify([]);
      }
    },
    google_calendar_agent_config: async (update) => {
      const GoogleCalendarBridge = require("../utils/agents/aibitat/plugins/google-calendar/lib");
      try {
        if (!update) return JSON.stringify({});

        const newConfig =
          typeof update === "string" ? safeJsonParse(update, {}) : update;
        const existingConfig = safeJsonParse(
          (await SystemSettings.get({ label: "google_calendar_agent_config" }))
            ?.value,
          {},
        );

        const mergedConfig = { ...existingConfig };

        mergeStringField(mergedConfig, newConfig, "deploymentId");
        mergeStringField(
          mergedConfig,
          newConfig,
          "apiKey",
          (v) => !v.match(/^\*+$/),
        );

        return JSON.stringify(mergedConfig);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(
          `Could not validate google calendar agent config:`,
          e.message,
        );
        return JSON.stringify({});
      } finally {
        GoogleCalendarBridge.reset();
      }
    },
    disabled_outlook_skills: (updates) => {
      try {
        const skills = updates.split(",").filter((skill) => !!skill);
        return JSON.stringify(skills);
      } catch {
        // eslint-disable-next-line no-console
        console.error(`Could not validate disabled outlook skills.`);
        return JSON.stringify([]);
      }
    },
    outlook_agent_config: async (update) => {
      const OutlookBridge = require("../utils/agents/aibitat/plugins/outlook/lib");
      try {
        if (!update) return JSON.stringify({});

        const newConfig =
          typeof update === "string" ? safeJsonParse(update, {}) : update;
        const existingConfig = safeJsonParse(
          (await SystemSettings.get({ label: "outlook_agent_config" }))?.value,
          {},
        );

        const mergedConfig = { ...existingConfig };

        mergeStringField(mergedConfig, newConfig, "clientId");
        mergeStringField(mergedConfig, newConfig, "tenantId");
        mergeStringField(
          mergedConfig,
          newConfig,
          "clientSecret",
          (v) => !v.match(/^\*+$/),
        );

        if (newConfig.accessToken !== undefined) {
          mergedConfig.accessToken = newConfig.accessToken;
        }
        if (newConfig.refreshToken !== undefined) {
          mergedConfig.refreshToken = newConfig.refreshToken;
        }
        if (newConfig.tokenExpiry !== undefined) {
          mergedConfig.tokenExpiry = newConfig.tokenExpiry;
        }

        return JSON.stringify(mergedConfig);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`Could not validate outlook agent config:`, e.message);
        return JSON.stringify({});
      } finally {
        OutlookBridge.reset();
      }
    },
    agent_sql_connections: async (updates) => {
      const existingConnections = safeJsonParse(
        (await SystemSettings.get({ label: "agent_sql_connections" }))?.value,
        [],
      );
      try {
        const updatedConnections = mergeConnections(
          existingConnections,
          safeJsonParse(updates, []),
        );
        return JSON.stringify(updatedConnections);
      } catch {
        // eslint-disable-next-line no-console
        console.error(`Failed to merge connections`);
        return JSON.stringify(existingConnections ?? []);
      }
    },
    agent_clarifying_questions_enabled: (update) => {
      if (typeof update === "boolean") return update ? "true" : "false";
      return String(update) === "true" ? "true" : "false";
    },
    agent_clarifying_questions_max_per_turn: (update) => {
      const n = Number(update);
      if (!Number.isFinite(n) || n < 1) return 3;
      return Math.min(Math.floor(n), 10);
    },
    experimental_live_file_sync: (update) => {
      if (typeof update === "boolean")
        return update === true ? "enabled" : "disabled";
      if (!["enabled", "disabled"].includes(update)) return "disabled";
      return String(update);
    },
    meta_page_title: (newTitle) => {
      try {
        if (typeof newTitle !== "string" || !newTitle) return null;
        return String(newTitle);
      } catch {
        return null;
      } finally {
        new MetaGenerator().clearConfig();
      }
    },
    meta_page_favicon: (faviconUrl) => {
      if (!faviconUrl) return null;
      try {
        const url = new URL(faviconUrl);
        return url.toString();
      } catch {
        return null;
      } finally {
        new MetaGenerator().clearConfig();
      }
    },
    hub_api_key: (apiKey) => {
      if (!apiKey) return null;
      return String(apiKey);
    },
    default_system_prompt: (prompt) => {
      if (typeof prompt !== "string" || !prompt) return null;
      if (prompt.trim() === SystemSettings.saneDefaultSystemPrompt)
        return SystemSettings.saneDefaultSystemPrompt;
      return String(prompt.trim());
    },
    image_generation_base_path: (update) => {
      try {
        if (!update || typeof update !== "string") return undefined;
        const url = new URL(update);
        if (!/^https?:$/i.test(url.protocol)) return undefined;
        return url.origin + url.pathname.replace(/\/+$/, "");
      } catch {
        return undefined;
      }
    },
    image_generation_api_key: async (update) => {
      if (!update || typeof update !== "string") return undefined;
      if (/^-CLEAR-$/.test(update)) {
        return null;
      }
      if (/^\*+$/.test(update)) {
        const existing = await SystemSettings.get({
          label: "image_generation_api_key",
        });
        return existing?.value ?? null;
      }
      return String(update).trim();
    },
    image_generation_model: (update) => {
      if (!update || typeof update !== "string") return undefined;
      return String(update).trim();
    },
  },
  currentSettings: async function () {
    const { hasVectorCachedFiles } = require("../utils/files");
    const {
      ToolReranker,
    } = require("../utils/agents/aibitat/utils/toolReranker");
    const AIbitat = require("../utils/agents/aibitat");

    const llmProvider = process.env.LLM_PROVIDER;
    const vectorDB = process.env.VECTOR_DB;
    const embeddingEngine = process.env.EMBEDDING_ENGINE ?? "native";
    return {
      // --------------------------------------------------------
      // General Settings
      // --------------------------------------------------------
      RequiresAuth: !!process.env.AUTH_TOKEN,
      AuthToken: !!process.env.AUTH_TOKEN,
      JWTSecret: !!process.env.JWT_SECRET,
      StorageDir: getStoragePath(),
      MultiUserMode: await this.isMultiUserMode(),
      MemoryEnabled: await this.memoriesEnabled(),
      MemoryAutoExtraction: await this.memoryAutoExtractionSetting(),
      DisableTelemetry: process.env.DISABLE_TELEMETRY || "false",

      // --------------------------------------------------------
      // Embedder Provider Selection Settings & Configs
      // --------------------------------------------------------
      EmbeddingEngine: embeddingEngine,
      HasExistingEmbeddings: await this.hasEmbeddings(), // check if they have any currently embedded documents active in workspaces.
      HasCachedEmbeddings: hasVectorCachedFiles(), // check if they any currently cached embedded docs.
      EmbeddingBasePath: process.env.EMBEDDING_BASE_PATH,
      EmbeddingModelPref:
        embeddingEngine === "native"
          ? NativeEmbedder._getEmbeddingModel()
          : process.env.EMBEDDING_MODEL_PREF,
      EmbeddingOutputDimensions:
        process.env.EMBEDDING_OUTPUT_DIMENSIONS || null,
      EmbeddingModelMaxChunkLength:
        process.env.EMBEDDING_MODEL_MAX_CHUNK_LENGTH,
      OllamaEmbeddingBatchSize: process.env.OLLAMA_EMBEDDING_BATCH_SIZE || 1,
      VoyageAiApiKey: !!process.env.VOYAGEAI_API_KEY,
      GenericOpenAiEmbeddingApiKey:
        !!process.env.GENERIC_OPEN_AI_EMBEDDING_API_KEY,
      GenericOpenAiEmbeddingMaxConcurrentChunks:
        process.env.GENERIC_OPEN_AI_EMBEDDING_MAX_CONCURRENT_CHUNKS || 500,
      GeminiEmbeddingApiKey: !!process.env.GEMINI_EMBEDDING_API_KEY,

      // --------------------------------------------------------
      // VectorDB Provider Selection Settings & Configs
      // --------------------------------------------------------
      VectorDB: vectorDB,
      ...this.vectorDBPreferenceKeys(),

      // --------------------------------------------------------
      // LLM Provider Selection Settings & Configs
      // --------------------------------------------------------
      LLMProvider: llmProvider,
      LLMModel: getBaseLLMProviderModel({ provider: llmProvider }) || null,
      ModelRouterId: process.env.MODEL_ROUTER_ID || null,
      ...this.llmPreferenceKeys(),

      // --------------------------------------------------------
      // Whisper (Audio transcription) Selection Settings & Configs
      // - Currently the only 3rd party is OpenAI, so is OPEN_AI_KEY is set
      // - then it can be shared.
      // --------------------------------------------------------
      WhisperProvider: process.env.WHISPER_PROVIDER || "local",
      WhisperModelPref:
        process.env.WHISPER_MODEL_PREF || "Xenova/whisper-small",

      // --------------------------------------------------------
      // TTS/STT  Selection Settings & Configs
      // - Currently the only 3rd party is OpenAI or the native browser-built in
      // --------------------------------------------------------
      TextToSpeechProvider: process.env.TTS_PROVIDER || "native",
      TTSOpenAIKey: !!process.env.TTS_OPEN_AI_KEY,
      TTSOpenAIVoiceModel: process.env.TTS_OPEN_AI_VOICE_MODEL,

      // Eleven Labs TTS
      TTSElevenLabsKey: !!process.env.TTS_ELEVEN_LABS_KEY,
      TTSElevenLabsVoiceModel: process.env.TTS_ELEVEN_LABS_VOICE_MODEL,
      // Piper TTS
      TTSPiperTTSVoiceModel:
        process.env.TTS_PIPER_VOICE_MODEL ?? "en_US-hfc_female-medium",
      // OpenAI Generic TTS
      TTSOpenAICompatibleKey: !!process.env.TTS_OPEN_AI_COMPATIBLE_KEY,
      TTSOpenAICompatibleModel: process.env.TTS_OPEN_AI_COMPATIBLE_MODEL,
      TTSOpenAICompatibleVoiceModel:
        process.env.TTS_OPEN_AI_COMPATIBLE_VOICE_MODEL,
      TTSOpenAICompatibleEndpoint: process.env.TTS_OPEN_AI_COMPATIBLE_ENDPOINT,
      // Kokoro TTS
      TTSKokoroEndpoint: process.env.TTS_KOKORO_ENDPOINT,
      TTSKokoroKey: !!process.env.TTS_KOKORO_KEY,
      TTSKokoroVoiceModel: process.env.TTS_KOKORO_VOICE_MODEL,

      // STT Selection
      SpeechToTextProvider: process.env.STT_PROVIDER || "native",
      // STT OpenAI
      STTOpenAIModel: process.env.STT_OPEN_AI_MODEL,

      // STT Deepgram
      STTDeepgramApiKey: !!process.env.STT_DEEPGRAM_API_KEY,
      STTDeepgramModel: process.env.STT_DEEPGRAM_MODEL,

      // STT Generic OpenAI
      STTOpenAICompatibleKey: !!process.env.STT_OPEN_AI_COMPATIBLE_KEY,
      STTOpenAICompatibleModel: process.env.STT_OPEN_AI_COMPATIBLE_MODEL,
      STTOpenAICompatibleEndpoint: process.env.STT_OPEN_AI_COMPATIBLE_ENDPOINT,

      // --------------------------------------------------------
      // Agent Settings & Configs
      // --------------------------------------------------------
      AgentSerpApiKey: !!process.env.AGENT_SERPAPI_API_KEY || null,
      AgentSerpApiEngine: process.env.AGENT_SERPAPI_ENGINE || "google",
      AgentSearchApiKey: !!process.env.AGENT_SEARCHAPI_API_KEY || null,
      AgentSearchApiEngine: process.env.AGENT_SEARCHAPI_ENGINE || "google",
      AgentSerperApiKey: !!process.env.AGENT_SERPER_DEV_KEY || null,
      AgentBingSearchApiKey: !!process.env.AGENT_BING_SEARCH_API_KEY || null,
      AgentBaiduSearchApiKey: !!process.env.AGENT_BAIDU_SEARCH_API_KEY || null,
      AgentSerplyApiKey: !!process.env.AGENT_SERPLY_API_KEY || null,
      AgentSearXNGApiUrl: process.env.AGENT_SEARXNG_API_URL || null,
      AgentTavilyApiKey: !!process.env.AGENT_TAVILY_API_KEY || null,
      AgentExaApiKey: !!process.env.AGENT_EXA_API_KEY || null,
      AgentPerplexityApiKey: !!process.env.AGENT_PERPLEXITY_API_KEY || null,

      // --------------------------------------------------------
      // Compliance Settings
      // --------------------------------------------------------
      // Disable View Chat History for the whole instance.
      DisableViewChatHistory:
        "DISABLE_VIEW_CHAT_HISTORY" in process.env || false,
      WorkspaceDeletionProtection:
        "WORKSPACE_DELETION_PROTECTION" in process.env || false,

      // --------------------------------------------------------
      // Simple SSO Settings
      // --------------------------------------------------------
      SimpleSSOEnabled: "SIMPLE_SSO_ENABLED" in process.env || false,
      SimpleSSONoLogin: "SIMPLE_SSO_NO_LOGIN" in process.env || false,
      SimpleSSONoLoginRedirect: this.simpleSSO.noLoginRedirect(),

      // --------------------------------------------------------
      // Agent Skill Settings
      // --------------------------------------------------------
      AgentSkillMaxToolCalls: AIbitat.defaultMaxToolCalls(),
      AgentSkillRerankerEnabled: ToolReranker.isEnabled(),
      AgentSkillRerankerTopN: ToolReranker.getTopN(),
      AgentClarifyingQuestionsEnabled:
        (await this.getValueOrFallback(
          { label: "agent_clarifying_questions_enabled" },
          "false",
        )) === "true",
      AgentClarifyingQuestionsMaxPerTurn: Number(
        (await this.getValueOrFallback(
          { label: "agent_clarifying_questions_max_per_turn" },
          "3",
        )) || 3,
      ),
    };
  },

  get: async function (clause = {}) {
    try {
      const setting = await prisma.system_settings.findFirst({ where: clause });
      return setting || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return null;
    }
  },

  getValueOrFallback: async function (clause = {}, fallback = null) {
    try {
      return (await this.get(clause))?.value ?? fallback;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return fallback;
    }
  },

  where: async function (clause = {}, limit) {
    try {
      const settings = await prisma.system_settings.findMany({
        where: clause,
        take: limit || undefined,
      });
      return settings;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return [];
    }
  },

  // Can take generic keys and will pre-filter invalid keys
  // from the set before sending to the explicit update function
  // that will then enforce validations as well.
  updateSettings: async function (updates = {}) {
    const validFields = Object.keys(updates).filter((key) =>
      this.supportedFields.includes(key),
    );

    Object.entries(updates).forEach(([key]) => {
      if (validFields.includes(key)) return;
      delete updates[key];
    });

    return this._updateSettings(updates);
  },

  delete: async function (clause = {}) {
    try {
      if (!Object.keys(clause).length)
        throw new Error("Clause cannot be empty");
      await prisma.system_settings.deleteMany({ where: clause });
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return false;
    }
  },

  // Explicit update of settings + key validations.
  // Only use this method when directly setting a key value
  // that takes no user input for the keys being modified.
  _updateSettings: async function (updates = {}) {
    try {
      const updatePromises = [];
      for (const key of Object.keys(updates)) {
        let validatedValue = updates[key];
        if (this.validations.hasOwnProperty(key)) {
          if (this.validations[key].constructor.name === "AsyncFunction") {
            validatedValue = await this.validations[key](updates[key]);
          } else {
            validatedValue = this.validations[key](updates[key]);
          }
        }

        if (validatedValue === undefined) continue;

        updatePromises.push(
          prisma.system_settings.upsert({
            where: { label: key },
            update: {
              value: validatedValue === null ? null : String(validatedValue),
            },
            create: {
              label: key,
              value: validatedValue === null ? null : String(validatedValue),
            },
          }),
        );
      }

      await Promise.all(updatePromises);
      return { success: true, error: null };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("FAILED TO UPDATE SYSTEM SETTINGS", error.message);
      return { success: false, error: error.message };
    }
  },

  isMultiUserMode: async function () {
    try {
      const setting = await this.get({ label: "multi_user_mode" });
      return setting?.value === "true";
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return false;
    }
  },

  memoriesEnabled: async function () {
    try {
      const setting = await this.get({ label: "memory_enabled" });
      return setting?.value === "true";
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return false;
    }
  },

  autoMemoriesEnabled: async function () {
    try {
      if (!(await this.memoriesEnabled())) return false;
      const setting = await this.get({ label: "memory_auto_extraction" });
      return !setting || setting.value === "true";
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return false;
    }
  },

  memoryAutoExtractionSetting: async function () {
    try {
      const setting = await this.get({ label: "memory_auto_extraction" });
      return !setting || setting.value === "true";
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return true;
    }
  },

  isOnboardingComplete: async function () {
    // Onboarding is permanently disabled for this instance.
    // Hardcoded so the onboarding flow never appears, regardless of the
    // onboarding_complete DB flag.
    return true;
  },

  markOnboardingComplete: async function () {
    try {
      await this._updateSettings({ onboarding_complete: true });
      const { Telemetry } = require("./telemetry");
      await Telemetry.sendTelemetry("onboarding_complete");
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return false;
    }
  },

  currentLogoFilename: async function () {
    try {
      const setting = await this.get({ label: "logo_filename" });
      return setting?.value || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return null;
    }
  },

  hasEmbeddings: async function () {
    try {
      const { Document } = require("./documents");
      const count = await Document.count({}, 1);
      return count > 0;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return false;
    }
  },

  vectorDBPreferenceKeys: function () {
    return {
      // Pinecone DB Keys
      PineConeKey: !!process.env.PINECONE_API_KEY,
      PineConeIndex: process.env.PINECONE_INDEX,

      // Chroma DB Keys
      ChromaEndpoint: process.env.CHROMA_ENDPOINT,
      ChromaApiHeader: process.env.CHROMA_API_HEADER,
      ChromaApiKey: !!process.env.CHROMA_API_KEY,

      // ChromaCloud DB Keys
      ChromaCloudApiKey: !!process.env.CHROMACLOUD_API_KEY,
      ChromaCloudTenant: process.env.CHROMACLOUD_TENANT,
      ChromaCloudDatabase: process.env.CHROMACLOUD_DATABASE,

      // Weaviate DB Keys
      WeaviateEndpoint: process.env.WEAVIATE_ENDPOINT,
      WeaviateApiKey: !!process.env.WEAVIATE_API_KEY,

      // QDrant DB Keys
      QdrantEndpoint: process.env.QDRANT_ENDPOINT,
      QdrantApiKey: !!process.env.QDRANT_API_KEY,

      // Milvus DB Keys
      MilvusAddress: process.env.MILVUS_ADDRESS,
      MilvusUsername: process.env.MILVUS_USERNAME,
      MilvusPassword: !!process.env.MILVUS_PASSWORD,

      // Zilliz DB Keys
      ZillizEndpoint: process.env.ZILLIZ_ENDPOINT,
      ZillizApiToken: !!process.env.ZILLIZ_API_TOKEN,

      // AstraDB Keys
      AstraDBApplicationToken: !!process?.env?.ASTRA_DB_APPLICATION_TOKEN,
      AstraDBEndpoint: process?.env?.ASTRA_DB_ENDPOINT,

      // PGVector Keys
      PGVectorConnectionString: !!PGVector.connectionString() || false,
      PGVectorTableName: PGVector.tableName(),
    };
  },

  llmPreferenceKeys: function () {
    return {
      // OpenAI Keys
      OpenAiKey: !!process.env.OPEN_AI_KEY,
      OpenAiModelPref: process.env.OPEN_MODEL_PREF || "gpt-4o",

      // Azure + OpenAI Keys
      AzureOpenAiEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
      AzureOpenAiKey: !!process.env.AZURE_OPENAI_KEY,
      AzureOpenAiModelPref:
        process.env.AZURE_OPENAI_MODEL_PREF || process.env.OPEN_MODEL_PREF,
      AzureOpenAiEmbeddingModelPref: process.env.EMBEDDING_MODEL_PREF,
      AzureOpenAiTokenLimit: process.env.AZURE_OPENAI_TOKEN_LIMIT || 4096,
      AzureOpenAiModelType: process.env.AZURE_OPENAI_MODEL_TYPE || "default",

      // Anthropic Keys
      AnthropicApiKey: !!process.env.ANTHROPIC_API_KEY,
      AnthropicModelPref:
        process.env.ANTHROPIC_MODEL_PREF || "claude-sonnet-4-6",
      AnthropicCacheControl: process.env.ANTHROPIC_CACHE_CONTROL || "none",

      // Gemini Keys
      GeminiLLMApiKey: !!process.env.GEMINI_API_KEY,
      GeminiLLMModelPref:
        process.env.GEMINI_LLM_MODEL_PREF || "gemini-2.0-flash-lite",
      GeminiSafetySetting:
        process.env.GEMINI_SAFETY_SETTING || "BLOCK_MEDIUM_AND_ABOVE",

      // LMStudio Keys
      LMStudioBasePath: process.env.LMSTUDIO_BASE_PATH,
      LMStudioTokenLimit: process.env.LMSTUDIO_MODEL_TOKEN_LIMIT || null,
      LMStudioModelPref: process.env.LMSTUDIO_MODEL_PREF,
      LMStudioAuthToken: !!process.env.LMSTUDIO_AUTH_TOKEN,

      // LocalAI Keys
      LocalAiApiKey: !!process.env.LOCAL_AI_API_KEY,
      LocalAiBasePath: process.env.LOCAL_AI_BASE_PATH,
      LocalAiModelPref: process.env.LOCAL_AI_MODEL_PREF,
      LocalAiTokenLimit: process.env.LOCAL_AI_MODEL_TOKEN_LIMIT,

      // Ollama LLM Keys
      OllamaLLMAuthToken: !!process.env.OLLAMA_AUTH_TOKEN,
      OllamaLLMBasePath: process.env.OLLAMA_BASE_PATH,
      OllamaLLMModelPref: process.env.OLLAMA_MODEL_PREF,
      OllamaLLMTokenLimit: process.env.OLLAMA_MODEL_TOKEN_LIMIT || null,
      OllamaLLMKeepAliveSeconds: process.env.OLLAMA_KEEP_ALIVE_TIMEOUT ?? 300,

      // Fireworks AI API Keys
      FireworksAiLLMApiKey: !!process.env.FIREWORKS_AI_LLM_API_KEY,
      FireworksAiLLMModelPref: process.env.FIREWORKS_AI_LLM_MODEL_PREF,

      // Mistral AI (API) Keys
      MistralApiKey: !!process.env.MISTRAL_API_KEY,
      MistralModelPref: process.env.MISTRAL_MODEL_PREF,

      // Groq AI API Keys
      GroqApiKey: !!process.env.GROQ_API_KEY,
      GroqModelPref: process.env.GROQ_MODEL_PREF,

      // HuggingFace Dedicated Inference
      HuggingFaceLLMEndpoint: process.env.HUGGING_FACE_LLM_ENDPOINT,
      HuggingFaceLLMAccessToken: !!process.env.HUGGING_FACE_LLM_API_KEY,
      HuggingFaceLLMTokenLimit: process.env.HUGGING_FACE_LLM_TOKEN_LIMIT,

      // LiteLLM Keys
      LiteLLMModelPref: process.env.LITE_LLM_MODEL_PREF,
      LiteLLMTokenLimit: process.env.LITE_LLM_MODEL_TOKEN_LIMIT,
      LiteLLMBasePath: process.env.LITE_LLM_BASE_PATH,
      LiteLLMApiKey: !!process.env.LITE_LLM_API_KEY,

      // Generic OpenAI Keys
      GenericOpenAiBasePath: process.env.GENERIC_OPEN_AI_BASE_PATH,
      GenericOpenAiModelPref: process.env.GENERIC_OPEN_AI_MODEL_PREF,
      GenericOpenAiTokenLimit: process.env.GENERIC_OPEN_AI_MODEL_TOKEN_LIMIT,
      GenericOpenAiKey: !!process.env.GENERIC_OPEN_AI_API_KEY,
      GenericOpenAiMaxTokens: process.env.GENERIC_OPEN_AI_MAX_TOKENS,

      // xAI LLM API Keys
      XAIApiKey: !!process.env.XAI_LLM_API_KEY,
      XAIModelPref: process.env.XAI_LLM_MODEL_PREF,

      // NVIDIA NIM Keys
      NvidiaNimLLMBasePath: process.env.NVIDIA_NIM_LLM_BASE_PATH,
      NvidiaNimLLMModelPref: process.env.NVIDIA_NIM_LLM_MODEL_PREF,
      NvidiaNimLLMTokenLimit: process.env.NVIDIA_NIM_LLM_MODEL_TOKEN_LIMIT,

      // OpenCode Zen Keys
      OpencodeZenBasePath: process.env.OPENCODE_ZEN_BASE_PATH,
      OpencodeZenModelPref: process.env.OPENCODE_ZEN_MODEL_PREF,
      OpencodeZenTokenLimit: process.env.OPENCODE_ZEN_MODEL_TOKEN_LIMIT,
      OpencodeZenApiKey: !!process.env.OPENCODE_ZEN_API_KEY,

      // Docker Model Runner Keys
      DockerModelRunnerBasePath: process.env.DOCKER_MODEL_RUNNER_BASE_PATH,
      DockerModelRunnerModelPref:
        process.env.DOCKER_MODEL_RUNNER_LLM_MODEL_PREF,
      DockerModelRunnerModelTokenLimit:
        process.env.DOCKER_MODEL_RUNNER_LLM_MODEL_TOKEN_LIMIT || 8192,
    };
  },

  agent_sql_connections: async function () {
    const setting = await SystemSettings.get({
      label: "agent_sql_connections",
    });
    if (!setting) return [];

    const parsedList = safeJsonParse(setting.value, []);
    if (!Array.isArray(parsedList)) return [];

    const connections = parsedList
      .map((conn) => {
        if (!conn || typeof conn !== "object" || !conn.engine) return null;
        try {
          let scheme = conn.engine;
          if (scheme === "sql-server") scheme = "mssql";
          if (scheme === "postgresql") scheme = "postgres";
          const parser = new ConnectionStringParser({ scheme });

          const parsedConn = parser.parse(conn.connectionString);
          return {
            ...conn,
            username: parsedConn.username,
            password: parsedConn.password,
            host: parsedConn.hosts?.[0]?.host,
            port: parsedConn.hosts?.[0]?.port,
            database: parsedConn.endpoint,
            scheme: parsedConn.scheme,
          };
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(
            `Failed to parse SQL connection "${conn.database_id ?? conn.engine}":`,
            e.message,
          );
          return null;
        }
      })
      .filter((c) => c !== null);

    return connections;
  },
  getFeatureFlags: async function () {
    return {
      experimental_live_file_sync:
        (await SystemSettings.get({ label: "experimental_live_file_sync" }))
          ?.value === "enabled",
    };
  },

  /**
   * Get user configured Community Hub Settings
   * Connection key is used to authenticate with the Community Hub API
   * for your account.
   * @returns {Promise<{connectionKey: string}>}
   */
  hubSettings: async function () {
    try {
      const hubKey = await this.get({ label: "hub_api_key" });
      return { connectionKey: hubKey?.value || null };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return { connectionKey: null };
    }
  },

  simpleSSO: {
    /**
     * Gets the no login redirect URL. If the conditions below are not met, this will return null.
     * - If simple SSO is not enabled.
     * - If simple SSO login page is not disabled.
     * - If the no login redirect is not a valid URL or is not set.
     * @returns {string | null}
     */
    noLoginRedirect: () => {
      if (!("SIMPLE_SSO_ENABLED" in process.env)) return null; // if simple SSO is not enabled, return null
      if (!("SIMPLE_SSO_NO_LOGIN" in process.env)) return null; // if the no login config is not set, return null
      if (!("SIMPLE_SSO_NO_LOGIN_REDIRECT" in process.env)) return null; // if the no login redirect is not set, return null

      try {
        let url = new URL(process.env.SIMPLE_SSO_NO_LOGIN_REDIRECT);
        return url.toString();
      } catch {}

      // if the no login redirect is not a valid URL or is not set, return null
      return null;
    },
  },
};

/**
 * Merges SQL connection updates from the frontend with existing backend connections.
 * Processes three types of actions: "remove", "update", and "add".
 *
 * @param {Array<Object>} existingConnections - Current connections stored in the database
 * @param {Array<Object>} updates - Connection updates from frontend, each with an action property
 * @returns {Array<Object>} - The merged connections array
 */
function mergeConnections(existingConnections = [], updates = []) {
  const connectionsMap = new Map(
    existingConnections.map((conn) => [conn.database_id, conn]),
  );

  for (const update of updates) {
    const {
      action,
      database_id,
      originalDatabaseId,
      connectionString,
      engine,
      schema,
    } = update;

    switch (action) {
      case "remove": {
        connectionsMap.delete(database_id);
        break;
      }
      case "update": {
        if (!connectionString) continue;
        const newId = slugify(database_id);

        // Verify original connection exists
        if (!connectionsMap.has(originalDatabaseId)) {
          // eslint-disable-next-line no-console
          console.warn(
            `[mergeConnections] Update skipped: Original connection "${originalDatabaseId}" not found`,
          );
          break;
        }

        // Check for name conflict (excluding the one being updated)
        if (newId !== originalDatabaseId && connectionsMap.has(newId)) {
          // eslint-disable-next-line no-console
          console.warn(
            `[mergeConnections] Update skipped: New name "${newId}" conflicts with existing connection`,
          );
          break;
        }

        // Remove old and add updated connection
        connectionsMap.delete(originalDatabaseId);
        connectionsMap.set(newId, {
          engine,
          database_id: newId,
          connectionString,
          ...(schema && { schema }),
        });
        break;
      }

      case "add": {
        if (!connectionString) continue;
        const slugifiedId = slugify(database_id);

        // Skip if already exists
        if (connectionsMap.has(slugifiedId)) {
          // eslint-disable-next-line no-console
          console.warn(
            `[mergeConnections] Add skipped: Connection "${slugifiedId}" already exists`,
          );
          break;
        }

        connectionsMap.set(slugifiedId, {
          engine,
          database_id: slugifiedId,
          connectionString,
          ...(schema && { schema }),
        });
        break;
      }

      default: {
        throw new Error("SQL connection update contains an invalid action.");
      }
    }
  }

  return Array.from(connectionsMap.values());
}

module.exports.SystemSettings = SystemSettings;
