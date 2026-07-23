// SPDX-License-Identifier: MIT
"use strict";

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

    default:
      throw new Error(`Unsupported TTS_PROVIDER value: ${provider}`);
  }
}

module.exports = { getTTSProvider };
