const OpenAI = require("openai");
const Provider = require("./ai-provider.js");
const InheritMultiple = require("./helpers/classes.js");
const UnTooled = require("./helpers/untooled.js");
const { parseOpencodeZenBasePath } = require("../../../AiProviders/opencodeZen");

/**
 * The agent provider for the OpenCode Zen provider.
 * OpenCode Zen is an OpenAI-compatible API gateway.
 * We wrap it in UnTooled because tool-calling support varies by model.
 */
class OpencodeZenProvider extends InheritMultiple([Provider, UnTooled]) {
  model;

  constructor(config = {}) {
    const { model } = config;
    super();
    const client = new OpenAI({
      baseURL: parseOpencodeZenBasePath(process.env.OPENCODE_ZEN_BASE_PATH),
      apiKey: process.env.OPENCODE_ZEN_API_KEY || null,
    });

    this._client = client;
    this.model = model;
    this.verbose = true;
  }

  get client() {
    return this._client;
  }

  get supportsAgentStreaming() {
    return true;
  }

  /**
   * Whether this provider supports native OpenAI-compatible tool calling.
   * @returns {boolean|Promise<boolean>}
   */
  supportsNativeToolCalling() {
    return false;
  }

  async #handleFunctionCallChat({ messages = [] }) {
    return await this.client.chat.completions
      .create({
        model: this.model,
        messages,
      })
      .then((result) => {
        if (!result.hasOwnProperty("choices"))
          throw new Error("OpenCode Zen chat: No results!");
        if (result.choices.length === 0)
          throw new Error("OpenCode Zen chat: No results length!");
        return result.choices[0].message.content;
      })
      .catch((_) => {
        return null;
      });
  }

  async #handleFunctionCallStream({ messages = [] }) {
    return await this.client.chat.completions.create({
      model: this.model,
      stream: true,
      messages,
    });
  }

  async stream(messages, functions = [], eventHandler = null) {
    return await UnTooled.prototype.stream.call(
      this,
      messages,
      functions,
      this.#handleFunctionCallStream.bind(this),
      eventHandler,
    );
  }

  async complete(messages, functions = []) {
    return await UnTooled.prototype.complete.call(
      this,
      messages,
      functions,
      this.#handleFunctionCallChat.bind(this),
    );
  }

  /**
   * Get the cost of the completion.
   *
   * @param _usage The completion to get the cost for.
   * @returns The cost of the completion.
   */
  getCost(_usage) {
    return 0;
  }
}

module.exports = OpencodeZenProvider;
