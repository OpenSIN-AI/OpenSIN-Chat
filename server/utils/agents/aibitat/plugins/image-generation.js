// SPDX-License-Identifier: MIT
const createFilesLib = require("./create-files/lib.js");

module.exports.imageGeneration = {
  name: "image-generation",
  plugin: function () {
    return {
      name: "image-generation",
      setup(aibitat) {
        aibitat.function({
          super: aibitat,
          name: "image-generation",
          description:
            "Generate an image using an AI image generation model. " +
            "Provide a detailed prompt describing the image you want to create. " +
            "Returns a downloadable image file.",
          examples: [
            {
              prompt: "Generate an image of a beautiful mountain landscape at sunset",
              call: JSON.stringify({
                prompt:
                  "A beautiful mountain landscape at sunset with snow-capped peaks and a lake reflecting the golden light, photorealistic style",
                filename: "mountain-sunset.png",
              }),
            },
            {
              prompt: "Create a logo for a tech startup",
              call: JSON.stringify({
                prompt:
                  "Modern minimalist logo for a tech startup called 'NexusAI', geometric shapes, blue and purple gradient, clean professional design",
                filename: "nexusai-logo.png",
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
                  "A detailed description of the image to generate. Be specific about style, colors, composition, and subject matter for best results.",
              },
              filename: {
                type: "string",
                description:
                  "The filename for the generated image. The .png extension will be added automatically if not provided. Use descriptive filenames.",
              },
            },
            required: ["prompt", "filename"],
            additionalProperties: false,
          },
          handler: async function ({
            prompt = "",
            filename = "generated-image.png",
          }) {
            try {
              this.super.handlerProps.log(
                `Using the image-generation tool with prompt: "${prompt.slice(0, 80)}..."`,
              );

              const hasExtension = /\.(png|jpg|jpeg|webp)$/i.test(filename);
              if (!hasExtension) filename = `${filename}.png`;

              if (this.super.requestToolApproval) {
                const approval = await this.super.requestToolApproval({
                  skillName: this.name,
                  payload: { filename },
                  description: `Generate image "${filename}" from prompt`,
                });
                if (!approval.approved) {
                  this.super.introspect(
                    `${this.caller}: User rejected the ${this.name} request.`,
                  );
                  return approval.message;
                }
              }

              this.super.introspect(
                `${this.caller}: Generating image "${filename}" from prompt`,
              );

              const { SystemSettings } = require("../../../../models/systemSettings");
              const basePath = (
                await SystemSettings.getValueOrFallback(
                  { label: "image_generation_base_path" },
                  "",
                )
              ).replace(/\/+$/, "");
              const apiKey =
                (await SystemSettings.get({
                  label: "image_generation_api_key",
                }))?.value || "";
              const model =
                (await SystemSettings.getValueOrFallback(
                  { label: "image_generation_model" },
                  "",
                )) || undefined;

              if (!basePath) {
                return "Image generation is not configured. Please set the image generation base path in the admin settings.";
              }

              const url = `${basePath}/v1/images/generations`;

              const body = {
                prompt,
                n: 1,
                response_format: "url",
                ...(model ? { model } : {}),
              };

              const headers = {
                "Content-Type": "application/json",
              };
              if (apiKey) {
                headers["Authorization"] = `Bearer ${apiKey}`;
              }

              const response = await fetch(url, {
                method: "POST",
                headers,
                body: JSON.stringify(body),
              });

              if (!response.ok) {
                const errorText = await response.text().catch(() => "");
                this.super.handlerProps.log(
                  `image-generation API error: ${response.status} ${errorText}`,
                );
                return `Image generation API returned HTTP ${response.status}. Check your server configuration.`;
              }

              const data = await response.json();
              const imageUrl = data?.data?.[0]?.url;
              if (!imageUrl) {
                return "Image generation succeeded but no image URL was returned. The model may have returned an unexpected response format.";
              }

              const imageResponse = await fetch(imageUrl);
              if (!imageResponse.ok) {
                return "Failed to download the generated image from the provider. The URL may have expired.";
              }

              const imageBuffer = Buffer.from(
                await imageResponse.arrayBuffer(),
              );

              const extension = filename.includes(".")
                ? filename.split(".").pop()
                : "png";
              const displayFilename = filename.split("/").pop();

              const savedFile = await createFilesLib.saveGeneratedFile({
                fileType: "image",
                extension,
                buffer: imageBuffer,
                displayFilename,
              });

              this.super.socket.send("fileDownloadCard", {
                filename: savedFile.displayFilename,
                storageFilename: savedFile.filename,
                fileSize: savedFile.fileSize,
              });

              createFilesLib.registerOutput(
                this.super,
                "ImageFileDownload",
                {
                  filename: savedFile.displayFilename,
                  storageFilename: savedFile.filename,
                  fileSize: savedFile.fileSize,
                },
              );

              const bufferSizeKB = (imageBuffer.length / 1024).toFixed(2);
              this.super.introspect(
                `${this.caller}: Successfully generated image "${displayFilename}" (${bufferSizeKB}KB)`,
              );

              return `Successfully generated image "${displayFilename}" (${bufferSizeKB}KB). The image is ready for download.`;
            } catch (e) {
              this.super.handlerProps.log(
                `image-generation error: ${e.message}`,
              );
              this.super.introspect(`Error: ${e.message}`);
              return `Error generating image: ${e.message}`;
            }
          },
        });
      },
    };
  },
};
