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
  process.env.PDF_ANALYSIS_VIDEO_MAX_BYTES || 200 * 1024 * 1024
);
const SCENE_THRESHOLD =
  process.env.PDF_ANALYSIS_VIDEO_SCENE_THRESHOLD || "0.3";

function ffmpegPath() {
  try {
    return require("ffmpeg-static");
  } catch {
    return null;
  }
}

function run(bin, args, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    execFile(
      bin,
      args,
      { timeout: timeoutMs },
      (err, stdout, stderr) =>
        err ? reject(new Error(stderr || err.message)) : resolve(stdout)
    );
  });
}

/** Lädt ein Video größenbegrenzt in eine Temp-Datei (nach SSRF-Check des Aufrufers). */
async function downloadVideo(url) {
  const tmpFile = path.join(
    os.tmpdir(),
    `xcheck-video-${Date.now()}${path.extname(new URL(url).pathname) || ".mp4"}`
  );
  const res = await fetch(url, {
    headers: { "User-Agent": "OpenSIN-CrossCheck/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} für ${url}`);
  const reader = res.body.getReader();
  const stream = fs.createWriteStream(tmpFile);
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_VIDEO_BYTES) break; // Anfang reicht für Keyframes
    stream.write(Buffer.from(value));
  }
  await new Promise((r) => stream.end(r));
  return tmpFile;
}

/**
 * Extrahiert Keyframes per Szenenwechsel-Erkennung; Fallback: gleichverteilt.
 * @returns {Promise<Array<{file: string, timestamp: string}>>}
 */
async function extractKeyframes(videoFile) {
  const bin = ffmpegPath();
  if (!bin)
    throw new Error(
      "ffmpeg-static nicht installiert — Video-Analyse nicht verfügbar."
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
  return files.map((f, i) => ({
    file: path.join(outDir, f),
    timestamp: `Keyframe ${i + 1}/${files.length}`,
  }));
}

/** Bild-URL → Vision-Beschreibung. */
async function analyzeImageUrl(url, fetchBuffer) {
  const buffer = await fetchBuffer(url);
  const mime = /\.(jpe?g)([?#]|$)/i.test(url) ? "image/jpeg" : "image/png";
  const description = await describeImage(buffer, `Bild von URL: ${url}`, mime);
  if (!description)
    throw new Error(
      "Vision-Analyse nicht verfügbar (Provider nicht multimodal?)."
    );
  return { label: `Bild: ${url}`, text: description };
}

/** Video-URL → zeitgestempeltes visuelles Transkript via Keyframes. */
async function analyzeVideoUrl(url) {
  const videoFile = await downloadVideo(url);
  try {
    const keyframes = await extractKeyframes(videoFile);
    if (!keyframes.length) throw new Error("Keine Keyframes extrahierbar.");
    const parts = [];
    for (const kf of keyframes) {
      const description = await describeImage(
        fs.readFileSync(kf.file),
        `${kf.timestamp} des Videos ${url}`
      );
      if (description) parts.push(`[${kf.timestamp}]\n${description}`);
      fs.unlinkSync(kf.file);
    }
    if (!parts.length)
      throw new Error("Vision-Analyse der Keyframes nicht verfügbar.");
    return {
      label: `Video (visuell): ${url}`,
      text: `Visuelles Transkript (${parts.length} Keyframes, Szenenwechsel-Sampling):\n\n${parts.join("\n\n")}`,
    };
  } finally {
    fs.existsSync(videoFile) && fs.unlinkSync(videoFile);
  }
}

module.exports = { analyzeImageUrl, analyzeVideoUrl };
