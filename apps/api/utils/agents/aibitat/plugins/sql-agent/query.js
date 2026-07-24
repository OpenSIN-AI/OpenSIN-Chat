// SPDX-License-Identifier: MIT
const consoleLogger = require("../../../../logger/console.js");

/**
 * Validate that a SQL query is read-only (no mutations).
 * Allows SELECT, EXPLAIN, SHOW, DESCRIBE as first statement.
 * Strips comments and whitespace before checking.
 * @param {string} sql - Raw SQL query from the agent
 * @returns {{ok: boolean, reason?: string}} Validation result
 */
function validateReadOnlyQuery(sql) {
  if (!sql || typeof sql !== "string")
    return { ok: false, reason: "Empty query" };

  // Strip block comments (/* ... */) and line comments (-- ... or # ...)
  let cleaned = sql
    .replace(/\/\*[\s\S]*?\*\//g, "") // /* ... */
    .replace(/--[^\n]*/g, "") // -- line comment
    .replace(/#[^\n]*/g, "") // # line comment
    .trim();

  if (!cleaned)
    return { ok: false, reason: "Query is empty after stripping comments" };

  // Only allow statements that start with a safe read-only keyword
  const firstWord = cleaned.split(/\s+/)[0].toUpperCase();
  const allowedFirstWords = ["SELECT", "EXPLAIN", "SHOW", "DESCRIBE", "WITH"];
  if (!allowedFirstWords.includes(firstWord)) {
    return {
      ok: false,
      reason: `Only read-only queries are allowed. Query must start with ${allowedFirstWords.join(", ")}. Found: ${firstWord}`,
    };
  }

  // Check for dangerous SQL keywords (as standalone words, not inside strings)
  // Simple heuristic: check for keywords outside of single/double quoted strings
  const withoutStrings = cleaned
    .replace(/'[^']*'/g, "")
    .replace(/"[^"]*"/g, "");
  const dangerousKeywords = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "CREATE",
    "TRUNCATE",
    "GRANT",
    "REVOKE",
    "EXEC",
    "EXECUTE",
    "MERGE",
    "UPSERT",
    "CALL",
    "COMMIT",
    "ROLLBACK",
    "SET",
    "LOCK",
    "UNLOCK",
    "RENAME",
    "REPLACE",
  ];
  const upper = withoutStrings.toUpperCase();
  for (const kw of dangerousKeywords) {
    // Match as whole word boundary
    if (new RegExp(`\\b${kw}\\b`).test(upper)) {
      return {
        ok: false,
        reason: `Query contains prohibited keyword: ${kw}`,
      };
    }
  }

  return { ok: true };
}

module.exports.SqlAgentQuery = {
  name: "sql-query",
  plugin: function () {
    const {
      getDBClient,
      listSQLConnections,
    } = require("./SQLConnectors/index.js");

    return {
      name: "sql-query",
      setup(aibitat) {
        aibitat.function({
          super: aibitat,
          name: this.name,
          description:
            "Run a read-only SQL query on a `database_id` which will return up rows of data related to the query. The query must only be SELECT statements which do not modify the table data. There should be a reasonable LIMIT on the return quantity to prevent long-running or queries which crash the db.",
          examples: [
            {
              prompt: "How many customers are in dvd-rentals?",
              call: JSON.stringify({
                database_id: "dvd-rentals",
                sql_query: "SELECT * FROM customers",
              }),
            },
            {
              prompt: "Can you tell me the total volume of sales last month?",
              call: JSON.stringify({
                database_id: "sales-db",
                sql_query:
                  "SELECT SUM(sale_amount) AS total_sales FROM sales WHERE sale_date >= DATEADD(month, -1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)) AND sale_date < DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)",
              }),
            },
            {
              prompt:
                "Do we have anyone in the staff table for our production db named 'sam'? ",
              call: JSON.stringify({
                database_id: "production",
                sql_query:
                  "SElECT * FROM staff WHERE first_name='sam%' OR last_name='sam%'",
              }),
            },
          ],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              database_id: {
                type: "string",
                description:
                  "The database identifier for which we will connect to to query the table schema. This is required to run the SQL query.",
              },
              sql_query: {
                type: "string",
                description:
                  "The raw SQL query to run. Should be a query which does not modify the table and will return results.",
              },
            },
            additionalProperties: false,
          },
          required: ["database_id", "sql_query"],
          handler: async function ({ database_id = "", sql_query = "" }) {
            this.super.handlerProps.log(`Using the sql-query tool.`);
            try {
              const databaseConfig = (await listSQLConnections()).find(
                (db) => db.database_id === database_id,
              );
              if (!databaseConfig) {
                this.super.handlerProps.log(
                  `sql-query failed to find config!`,
                  database_id,
                );
                return `No database connection for ${database_id} was found!`;
              }

              this.super.introspect(
                `${this.caller}: Im going to run a query on the ${database_id} to get an answer.`,
              );
              const db = getDBClient(databaseConfig.engine, databaseConfig);

              const validation = validateReadOnlyQuery(sql_query);
              if (!validation.ok) {
                this.super.handlerProps.log(
                  `sql-query rejected: ${validation.reason}`,
                );
                this.super.introspect(`Query rejected: ${validation.reason}`);
                return `Query rejected: ${validation.reason}`;
              }

              this.super.introspect(`Running SQL: ${sql_query}`);
              const result = await db.runQuery(sql_query);
              if (result.error) {
                this.super.handlerProps.log(
                  `sql-query tool reported error`,
                  result.error,
                );
                this.super.introspect(`Error: ${result.error}`);
                return `There was an error running the query: ${result.error}`;
              }

              return JSON.stringify(result);
            } catch (e) {
              consoleLogger.error(e);
              return e.message;
            }
          },
        });
      },
    };
  },
};
