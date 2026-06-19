// SPDX-License-Identifier: MIT
const pgSql = require("pg");

class PostgresSQLConnector {
  #connected = false;
  constructor(
    config = {
      connectionString: null,
      schema: null,
    },
  ) {
    this.className = "PostgresSQLConnector";
    this.connectionString = config.connectionString;
    this.schema = config.schema || "public";
    this._client = null;
  }

  async connect() {
    this._client = new pgSql.Client({
      connectionString: this.connectionString,
    });
    await this._client.connect();
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
    const SELECT_ONLY_REGEX = /^\s*(SELECT|WITH|SHOW|EXPLAIN|DESCRIBE)\b/i;
    const cleanQuery =
      typeof queryString === "string" ? queryString.trim() : "";
    if (!SELECT_ONLY_REGEX.test(cleanQuery)) {
      return {
        rows: [],
        count: 0,
        error: "Only SELECT/WITH/SHOW/EXPLAIN/DESCRIBE queries are allowed",
      };
    }

    const QUERY_TIMEOUT_MS = 30_000;
    const result = { rows: [], count: 0, error: null };
    try {
      if (!this.#connected) await this.connect();
      let timerId;
      const timeout = new Promise((_, reject) => {
        timerId = setTimeout(
          () => reject(new Error(`PostgreSQL query timed out after 30s`)),
          QUERY_TIMEOUT_MS,
        );
        timerId?.unref?.();
      });
      let query;
      try {
        query = await Promise.race([
          this._client.query(queryString, params),
          timeout,
        ]);
      } finally {
        clearTimeout(timerId);
      }
      result.rows = query.rows;
      result.count = query.rowCount;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(this.className, err);
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
      query: `SELECT * FROM pg_catalog.pg_tables WHERE schemaname = $1`,
      params: [this.schema],
    };
  }

  getTableSchemaSql(table_name) {
    return {
      query: `SELECT column_name, data_type, character_maximum_length, column_default, is_nullable FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = $1 AND table_schema = $2`,
      params: [table_name, this.schema],
    };
  }
}

module.exports.PostgresSQLConnector = PostgresSQLConnector;
