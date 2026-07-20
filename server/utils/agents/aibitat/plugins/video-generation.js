// SPDX-License-Identifier: MIT
// Purpose: Agent skill to generate short videos via AI Gateway / OpenAI-compatible video APIs.
// Docs: Mirrors image-generation config (AI_GATEWAY_API_KEY, VIDEO_GENERATION_* env).
const createFilesLib = require("./create-files/lib.js");

const FETCH_TIMEOUT_MS = 300_000; // video gen is slow
const POLL_INTERVAL_MS = 4_000;
const MAX_POLLS = 60;

module.exports.videoGeneration = {
  name: "video-generation",
  startupConfig: {
    params: {},
  },
  plugin: function () {
    return {
      name: "video-generation",
      setup(aibitat) {
        aibitat.function({
          super: aibitat,
          name: "video-generation",
          description:
            "Generate a short AI video from a text prompt. " +
            "Provide a detailed cinematic prompt. Optionally set filename and duration (seconds). " +
            "Returns a downloadable video file when the provider supports video generation.",
          examples: [
            {
              prompt: "Generate a short video of waves on a beach at sunset",
              call: JSON.stringify({
                prompt:
                  "Cinematic slow-motion ocean waves at golden hour, soft light, 4k, photorealistic",
                filename: "ocean-sunset.mp4",
                duration: 5,
              }),
            },
          ],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description:
                  "Detailed description of the video to generate (subject, motion, style, lighting).",
              },
              filename: {
                type: "string",
                description:
                  "Filename for the generated video. .mp4 is added if missing.",
              },
              duration: {
                type: "number",
                description: "Target duration in seconds (provider-dependent). Default 5.",
              },
            },
            required: ["prompt", "filename"],
            additionalProperties: false,
          },
          handler: async function ({
            prompt = "",
            filename = "generated-video.mp4",
            duration = 5,
          }) {
            try {
              this.super.handlerProps.log(
                `Using video-generation tool: "${String(prompt).slice(0, 80)}..."`,
              );

              if (!/(\.mp4|\.webm)$/i.test(filename)) {
                filename = `${filename}.mp4`;
              }

              if (this.super.requestToolApproval) {
                const approval = await this.super.requestToolApproval({
                  skillName: this.name,
                  payload: { filename },
                  description: `Generate video "${filename}" from prompt`,
                });
                if (!approval.approved) {
                  this.super.introspect(
                    `${this.caller}: User rejected the ${this.name} request.`,
                  );
                  return approval.message;
                }
              }

              this.super.introspect(
                `${this.caller}: Generating video "${filename}" (this can take a minute)…`,
              );

              const {
                SystemSettings,
              } = require("../../../../models/systemSettings");

              const storedBasePath = (
                await SystemSettings.getValueOrFallback(
                  { label: "video_generation_base_path" },
                  "",
                )
              ).replace(/\/+$/, "");
              const basePath =
                storedBasePath ||
                (process.env.VIDEO_GENERATION_BASE_PATH || "").replace(
                  /\/+$/,
                  "",
                ) ||
                (process.env.IMAGE_GENERATION_BASE_PATH || "").replace(
                  /\/+$/,
                  "",
                ) ||
                "https://ai-gateway.vercel.sh";

              const storedApiKey =
                (
                  await SystemSettings.get({
                    label: "video_generation_api_key",
                  })
                )?.value || "";
              const apiKey =
                storedApiKey ||
                process.env.VIDEO_GENERATION_API_KEY ||
                process.env.IMAGE_GENERATION_API_KEY ||
                process.env.AI_GATEWAY_API_KEY ||
                process.env.OPENAI_API_KEY ||
                "";

              const storedModel =
                (await SystemSettings.getValueOrFallback(
                  { label: "video_generation_model" },
                  "",
                )) || "";
              const model =
                storedModel ||
                process.env.VIDEO_GENERATION_MODEL ||
                "google/veo-2.0-generate-001";

              if (!apiKey) {
                return (
                  "Video generation is not configured. Set AI_GATEWAY_API_KEY " +
                  "(or VIDEO_GENERATION_API_KEY) and optionally VIDEO_GENERATION_MODEL " +
                  "on the server, then retry."
                );
              }

              const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              };

              // Attempt 1: OpenAI-style video generations (gateway / Sora-compatible)
              const createUrl = `${basePath}/v1/videos`;
              let createRes = await fetch(createUrl, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  model,
                  prompt,
                  seconds: String(Math.min(Math.max(Number(duration) || 5, 2), 20)),
                }),
                signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
              }).catch((e) => ({ ok: false, status: 0, _err: e }));

              // Attempt 2: fal-style / video/generations fallback
              if (!createRes.ok && createRes.status !== 0) {
                createRes = await fetch(`${basePath}/v1/video/generations`, {
                  method: "POST",
                  headers,
                  body: JSON.stringify({
                    model,
                    prompt,
                    duration: Math.min(Math.max(Number(duration) || 5, 2), 20),
                  }),
                  signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
                }).catch((e) => ({ ok: false, status: 0, _err: e }));
              }

              if (!createRes.ok) {
                const errText =
                  (await createRes.text?.().catch(() => "")) ||
                  createRes._err?.message ||
                  "";
                this.super.handlerProps.log(
                  `video-generation create failed: ${createRes.status} ${errText}`,
                );
                return (
                  `Video generation API error (HTTP ${createRes.status || "network"}). ` +
                  `Configure VIDEO_GENERATION_BASE_PATH / VIDEO_GENERATION_MODEL for a provider that supports video. ` +
                  `Detail: ${String(errText).slice(0, 280)}`
                );
              }

              const createData = await createRes.json().catch(() => ({}));

              // Immediate binary / base64
              let videoBuffer = null;
              const b64 =
                createData?.data?.[0]?.b64_json ||
                createData?.video_b64 ||
                createData?.b64_json;
              if (b64) {
                videoBuffer = Buffer.from(b64, "base64");
              }

              // Async job id → poll
              const jobId =
                createData?.id ||
                createData?.job_id ||
                createData?.data?.[0]?.id ||
                null;
              let videoUrl =
                createData?.data?.[0]?.url ||
                createData?.url ||
                createData?.video_url ||
                null;

              if (!videoBuffer && jobId && !videoUrl) {
                for (let i = 0; i < MAX_POLLS; i++) {
                  await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
                  const pollRes = await fetch(`${basePath}/v1/videos/${jobId}`, {
                    headers,
                    signal: AbortSignal.timeout(60_000),
                  }).catch(() => null);
                  if (!pollRes?.ok) continue;
                  const pollData = await pollRes.json().catch(() => ({}));
                  const status = String(
                    pollData?.status || pollData?.state || "",
                  ).toLowerCase();
                  videoUrl =
                    pollData?.data?.[0]?.url ||
                    pollData?.url ||
                    pollData?.video_url ||
                    null;
                  if (pollData?.data?.[0]?.b64_json) {
                    videoBuffer = Buffer.from(
                      pollData.data[0].b64_json,
                      "base64",
                    );
                    break;
                  }
                  if (
                    videoUrl ||
                    status === "completed" ||
                    status === "succeeded" ||
                    status === "ready"
                  ) {
                    break;
                  }
                  if (
                    status === "failed" ||
                    status === "error" ||
                    status === "cancelled"
                  ) {
                    return `Video generation job failed (status=${status}).`;
                  }
                  if (i % 5 === 0) {
                    this.super.introspect(
                      `${this.caller}: Video still generating… (${i * (POLL_INTERVAL_MS / 1000)}s)`,
                    );
                  }
                }
              }

              if (!videoBuffer && videoUrl) {
                const dl = await fetch(videoUrl, {
                  signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
                });
                if (!dl.ok) {
                  return `Video was generated but download failed (HTTP ${dl.status}).`;
                }
                videoBuffer = Buffer.from(await dl.arrayBuffer());
              }

              if (!videoBuffer?.length) {
                return (
                  "Video generation returned no binary data. The configured provider may not support " +
                  "video yet, or the response format is unexpected. Check VIDEO_GENERATION_MODEL."
                );
              }

              const displayFilename = filename.split("/").pop();
              const savedFile = await createFilesLib.saveGeneratedFile({
                fileType: "video",
                extension: displayFilename.includes(".")
                  ? displayFilename.split(".").pop()
                  : "mp4",
                buffer: videoBuffer,
                displayFilename,
              });

              this.super.socket?.send?.("fileDownloadCard", {
                filename: savedFile.displayFilename,
                storageFilename: savedFile.filename,
                fileSize: savedFile.fileSize,
              });

              createFilesLib.registerOutput(this.super, "VideoFileDownload", {
                filename: savedFile.displayFilename,
                storageFilename: savedFile.filename,
                fileSize: savedFile.fileSize,
              });

              const sizeMB = (videoBuffer.length / (1024 * 1024)).toFixed(2);
              this.super.introspect(
                `${this.caller}: Video "${displayFilename}" ready (${sizeMB} MB)`,
              );
              return `Successfully generated video "${displayFilename}" (${sizeMB} MB). The file is ready for download.`;
            } catch (e) {
              this.super.handlerProps.log(`video-generation error: ${e.message}`);
              this.super.introspect(`Error: ${e.message}`);
              return `Error generating video: ${e.message}`;
            }
          },
        });
      },
    };
  },
};
