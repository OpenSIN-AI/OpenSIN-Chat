// SPDX-License-Identifier: MIT
const consoleLogger = require("../../../../../logger/console.js");

const mysql = require("mysql2/promise");
const { ConnectionStringParser, assertReadOnlyQuery } = require("./utils");

class MySQLConnector {
  #connected = false;
  database_id = "";
  constructor(
    config = {
      connectionString: null,
    },
  ) {
    this.className = "MySQLConnector";
    this.connectionString = config.connectionString;
    this._client = null;
    this.database_id = this.#parseDatabase();
  }

  #parseDatabase() {
    const connectionParser = new ConnectionStringParser({ scheme: "mysql" });
    const parsed = connectionParser.parse(this.connectionString);
    return parsed?.endpoint;
  }

  async connect() {
    this._client = await mysql.createConnection({
      uri: this.connectionString,
      // Explicitly disabled (this is already mysql2's default) so that a
      // stacked query such as `SELECT 1; DROP TABLE users;` can never be
      // executed as multiple statements even if the driver default changes
      // in a future version. Do not rely on library defaults for this.
      multipleStatements: false,
    });
    this.#connected = true;
    return this._client;
  }

  /**
   *
   * @param {string} queryString the SQL query to be run
   * @param {Array} params optional parameters for prepared statement
   * @returns {Promise<import(".").QueryResult>}
   */
  async runQuery(queryString = "", params = []) {
    const safetyCheck = assertReadOnlyQuery(queryString);
    if (!safetyCheck.ok) {
      return {
        rows: [],
        count: 0,
        error: safetyCheck.error,
      };
    }

    const QUERY_TIMEOUT_MS = 30_000;
    const result = { rows: [], count: 0, error: null };
    try {
      if (!this.#connected) await this.connect();
      const runner =
        params.length > 0
          ? this._client.execute(queryString, params)
          : this._client.query(queryString);
      let timerId;
      const timeout = new Promise((_, reject) => {
        timerId = setTimeout(
          () => reject(new Error(`MySQL query timed out after 30s`)),
          QUERY_TIMEOUT_MS,
        );
        timerId?.unref?.();
      });
      try {
        const [query] = await Promise.race([runner, timeout]);
        result.rows = query;
        result.count = query?.length;
      } finally {
        clearTimeout(timerId);
      }
    } catch (err) {
      consoleLogger.error(this.className, err);
      result.error = err.message;
    } finally {
      if (this.#connected && this._client) {
        await this._client.end().catch(() => {});
        this.#connected = false;
        this._client = null;
      }
    }
    return result;
  }

  async validateConnection() {
    try {
      const result = await this.runQuery("SELECT 1");
      return { success: !result.error, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getTablesSql() {
    return {
      query: `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
      params: [this.database_id],
    };
  }

  getTableSchemaSql(table_name) {
    return {
      query: `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA FROM information_schema.columns WHERE table_schema = ? AND table_name = ?`,
      params: [this.database_id, table_name],
    };
  }
}

module.exports.MySQLConnector = MySQLConnector;
