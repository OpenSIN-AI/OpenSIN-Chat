// SPDX-License-Identifier: MIT
// Purpose: Per-connector polling implementations for TriggerEngine.
//          Each poller returns { hasChanges, newCheckpoint, itemCount, checksum }
//          so the engine can fire the agent only when new items are detected.
//          Supported connectors: gmail, github, rss, webhook.
// Docs: triggerPollers.doc.md

const consoleLogger = require("../logger/console.js");

const POLL_HTTP_TIMEOUT_MS = 30_000;

/**
 * Dispatch to the right poller based on connector_type.
 * Returns a no-change result for unknown connector types so the engine
 * keeps ticking without firing spurious triggers.
 *
 * @param {Object} config - Trigger config (must include connector_type and connector-specific fields)
 * @param {Object|null} checkpoint - Previous checkpoint from last successful poll
 * @returns {Promise<{hasChanges: boolean, newCheckpoint: object|null, itemCount: number, checksum: string|null, error?: string}>}
 */
async function pollConnector(config, checkpoint) {
  const type = (config.connector_type || "").toLowerCase();

  switch (type) {
    case "gmail":
      return pollGmail(config, checkpoint);
    case "github":
      return pollGitHub(config, checkpoint);
    case "rss":
    case "atom":
      return pollRss(config, checkpoint);
    case "webhook":
      // Webhooks are push-based — no polling needed.
      return {
        hasChanges: false,
        newCheckpoint: checkpoint,
        itemCount: 0,
        checksum: null,
      };
    default:
      consoleLogger.warn(
        `[TriggerPollers] Unknown connector_type "${type}" — returning no changes`,
      );
      return {
        hasChanges: false,
        newCheckpoint: checkpoint,
        itemCount: 0,
        checksum: null,
      };
  }
}

/**
 * Gmail poller: uses the existing GmailBridge to search recent messages
 * and compares message IDs against the checkpoint.
 *
 * Config: { connector_type: "gmail", query?: string, label?: string, max_results?: number }
 * Checkpoint: { lastMessageId: string, lastCheckedAt: ISO string }
 */
async function pollGmail(config, checkpoint) {
  try {
    const { GmailBridge } = require("./aibitat/plugins/gmail/lib.js");
    const available = await GmailBridge.isToolAvailable();
    if (!available) {
      return {
        hasChanges: false,
        newCheckpoint: checkpoint,
        itemCount: 0,
        checksum: null,
        error: "Gmail not configured",
      };
    }

    const bridge = GmailBridge;
    const query = config.query || config.label || "in:inbox";
    const maxResults = Math.min(config.max_results || 25, 100);

    const result = await bridge.request("search", {
      query,
      limit: maxResults,
      start: 0,
    });

    if (!result.success) {
      return {
        hasChanges: false,
        newCheckpoint: checkpoint,
        itemCount: 0,
        checksum: null,
        error: result.error || "Gmail search failed",
      };
    }

    const messages = Array.isArray(result.data?.messages)
      ? result.data.messages
      : Array.isArray(result.data)
        ? result.data
        : [];

    const lastMessageId = checkpoint?.lastMessageId || null;
    const newMessages = lastMessageId
      ? messages.filter((m) => m.id && m.id !== lastMessageId)
      : messages;

    const newest = messages[0];
    const newCheckpoint = newest?.id
      ? {
          lastMessageId: newest.id,
          lastCheckedAt: new Date().toISOString(),
          query,
        }
      : checkpoint;

    const checksum = newest?.id
      ? `gmail:${newest.id}:${messages.length}`
      : null;

    return {
      hasChanges: newMessages.length > 0,
      newCheckpoint,
      itemCount: newMessages.length,
      checksum,
    };
  } catch (e) {
    consoleLogger.error("[TriggerPollers] Gmail poll error:", e.message);
    return {
      hasChanges: false,
      newCheckpoint: checkpoint,
      itemCount: 0,
      checksum: null,
      error: e.message,
    };
  }
}

/**
 * GitHub poller: fetches issues or PRs since the last checkpoint timestamp.
 *
 * Config: { connector_type: "github", repo: "owner/name", kind?: "issues"|"pulls", token?: string, state?: "open"|"closed"|"all" }
 * Checkpoint: { lastCheckedAt: ISO string, lastNumber: number }
 */
async function pollGitHub(config, checkpoint) {
  try {
    if (!config.repo || !config.repo.includes("/")) {
      return {
        hasChanges: false,
        newCheckpoint: checkpoint,
        itemCount: 0,
        checksum: null,
        error: "GitHub config requires 'repo' in 'owner/name' format",
      };
    }

    const kind = config.kind === "pulls" ? "pulls" : "issues";
    const state = config.state || "open";
    const since =
      checkpoint?.lastCheckedAt ||
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const url = `https://api.github.com/repos/${encodeURIComponent(
      config.repo,
    )}/${kind}?state=${encodeURIComponent(state)}&since=${encodeURIComponent(
      since,
    )}&per_page=50&sort=updated&direction=desc`;

    const headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "OpenSIN-Chat-TriggerEngine/1.0",
    };
    if (config.token) headers.Authorization = `Bearer ${config.token}`;

    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(POLL_HTTP_TIMEOUT_MS),
    });

    if (!response.ok) {
      return {
        hasChanges: false,
        newCheckpoint: checkpoint,
        itemCount: 0,
        checksum: null,
        error: `GitHub API ${response.status}: ${response.statusText}`,
      };
    }

    const items = await response.json();
    if (!Array.isArray(items)) {
      return {
        hasChanges: false,
        newCheckpoint: checkpoint,
        itemCount: 0,
        checksum: null,
        error: "GitHub API returned non-array response",
      };
    }

    const lastNumber = checkpoint?.lastNumber || 0;
    const newItems = items.filter((it) => (it.number || 0) > lastNumber);
    const newest = items[0];
    const newCheckpoint = newest
      ? {
          lastCheckedAt: newest.updated_at || new Date().toISOString(),
          lastNumber: newest.number || 0,
        }
      : checkpoint;

    const checksum = newest
      ? `github:${config.repo}:${kind}:${newest.number}:${items.length}`
      : null;

    return {
      hasChanges: newItems.length > 0,
      newCheckpoint,
      itemCount: newItems.length,
      checksum,
    };
  } catch (e) {
    consoleLogger.error("[TriggerPollers] GitHub poll error:", e.message);
    return {
      hasChanges: false,
      newCheckpoint: checkpoint,
      itemCount: 0,
      checksum: null,
      error: e.message,
    };
  }
}

/**
 * RSS/Atom poller: fetches a feed and compares item GUIDs/links against checkpoint.
 *
 * Config: { connector_type: "rss"|"atom", url: string, max_items?: number }
 * Checkpoint: { lastGuid: string, lastLink: string, lastCheckedAt: ISO string }
 */
async function pollRss(config, checkpoint) {
  try {
    if (!config.url) {
      return {
        hasChanges: false,
        newCheckpoint: checkpoint,
        itemCount: 0,
        checksum: null,
        error: "RSS config requires 'url'",
      };
    }

    const response = await fetch(config.url, {
      method: "GET",
      headers: {
        Accept: "application/rss+xml, application/atom+xml, text/xml, */*",
        "User-Agent": "OpenSIN-Chat-TriggerEngine/1.0",
      },
      signal: AbortSignal.timeout(POLL_HTTP_TIMEOUT_MS),
    });

    if (!response.ok) {
      return {
        hasChanges: false,
        newCheckpoint: checkpoint,
        itemCount: 0,
        checksum: null,
        error: `RSS fetch ${response.status}: ${response.statusText}`,
      };
    }

    const xml = await response.text();
    const items = parseFeedItems(xml, config.connector_type || "rss");
    const maxItems = Math.min(config.max_items || 25, 100);
    const recent = items.slice(0, maxItems);

    const lastGuid = checkpoint?.lastGuid || null;
    const lastLink = checkpoint?.lastLink || null;
    const newItems = recent.filter((it) => {
      if (lastGuid && it.guid === lastGuid) return false;
      if (lastLink && it.link === lastLink) return false;
      return true;
    });

    const newest = recent[0];
    const newCheckpoint = newest
      ? {
          lastGuid: newest.guid || null,
          lastLink: newest.link || null,
          lastCheckedAt: new Date().toISOString(),
        }
      : checkpoint;

    const checksum = newest
      ? `rss:${newest.guid || newest.link || Date.now()}`
      : null;

    return {
      hasChanges: newItems.length > 0,
      newCheckpoint,
      itemCount: newItems.length,
      checksum,
    };
  } catch (e) {
    consoleLogger.error("[TriggerPollers] RSS poll error:", e.message);
    return {
      hasChanges: false,
      newCheckpoint: checkpoint,
      itemCount: 0,
      checksum: null,
      error: e.message,
    };
  }
}

/**
 * Lightweight RSS/Atom parser — extracts guid, link, title from <item> or <entry> tags.
 * Avoids pulling in a full XML dependency for what is a small subset.
 */
function parseFeedItems(xml, type) {
  const items = [];
  const tagPattern = type === "atom" ? /<entry[\s>]/gi : /<item[\s>]/gi;

  let match;
  while ((match = tagPattern.exec(xml)) !== null) {
    const start = match.index;
    const closeTag = type === "atom" ? "</entry>" : "</item>";
    const endIdx = xml.indexOf(closeTag, start);
    if (endIdx === -1) break;
    const block = xml.substring(start, endIdx + closeTag.length);

    const guid = extractTag(block, "guid") || extractTag(block, "id");
    const link = extractTag(block, "link");
    const title = extractTag(block, "title");

    if (guid || link) {
      items.push({
        guid: guid || null,
        link: link || null,
        title: title || null,
      });
    }
    tagPattern.lastIndex = endIdx + closeTag.length;
  }
  return items;
}

function extractTag(block, tag) {
  // Match <tag>value</tag> or <tag attr="...">value</tag>
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  if (!m) return null;
  // Strip nested CDATA and HTML
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

module.exports = {
  pollConnector,
  pollGmail,
  pollGitHub,
  pollRss,
  parseFeedItems,
};
