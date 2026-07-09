// SPDX-License-Identifier: MIT
const consoleLogger = require("../logger/console.js");

const path = require("path");
const Graceful = require("@ladjs/graceful");
const Bree = require("@mintplex-labs/bree");
const later = require("@breejs/later");
const PQueue = require("p-queue").default;
const setLogger = require("../logger");

// Use UTC time for cron interpretation. This ensures consistent behavior
// regardless of server timezone (e.g., when running in containers).
later.date.UTC();

class BackgroundService {
  name = "BackgroundWorkerService";
  static _instance = null;
  documentSyncEnabled = false;
  memoryExtractionEnabled = false;
  #root = path.resolve(__dirname, "../../jobs");
  #scheduledJobTimers = new Map();
  #scheduledJobQueue = new PQueue({
    concurrency: Number(process.env.SCHEDULED_JOB_MAX_CONCURRENT) || 1,
  });
  // Tracks in-flight worker processes per scheduled jobId so we can kill any
  // active runs when the job is deleted. Without this, a running worker
  // outlives the cascade-delete of its scheduled_job_runs row and throws when
  // it tries to write the result back (prisma.update on a missing row).
  #scheduledJobWorkers = new Map();

  #alwaysRunJobs = [
    {
      name: "cleanup-orphan-documents",
      timeout: "1m",
      interval: "12hr",
    },
    {
      name: "cleanup-generated-files",
      timeout: "5m",
      interval: "8hr",
    },
    {
      name: "sync-politician-data",
      timeout: "30m",
      interval: "6hr",
    },
  ];

  #memoryJobs = [
    {
      name: "extract-memories",
      timeout: "15m",
      interval: process.env.MEMORY_EXTRACTION_INTERVAL || "3hr",
    },
  ];

  #documentSyncJobs = [
    // Job for auto-sync of documents
    // https://github.com/breejs/bree
    {
      name: "sync-watched-documents",
      timeout: "10m",
      interval: "1hr",
    },
  ];

  constructor() {
    if (BackgroundService._instance) {
      this.#log("SINGLETON LOCK: Using existing BackgroundService.");
      return BackgroundService._instance;
    }

    this.logger = setLogger();
    BackgroundService._instance = this;
  }

  #log(text, ...args) {
    consoleLogger.log(`\x1b[36m[${this.name}]\x1b[0m ${text}`, ...args);
  }

  /**
   * Returns the root path where job files are located.
   * Handles the difference between development and production (bundled) environments.
   * @returns {string}
   */
  get jobsRoot() {
    return this.#root;
  }

  /**
   * Wraps the logger so that IPC messages carrying `silent: true` are
   * suppressed. Bree unconditionally calls `logger.info(message)` for
   * every IPC message from forked processes, so this is the only
   * interception point.
   */
  #makeBreeLogger() {
    const base = this.logger;
    const isSilent = (args) => args.length === 1 && args[0]?.silent === true;

    const wrapped = Object.create(base);
    wrapped.info = (...args) => {
      if (!isSilent(args)) base.info(...args);
    };
    wrapped.log = (...args) => {
      if (!isSilent(args)) base.log(...args);
    };
    return wrapped;
  }

  async boot() {
    const { DocumentSyncQueue } = require("../../models/documentSyncQueue");
    const { SystemSettings } = require("../../models/systemSettings");
    const { ScheduledJobRun } = require("../../models/scheduledJobRun");

    this.documentSyncEnabled = await DocumentSyncQueue.enabled();
    this.memoryExtractionEnabled = await SystemSettings.autoMemoriesEnabled();

    // Mark any orphaned scheduled job runs as failed (server crashed mid-execution)
    const orphanedCount = await ScheduledJobRun.failOrphanedRuns();
    if (orphanedCount > 0) {
      this.#log(
        `Marked ${orphanedCount} orphaned scheduled job run(s) as failed`,
      );
    }

    // Clean up old run records to prevent unbounded table growth
    const deletedRuns = await ScheduledJobRun.cleanupOldRuns();
    if (deletedRuns > 0) {
      this.#log(`Cleaned up ${deletedRuns} old scheduled job run(s)`);
    }

    const jobsToRun = this.jobs();

    this.#log("Starting...");
    this.bree = new Bree({
      logger: this.#makeBreeLogger(),
      root: this.#root,
      jobs: jobsToRun,
      errorHandler: this.onError.bind(this),
      workerMessageHandler: this.onWorkerMessageHandler.bind(this),
      runJobsAs: "process",
    });
    this.graceful = new Graceful({ brees: [this.bree], logger: this.logger });
    this.graceful.listen();

    this.bree.start();
    this.#log(
      `Service started with ${jobsToRun.length} jobs`,
      jobsToRun.map((j) => j.name),
    );

    await this.#bootScheduledJobs();
  }

  /**
   * Cleanup scheduled jobs (in-process cron timers + p-queue + in-flight workers)
   */
  #cleanupScheduledJobs() {
    for (const [id, timer] of this.#scheduledJobTimers) {
      timer.clear();
      this.#scheduledJobTimers.delete(id);
    }
    this.#scheduledJobQueue.clear();

    // Kill any in-flight worker processes so they don't outlive the service
    // and try to write results back to a DB that may be shutting down.
    for (const [jobId, workers] of this.#scheduledJobWorkers) {
      for (const worker of workers) {
        try {
          worker.kill("SIGTERM");
        } catch {
          this.#log(`worker ${worker.pid} already exited during cleanup`);
        }
      }
      this.#scheduledJobWorkers.delete(jobId);
    }
  }

  async stop() {
    this.#log("Stopping...");
    this.#cleanupScheduledJobs();
    if (!!this.graceful && !!this.bree) this.graceful.stopBree(this.bree, 0);
    this.bree = null;
    this.graceful = null;
    this.#log("Service stopped");
  }

  /** @returns {import("@mintplex-labs/bree").Job[]} */
  jobs() {
    const activeJobs = [...this.#alwaysRunJobs];
    if (this.memoryExtractionEnabled) activeJobs.push(...this.#memoryJobs);
    if (this.documentSyncEnabled) activeJobs.push(...this.#documentSyncJobs);
    return activeJobs;
  }

  /**
   * Sync the memory extraction job based on current settings.
   * Called when memory_enabled or memory_auto_extraction changes.
   * @param {boolean} enabled - The desired state (should the extraction job run?)
   */
  async syncMemoryJob(enabled) {
    if (!this.bree) return;

    const jobName = this.#memoryJobs[0].name;
    const isCurrentlyRunning = this.bree.config.jobs.some(
      (j) => j.name === jobName,
    );

    if (enabled && !isCurrentlyRunning) {
      this.memoryExtractionEnabled = true;
      await this.bree.add(this.#memoryJobs[0]);
      await this.bree.start(jobName);
      this.#log(`Added and started ${jobName} job`);
    } else if (!enabled && isCurrentlyRunning) {
      this.memoryExtractionEnabled = false;
      await this.bree.stop(jobName);
      await this.bree.remove(jobName);
      this.#log(`Stopped and removed ${jobName} job`);
    }
  }

  onError(error, _workerMetadata) {
    this.logger.error(`${error.message}`, {
      service: "bg-worker",
      origin: error.name,
    });
  }

  onWorkerMessageHandler(message, _workerMetadata) {
    if (message?.silent || message?.message?.silent) return;
    this.logger.info(`${message.message}`, {
      service: "bg-worker",
      origin: message.name,
    });
  }

  /**
   * Spawn a one-off Bree worker process for the given script.
   * @param {string} scriptPath - Absolute path to the worker JS file
   * @returns {Promise<{ worker: ChildProcess, jobId: string }>}
   */
  async spawnWorker(scriptPath) {
    if (!this.bree)
      throw new Error("BackgroundService has not been booted yet");

    const jobId = `${path.basename(scriptPath, ".js")}-${Date.now()}`;

    await this.bree.add({
      name: jobId,
      path: scriptPath,
    });

    await this.bree.run(jobId);
    const worker = this.bree.workers.get(jobId);

    if (!worker) throw new Error("Failed to get worker reference from Bree");

    return { worker, jobId };
  }

  /**
   * Remove a one-off Bree job registration so stale entries don't accumulate.
   * @param {string} jobId
   */
  async removeJob(jobId) {
    if (!jobId) return;
    try {
      if (this.bree) await this.bree.remove(jobId);
    } catch {
      this.#log(`removeJob: ${jobId} could not be removed — already gone`);
    }
  }

  // ---------------------------------------------------------------
  // Scheduled Jobs — in-process cron timers + p-queue
  //
  // Bree tightly couples scheduling with worker spawning — when a
  // Bree cron fires, it directly calls run() which immediately
  // spawns a child process with no way to intercept it. We manage
  // our own cron timers (via later.setInterval) to decouple
  // scheduling from execution so we can route jobs through p-queue
  // for global concurrency control before spawning workers.
  //
  // Per-job dedup lives in the database, not in process memory: any
  // non-terminal row (`queued` or `running`) in scheduled_job_runs means
  // the job has a run in flight. ScheduledJobRun.start() does the check +
  // insert atomically and creates the row in `queued` status. The worker
  // transitions it to `running` once it actually begins executing, so
  // `startedAt` reflects execution start rather than queue-claim time.
  // Cron-fired and manually-triggered enqueues use the same rule —
  // at most one in-flight run per job, regardless of source.
  // ---------------------------------------------------------------

  /**
   * Register cron timers for all enabled scheduled jobs on startup.
   */
  async #bootScheduledJobs() {
    const { ScheduledJob } = require("../../models/scheduledJob");
    const enabledJobs = await ScheduledJob.allEnabled();

    for (const job of enabledJobs) {
      await ScheduledJob.recomputeNextRunAt(job.id);
      this.addScheduledJob(job);
    }

    if (enabledJobs.length > 0) {
      this.#log(
        `Registered ${enabledJobs.length} scheduled job(s) (max concurrent: ${this.#scheduledJobQueue.concurrency})`,
        enabledJobs.map((j) => `${j.name} (${j.schedule})`),
      );
    }
  }

  /**
   * Register an in-process cron timer for a scheduled job.
   * When the cron fires, the jobId is enqueued for execution.
   * @param {object} job - scheduled_jobs DB record
   */
  addScheduledJob(job) {
    this.removeScheduledJob(job.id);
    try {
      const sched = later.parse.cron(job.schedule);
      const timer = later.setInterval(() => {
        this.enqueueScheduledJob(job.id);
      }, sched);
      this.#scheduledJobTimers.set(job.id, timer);
    } catch (error) {
      this.#log(
        `Failed to register cron timer for job ${job.id} ("${job.name}"): ${error.message}`,
      );
    }
  }

  /**
   * Remove an in-process cron timer for a scheduled job and kill any in-flight
   * worker processes for it. Killing in-flight workers prevents them from
   * writing results back to a scheduled_job_runs row that the FK cascade (from
   * a subsequent ScheduledJob.delete) is about to remove.
   * @param {number} jobId - scheduled_jobs.id
   */
  removeScheduledJob(jobId) {
    const timer = this.#scheduledJobTimers.get(jobId);
    if (timer) timer.clear();
    this.#scheduledJobTimers.delete(jobId);

    const workers = this.#scheduledJobWorkers.get(jobId);
    if (workers) {
      for (const worker of workers) {
        try {
          worker.kill("SIGTERM");
        } catch {
          this.#log(
            `worker ${worker.pid} already exited during removeScheduledJob`,
          );
        }
      }
      this.#scheduledJobWorkers.delete(jobId);
    }
  }

  /**
   * Re-sync a scheduled job's cron timer after an update.
   * Removes the old timer and re-adds if still enabled.
   * @param {number} jobId - scheduled_jobs.id
   */
  async syncScheduledJob(jobId) {
    const { ScheduledJob } = require("../../models/scheduledJob");
    this.removeScheduledJob(jobId);
    const job = await ScheduledJob.get({ id: Number(jobId) });
    if (job && job.enabled) {
      this.addScheduledJob(job);
    }
  }

  /**
   * Kill a specific run's worker process. This terminates the worker but does
   * not update the database — the caller should use ScheduledJobRun.kill()
   * before or after calling this to mark the run as failed.
   *
   * @param {number} jobId - scheduled_jobs.id (parent job)
   * @param {number} runId - scheduled_job_runs.id (not directly used, but for
   *   future multi-run support; currently we kill all workers for the jobId)
   * @returns {boolean} true if a worker was found and killed, false otherwise
   */
  killRun(jobId, _runId) {
    const workers = this.#scheduledJobWorkers.get(Number(jobId));
    if (!workers || workers.size === 0) return false;

    let killed = false;
    for (const worker of workers) {
      try {
        worker.kill("SIGTERM");
        killed = true;
      } catch {
        this.#log(`worker ${worker.pid} already exited during killRun`);
      }
    }
    return killed;
  }

  /**
   * Enqueue a scheduled job for execution. Called by both the cron timer
   * (in addScheduledJob) and the manual trigger endpoint. ScheduledJobRun.start()
   * atomically rejects the call if the job already has a run in flight.
   *
   * @param {number} jobId - scheduled_jobs.id
   * @returns {Promise<object|null>} the created run row, or null if skipped
   *   because a run is already in flight for this job.
   */
  async enqueueScheduledJob(jobId) {
    const { ScheduledJobRun } = require("../../models/scheduledJobRun");

    const run = await ScheduledJobRun.start(jobId);
    // if start returns null, skip enqueuing, schueduled job already has a run in flight
    if (!run) return null;

    this.#scheduledJobQueue.add(() =>
      this.#runScheduledJobWorker(jobId, run.id).catch(async (err) => {
        this.#log(`Scheduled job ${jobId} failed: ${err.message}`);
        await ScheduledJobRun.failIfNotTerminal(run.id, err.message).catch(
          (dbErr) => {
            this.#log(
              `Scheduled job ${jobId} failed to mark run ${run.id} as failed: ${dbErr.message}`,
            );
          },
        );
      }),
    );
    return run;
  }

  /**
   * Spawn the run-scheduled-job worker for a given run and resolve when it
   * exits so p-queue can advance. The worker reads its payload from an IPC
   * `process.on("message", ...)` handler.
   *
   * @param {number} jobId
   * @param {number} runId
   * @returns {Promise<void>}
   */
  async #runScheduledJobWorker(jobId, runId) {
    const scriptPath = path.resolve(this.jobsRoot, "run-scheduled-job.js");
    const { worker, jobId: workerId } = await this.spawnWorker(scriptPath);

    if (!this.#scheduledJobWorkers.has(jobId)) {
      this.#scheduledJobWorkers.set(jobId, new Set());
    }
    this.#scheduledJobWorkers.get(jobId).add(worker);

    try {
      worker.send({ jobId, runId });
      // The parent timeout must be strictly longer than the worker's own
      // SCHEDULED_JOB_TIMEOUT_MS so the worker can handle its timeout
      // gracefully (mark the run as timed_out, send push notification, etc).
      // If the parent fires first it SIGKILLs the worker, the worker's
      // finally block never runs, and the run is marked as "failed" instead
      // of "timed_out".  Use the same `|| ` pattern as the worker helper so
      // falsy values (0, "") fall back to the default consistently.
      const workerTimeoutMs =
        Number(process.env.SCHEDULED_JOB_TIMEOUT_MS) || 5 * 60 * 1000;
      const MAX_RUN_TIMEOUT_MS = workerTimeoutMs + 30_000; // 30s grace period
      await Promise.race([
        new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            worker.kill("SIGKILL");
            this.bree.remove(workerId).catch((e) => console.warn("[index] non-fatal error:", e?.message || e));
            reject(
              new Error(`scheduled job timeout after ${MAX_RUN_TIMEOUT_MS}ms`),
            );
          }, MAX_RUN_TIMEOUT_MS);
          worker.once("exit", (code) => {
            clearTimeout(timeoutId);
            if (code === 0) return resolve();
            reject(new Error(`exit ${code}`));
          });
        }),
      ]);
    } finally {
      const workers = this.#scheduledJobWorkers.get(jobId);
      if (workers) {
        workers.delete(worker);
        if (workers.size === 0) this.#scheduledJobWorkers.delete(jobId);
      }
      await this.removeJob(workerId).catch((e) => {
        this.#log(`removeJob cleanup failed: ${e.message}`);
      });
    }
  }
}

module.exports.BackgroundService = BackgroundService;
