// SPDX-License-Identifier: MIT
/**
 * MediaAdapters — erweitert die Kreuz-Verifikation um visuelle Quellen.
 *
 *  - Bild-URL (content-type image/*): direkt an den Vision-Agenten.
 *  - Video-URL (mp4/webm/etc. oder content-type video/*):
 *    SOTA-Vorgehen "Keyframe-Sampling": ffmpeg extrahiert Szenenwechsel-Frames
 *    (scene-detection) bzw. gleichverteilte Frames als Fallback, jeder
 *    Keyframe wird vom Vision-Agenten beschrieben; Ergebnis ist ein
 *    zeitgestempeltes visuelles Transkript. Bei YouTube ergänzt das die
 *    bestehende Untertitel-Extraktion (Schritt 29) um die Bildebene.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { describeImage } = require("../visionAgent");

const MAX_KEYFRAMES = Number(process.env.PDF_ANALYSIS_VIDEO_MAX_FRAMES || 8);
const MAX_VIDEO_BYTES = Number(
  process.env.PDF_ANALYSIS_VIDEO_MAX_BYTES || 200 * 1024 * 1024,
);
const _rawSceneThreshold =
  process.env.PDF_ANALYSIS_VIDEO_SCENE_THRESHOLD || "0.3";
const SCENE_THRESHOLD =
  !isNaN(parseFloat(_rawSceneThreshold)) &&
  parseFloat(_rawSceneThreshold) >= 0 &&
  parseFloat(_rawSceneThreshold) <= 1
    ? String(parseFloat(_rawSceneThreshold))
    : "0.3";

function ffmpegPath() {
  try {
    return require("ffmpeg-static");
  } catch {
    return null;
  }
}

function run(bin, args, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { timeout: timeoutMs }, (err, stdout, stderr) =>
      err ? reject(new Error(stderr || err.message)) : resolve(stdout),
    );
  });
}

const VIDEO_FETCH_TIMEOUT_MS = Number(
  process.env.PDF_ANALYSIS_VIDEO_FETCH_TIMEOUT_MS || 60000,
);

/** Lädt ein Video größenbegrenzt in eine Temp-Datei (nach SSRF-Check des Aufrufers). */
async function downloadVideo(url) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "xcheck-video-"));
  const tmpFile = path.join(
    tmpDir,
    `video${path.extname(new URL(url).pathname) || ".mp4"}`,
  );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VIDEO_FETCH_TIMEOUT_MS);
  const res = await fetch(url, {
    headers: { "User-Agent": "OpenSIN-CrossCheck/1.0" },
    signal: controller.signal,
  });
  if (!res.ok) {
    clearTimeout(timer);
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
    throw new Error(`HTTP ${res.status} für ${url}`);
  }
  const reader = res.body.getReader();
  const stream = fs.createWriteStream(tmpFile);
  let streamError = null;
  stream.on("error", (err) => {
    streamError = err;
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      /* ignore cleanup errors */
    }
  });
  let received = 0;
  let streamEnded = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_VIDEO_BYTES) {
        await reader.cancel();
        break;
      }
      stream.write(Buffer.from(value));
      if (streamError) throw streamError;
    }
    await new Promise((r, reject) => {
      stream.end((err) => {
        if (streamError || err) reject(streamError || err);
        else r();
      });
    });
    streamEnded = true;
  } catch (err) {
    // Clean up the temp directory on any download failure to prevent leaks
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
    throw err;
  } finally {
    clearTimeout(timer);
    reader.cancel().catch(() => {});
    if (!streamEnded) stream.destroy();
  }
  return { file: tmpFile, dir: tmpDir };
}

/**
 * Extrahiert Keyframes per Szenenwechsel-Erkennung; Fallback: gleichverteilt.
 * @returns {Promise<Array<{file: string, timestamp: string}>>}
 */
async function extractKeyframes(videoFile) {
  const bin = ffmpegPath();
  if (!bin)
    throw new Error(
      "ffmpeg-static nicht installiert — Video-Analyse nicht verfügbar.",
    );
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "xcheck-frames-"));
  const pattern = path.join(outDir, "frame-%03d.png");

  try {
    await run(bin, [
      "-i",
      videoFile,
      "-vf",
      `select='gt(scene,${SCENE_THRESHOLD})',scale=960:-1`,
      "-vsync",
      "vfr",
      "-frames:v",
      String(MAX_KEYFRAMES),
      pattern,
    ]);
  } catch {
    /* Szenen-Erkennung fehlgeschlagen — Fallback unten */
  }

  let files = fs
    .readdirSync(outDir)
    .filter((f) => f.endsWith(".png"))
    .sort();
  if (files.length === 0) {
    // Fallback: 1 Frame alle 30 Sekunden
    await run(bin, [
      "-i",
      videoFile,
      "-vf",
      "fps=1/30,scale=960:-1",
      "-frames:v",
      String(MAX_KEYFRAMES),
      pattern,
    ]);
    files = fs
      .readdirSync(outDir)
      .filter((f) => f.endsWith(".png"))
      .sort();
  }
  return {
    keyframes: files.map((f, i) => ({
      file: path.join(outDir, f),
      timestamp: `Keyframe ${i + 1}/${files.length}`,
    })),
    outDir,
  };
}

/** Bild-URL → Vision-Beschreibung. */
async function analyzeImageUrl(url, fetchBuffer) {
  const buffer = await fetchBuffer(url);
  const mime = /\.(jpe?g)([?#]|$)/i.test(url) ? "image/jpeg" : "image/png";
  const description = await describeImage(buffer, `Bild von URL: ${url}`, mime);
  if (!description)
    throw new Error(
      "Vision-Analyse nicht verfügbar (Provider nicht multimodal?).",
    );
  return { label: `Bild: ${url}`, text: description };
}

/** Video-URL → zeitgestempeltes visuelles Transkript via Keyframes. */
async function analyzeVideoUrl(url) {
  const { file: videoFile, dir: videoDir } = await downloadVideo(url);
  let outDir = null;
  try {
    const result = await extractKeyframes(videoFile);
    outDir = result.outDir;
    const keyframes = result.keyframes;
    if (!keyframes.length) throw new Error("Keine Keyframes extrahierbar.");
    const parts = [];
    for (const kf of keyframes) {
      try {
        const description = await describeImage(
          fs.readFileSync(kf.file),
          `${kf.timestamp} des Videos ${url}`,
        );
        if (description) parts.push(`[${kf.timestamp}]\n${description}`);
      } catch {
        /* einzelner Keyframe fehlgeschlagen — weitermachen */
      } finally {
        try {
          fs.unlinkSync(kf.file);
        } catch {
          /* already gone */
        }
      }
    }
    if (!parts.length)
      throw new Error("Vision-Analyse der Keyframes nicht verfügbar.");
    return {
      label: `Video (visuell): ${url}`,
      text: `Visuelles Transkript (${parts.length} Keyframes, Szenenwechsel-Sampling):\n\n${parts.join("\n\n")}`,
    };
  } finally {
    if (outDir) {
      try {
        fs.rmSync(outDir, { recursive: true, force: true });
      } catch {
        /* temp dir cleanup best-effort */
      }
    }
    if (videoDir) {
      try {
        fs.rmSync(videoDir, { recursive: true, force: true });
      } catch {
        /* temp dir cleanup best-effort */
      }
    }
  }
}

module.exports = { analyzeImageUrl, analyzeVideoUrl };
