// SPDX-License-Identifier: MIT
const consoleLogger = require("../../../logger/console.js");

const fs = require("fs");
const path = require("path");

/**
 * Plugin to save chat history to a json file
 */
const fileHistory = {
  name: "file-history-plugin",
  startupConfig: {
    params: {},
  },
  plugin: function ({
    filename = `history/chat-history-${new Date().toISOString()}.json`,
  } = {}) {
    return {
      name: this.name,
      setup(aibitat) {
        const folderPath = path.dirname(filename);
        // get path from filename
        if (folderPath) {
          fs.mkdirSync(folderPath, { recursive: true });
        }

        aibitat.onMessage(() => {
          let content;
          try {
            content = JSON.stringify(aibitat.chats, null, 2);
          } catch (e) {
            consoleLogger.error(
              `file-history: Failed to serialize chats: ${e.message}`,
            );
            return;
          }
          fs.writeFile(filename, content, (err) => {
            if (err) {
              consoleLogger.error(err);
            }
          });
        });
      },
    };
  },
};

module.exports = { fileHistory };
