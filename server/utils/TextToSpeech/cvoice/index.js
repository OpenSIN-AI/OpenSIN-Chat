// SPDX-License-Identifier: MIT
const consoleLogger = require("../../logger/console.js");

/**
 * Curated German voice IDs from cvoice.ai (https://cvoice.ai/dataset_voices.json).
 * These are the curated voices that ship with the dataset and have stable IDs.
 * Users can still enter any other voice_id manually via the "Custom voice id"
 * field in the settings UI.
 */
const GERMAN_VOICES = [
  {
    id: "625332f3-27a9-4ecf-9a90-25265d901e72",
    name: "Gronkh",
  },
  {
    id: "158f678a-f9b5-4451-b553-db840da665be",
    name: "Dieter Bohlen",
  },
  {
    id: "57898756-03e1-4f65-8ccc-41a48a18f35d",
    name: "Joko Winterscheidt",
  },
  {
    id: "35cfc98d-c746-4d0e-9cc2-d3cd1852f56b",
    name: "Julien Bam",
  },
  {
    id: "539d4adb-81ac-4b8d-bf01-365ff69dc5b7",
    name: "Daniela Katzenberger",
  },
  {
    id: "bushido-official",
    name: "Bushido",
  },
];

/**
 * cvoice.ai TTS provider.
 *
 * - Endpoint: POST https://cvoice.ai/api/tts
 * - Auth: X-API-Key header
 * - Body: { voice_id?, text (50-500 chars), person_slug?, person_name? }
 * - Response: { url: "https://static.cvoice.ai/tts/<voice_id>/<hash>.mp3" }
 *
 * The provider downloads the audio from the returned URL and returns a Buffer
 * so it drops into the existing /workspace/:slug/tts/:chatId endpoint that
 * streams audio back to the client.
 *
 * Rate limits (free tier): 10 requests/minute, 1,000 requests/day. We mitigate
 * this with an in-memory cache keyed by (voice_id + text hash) — identical
 * inputs always return the same URL from cvoice.ai, so we can serve cached
 * audio without burning quota.
 */
class CvoiceTTS {
  // In-memory cache: hash(text+voice) -> { buffer, mime }
  // Bounded to avoid unbounded memory growth on long-running servers.
  #cache = new Map();
  #cacheLimit = 256;

  constructor() {
    if (!process.env.TTS_CVOICE_API_KEY)
      throw new Error(
        "No cvoice.ai API key was set. Please set TTS_CVOICE_API_KEY (server-side only, never expose to the client).",
      );

    this.apiKey = process.env.TTS_CVOICE_API_KEY;
    this.endpoint =
      process.env.TTS_CVOICE_ENDPOINT || "https://cvoice.ai/api/tts";
    this.voice = process.env.TTS_CVOICE_VOICE_MODEL || GERMAN_VOICES[0].id;
    this.personName = process.env.TTS_CVOICE_PERSON_NAME || null;
    this.personSlug = process.env.TTS_CVOICE_PERSON_SLUG || null;

    // In-memory cache: hash(text+voice) -> { buffer, mime }
    // Bounded to avoid unbounded memory growth on long-running servers.
    this.#cache = new Map();
    this.#cacheLimit = 256;

    // In-memory cache: hash(text+voice) -> { buffer, mime }
    // Bounded to avoid unbounded memory growth on long-running servers.
    this.#cache = new Map();
    this.#cacheLimit = 256;

    this.#log(
      `Service (${this.endpoint}) with voice: ${this.voice}${
        this.personName ? ` (person: ${this.personName})` : ""
      }`,
    );
  }

  #log(text, ...args) {
    consoleLogger.log(`\x1b[32m[CvoiceTTS]\x1b[0m ${text}`, ...args);
  }

  #err(text, ...args) {
    consoleLogger.error(`\x1b[31m[CvoiceTTS]\x1b[0m ${text}`, ...args);
  }

  /**
   * Cheap, stable hash for cache keys. Not cryptographic — just needs to be
   * deterministic and short enough to use as a Map key.
   */
  #hashKey(voice, text) {
    const crypto = require("crypto");
    return crypto
      .createHash("sha256")
      .update(`${voice}::${text}`)
      .digest("hex")
      .slice(0, 32);
  }

  #cacheGet(key) {
    return this.#cache.get(key);
  }

  #cacheSet(key, value) {
    if (this.#cache.size >= this.#cacheLimit) {
      // Drop the oldest entry (Map preserves insertion order).
      const firstKey = this.#cache.keys().next().value;
      if (firstKey !== undefined) this.#cache.delete(firstKey);
    }
    this.#cache.set(key, value);
  }

  /**
   * Split text into chunks that fit cvoice.ai's 50-500 char per-request limit.
   * Prefers sentence boundaries, falls back to whitespace, then hard cuts.
   * If the last chunk would be < 50 chars (cvoice.ai's minimum), it gets
   * merged into the previous chunk to avoid losing content.
   */
  #chunkText(text, maxLen = 450) {
    const cleaned = String(text || "").trim();
    if (cleaned.length <= maxLen) return [cleaned];

    const chunks = [];
    let remaining = cleaned;

    while (remaining.length > maxLen) {
      // Try to break at a sentence boundary within the window.
      const window = remaining.slice(0, maxLen);
      let breakAt = -1;
      const sentenceEnd = window.search(/[.!?]\s+[A-ZÄÖÜ]|[.!?]$/);
      if (sentenceEnd !== -1) breakAt = sentenceEnd + 1;
      if (breakAt < 50) {
        const space = window.lastIndexOf(" ");
        if (space > 50) breakAt = space;
      }
      if (breakAt < 50) breakAt = maxLen;

      chunks.push(remaining.slice(0, breakAt).trim());
      remaining = remaining.slice(breakAt).trim();
    }
    if (remaining.length > 0) {
      if (remaining.length < 50 && chunks.length > 0) {
        // Merge small tail into the last chunk so we don't lose content.
        chunks[chunks.length - 1] = `${chunks[chunks.length - 1]} ${remaining}`;
      } else {
        chunks.push(remaining);
      }
    }
    return chunks;
  }

  /**
   * POST a single chunk to cvoice.ai and return the audio URL.
   * Throws on non-2xx so the caller can decide how to react.
   */
  async #requestChunk(text) {
    const body = {
      text,
      voice_id: this.voice,
    };
    if (this.personName) body.person_name = this.personName;
    if (this.personSlug) body.person_slug = this.personSlug;

    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      const err = new Error(
        `cvoice.ai TTS request failed (${res.status}): ${errBody.slice(0, 200)}`,
      );
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    if (!data?.url) throw new Error("cvoice.ai response missing 'url' field");
    return data.url;
  }

  /**
   * Download the audio file at `url` and return it as a Buffer.
   */
  async #downloadAudio(url) {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok)
      throw new Error(`Failed to download cvoice.ai audio (${res.status})`);
    const arrayBuf = await res.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuf),
      mime: res.headers.get("content-type") || "audio/mpeg",
    };
  }

  /**
   * Generate a TTS buffer for the given text. Returns null on failure so the
   * workspaceMedia endpoint can respond with a 500.
   *
   * @param {string} textInput
   * @returns {Promise<Buffer|null>}
   */
  async ttsBuffer(textInput) {
    if (!textInput || !textInput.trim()) return null;

    const cacheKey = this.#hashKey(this.voice, textInput);
    const cached = this.#cacheGet(cacheKey);
    if (cached) {
      this.#log(`cache hit for voice=${this.voice}`);
      return cached.buffer;
    }

    try {
      const chunks = this.#chunkText(textInput);
      this.#log(
        `generating TTS for ${chunks.length} chunk(s), voice=${this.voice}, total chars=${textInput.length}`,
      );

      // For multi-chunk responses we concatenate the MP3 frames. This works
      // because cvoice.ai returns MP3 (audio/mpeg) which is a streaming format
      // and can be safely concatenated without re-encoding.
      const buffers = [];
      let mime = "audio/mpeg";
      for (const chunk of chunks) {
        const url = await this.#requestChunk(chunk);
        const { buffer, mime: chunkMime } = await this.#downloadAudio(url);
        buffers.push(buffer);
        mime = chunkMime;
      }

      const combined = Buffer.concat(buffers);
      this.#cacheSet(cacheKey, { buffer: combined, mime });
      return combined;
    } catch (e) {
      if (e?.status === 429) {
        this.#err(
          `rate limited by cvoice.ai (429). Free tier: 10/min, 1000/day. Consider caching more aggressively.`,
        );
      } else {
        this.#err(`ttsBuffer failed: ${e?.message || e}`);
      }
      return null;
    }
  }
}

module.exports = {
  CvoiceTTS,
  GERMAN_VOICES,
};
