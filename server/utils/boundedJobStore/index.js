// SPDX-License-Identifier: MIT
/**
 * Bounded job store — capacity/TTL-bounded Map replacement for memory-DoS hardening.
 *
 * Docs: index.doc.md
 * Purpose: Prevents unbounded Map growth in ResearchPipeline and AgentOrchestrator
 * by enforcing max total jobs, max active (in-flight) jobs, and TTL-based eviction.
 * Throws JobCapacityError when at capacity so callers can return HTTP 429.
 */

const env = typeof process !== "undefined" ? process.env : {};

class JobCapacityError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "JobCapacityError";
    this.code = "JOB_CAPACITY";
  }
}

class BoundedJobStore {
  constructor({
    maxJobs = parseInt(env.RESEARCH_MAX_JOBS, 10) || 100,
    maxActive = parseInt(env.RESEARCH_MAX_ACTIVE, 10) || 10,
    ttlMs = (parseInt(env.RESEARCH_TTL_MINUTES, 10) || 30) * 60_000,
  } = {}) {
    this._store = new Map();
    this._maxJobs = maxJobs;
    this._maxActive = maxActive;
    this._ttlMs = ttlMs;
  }

  set(key, value) {
    this._evictExpired();
    if (this._store.size >= this._maxJobs) {
      throw new JobCapacityError(
        `Job store at capacity (${this._maxJobs}/${this._maxJobs}). Try again later.`
      );
    }
    if (value && (value.status === "pending" || value.status === "running")) {
      const activeCount = this._activeCount();
      if (activeCount >= this._maxActive) {
        throw new JobCapacityError(
          `Too many active jobs (${activeCount} >= ${this._maxActive}). Wait for some to finish.`
        );
      }
    }
    value._createdAt = Date.now();
    this._store.set(key, value);
  }

  get(key) {
    return this._store.get(key) || null;
  }

  has(key) {
    return this._store.has(key);
  }

  delete(key) {
    return this._store.delete(key);
  }

  get size() {
    return this._store.size;
  }

  values() {
    return this._store.values();
  }

  keys() {
    return this._store.keys();
  }

  clear() {
    this._store.clear();
  }

  activeCount() {
    return this._activeCount();
  }

  _activeCount() {
    let count = 0;
    for (const v of this._store.values()) {
      if (v && (v.status === "pending" || v.status === "running")) count++;
    }
    return count;
  }

  _evictExpired() {
    const now = Date.now();
    for (const [key, val] of this._store) {
      if (val && val._createdAt && now - val._createdAt > this._ttlMs) {
        this._store.delete(key);
      }
    }
  }
}

module.exports = { BoundedJobStore, JobCapacityError };
