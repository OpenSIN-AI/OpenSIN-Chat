// SPDX-License-Identifier: MIT
"use strict";

const { isFeatureEnabled } = require("../features");

function getTTSProvider() {
  const provider = process.env.TTS_PROVIDER || "openai";

  switch (provider) {
    case "openai": {
      const { OpenAiTTS } = require("./openAi");
      return new OpenAiTTS();
    }

    case "generic-openai": {
      const { GenericOpenAiTTS } = require("./openAiGeneric");
      return new GenericOpenAiTTS();
    }

    case "kokoro": {
      const { KokoroTTS } = require("./kokoro");
      return new KokoroTTS();
    }

    case "nvidia-nim": {
      const { NvidiaNimTTS } = require("./nvidiaNim");
      return new NvidiaNimTTS();
    }

    case "cvoice": {
      if (!isFeatureEnabled("cvoiceTts")) {
        throw new Error(
          "cvoice TTS is disabled. Set ENABLE_CVOICE_TTS=true only after " +
            "reviewing the provider, voice rights, and data-processing terms.",
        );
      }

      const { CvoiceTTS } = require("./cvoice");
      return new CvoiceTTS();
    }

    default:
      throw new Error(`Unsupported TTS_PROVIDER value: ${provider}`);
  }
}

module.exports = { getTTSProvider };
