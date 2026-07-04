// SPDX-License-Identifier: MIT
// Credit: https://github.com/sindilevich/connection-string-parser

/**
 * Patterns that indicate an attempt to use a normally-read-only statement
 * (SELECT/WITH/SHOW/EXPLAIN/DESCRIBE) to reach filesystem or command
 * execution primitives exposed by some SQL engines when the connecting
 * user has elevated privileges (e.g. FILE, pg_read_server_files,
 * xp_cmdshell). A plain "starts with SELECT" check does not catch these
 * because all of the statements below are syntactically valid SELECT/
 * WITH statements.
 */
const DANGEROUS_QUERY_PATTERNS = [
  /\bINTO\s+(OUTFILE|DUMPFILE)\b/i, // MySQL: SELECT ... INTO OUTFILE '/path/shell.php'
  /\bLOAD_FILE\s*\(/i, // MySQL: SELECT LOAD_FILE('/etc/passwd')
  /\bpg_read_(binary_)?file\s*\(/i, // Postgres: SELECT pg_read_file(...)
  /\bpg_ls_dir\s*\(/i, // Postgres: directory listing via SELECT
  /\bCOPY\b[\s\S]*\bPROGRAM\b/i, // Postgres: COPY ... TO/FROM PROGRAM '<shell cmd>'
  /\bxp_cmdshell\b/i, // MSSQL: shell execution
  /\bOPENROWSET\s*\(/i, // MSSQL: ad-hoc remote/file access
  /\bOPENQUERY\s*\(/i, // MSSQL: linked server passthrough queries
  /\bOPENDATASOURCE\s*\(/i, // MSSQL: ad-hoc remote data source access
  /\bsp_configure\b/i, // MSSQL: server configuration changes
];

/**
 * Validates that a query string is a safe, single, read-only statement.
 * Combines three checks the individual per-engine "SELECT_ONLY_REGEX" check
 * used to do alone, which was bypassable because it only inspected the
 * first keyword of the string:
 *   1. The statement must start with an allowed read-only keyword.
 *   2. The statement must not contain a second statement (stacked query,
 *      e.g. `SELECT 1; DROP TABLE users;`), detected via an unquoted `;`
 *      that isn't just trailing whitespace/semicolons at the very end.
 *   3. The statement must not reference a known file/command-execution
 *      primitive (see DANGEROUS_QUERY_PATTERNS above).
 * @param {string} queryString
 * @returns {{ok: true}|{ok: false, error: string}}
 */
function assertReadOnlyQuery(queryString = "") {
  const SELECT_ONLY_REGEX = /^\s*(SELECT|WITH|SHOW|EXPLAIN|DESCRIBE)\b/i;
  const cleanQuery = typeof queryString === "string" ? queryString.trim() : "";

  if (!SELECT_ONLY_REGEX.test(cleanQuery)) {
    return {
      ok: false,
      error: "Only SELECT/WITH/SHOW/EXPLAIN/DESCRIBE queries are allowed",
    };
  }

  // Reject stacked statements: any semicolon that is not just trailing
  // punctuation at the end of the query indicates a second statement.
  // This is a conservative heuristic (it does not parse string literals),
  // so it may reject some valid queries containing a literal `;` inside a
  // quoted string, but it never allows a stacked statement through.
  const withoutTrailingSemicolons = cleanQuery.replace(/;+\s*$/, "");
  if (withoutTrailingSemicolons.includes(";")) {
    return {
      ok: false,
      error: "Multiple statements in a single query are not allowed",
    };
  }

  for (const pattern of DANGEROUS_QUERY_PATTERNS) {
    if (pattern.test(cleanQuery)) {
      return {
        ok: false,
        error: "Query references a disallowed file/command-execution primitive",
      };
    }
  }

  return { ok: true };
}

/**
 * @typedef {Object} ConnectionStringParserOptions
 * @property {'mssql' | 'mysql' | 'postgresql' | 'db'} [scheme] - The scheme of the connection string
 */

/**
 * @typedef {Object} ConnectionStringObject
 * @property {string} scheme - The scheme of the connection string eg: mongodb, mssql, mysql, postgresql, etc.
 * @property {string} username - The username of the connection string
 * @property {string} password - The password of the connection string
 * @property {{host: string, port: number}[]} hosts - The hosts of the connection string
 * @property {string} endpoint - The endpoint (database name) of the connection string
 * @property {Object} options - The options of the connection string
 */
class ConnectionStringParser {
  static DEFAULT_SCHEME = "db";

  /**
   * @param {ConnectionStringParserOptions} options
   */
  constructor(options = {}) {
    this.scheme =
      (options && options.scheme) || ConnectionStringParser.DEFAULT_SCHEME;
  }

  /**
   * Takes a connection string object and returns a URI string of the form:
   *
   * scheme://[username[:password]@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[endpoint]][?options]
   * @param {Object} connectionStringObject The object that describes connection string parameters
   */
  format(connectionStringObject) {
    if (!connectionStringObject) {
      return this.scheme + "://localhost";
    }
    if (
      this.scheme &&
      connectionStringObject.scheme &&
      this.scheme !== connectionStringObject.scheme
    ) {
      throw new Error(`Scheme not supported: ${connectionStringObject.scheme}`);
    }

    let uri =
      (this.scheme ||
        connectionStringObject.scheme ||
        ConnectionStringParser.DEFAULT_SCHEME) + "://";

    if (connectionStringObject.username) {
      uri += encodeURIComponent(connectionStringObject.username);
      // Allow empty passwords
      if (connectionStringObject.password) {
        uri += ":" + encodeURIComponent(connectionStringObject.password);
      }
      uri += "@";
    }
    uri += this._formatAddress(connectionStringObject);
    // Only put a slash when there is an endpoint
    if (connectionStringObject.endpoint) {
      uri += "/" + encodeURIComponent(connectionStringObject.endpoint);
    }
    if (
      connectionStringObject.options &&
      Object.keys(connectionStringObject.options).length > 0
    ) {
      uri +=
        "?" +
        Object.keys(connectionStringObject.options)
          .map(
            (option) =>
              encodeURIComponent(option) +
              "=" +
              encodeURIComponent(connectionStringObject.options[option]),
          )
          .join("&");
    }
    return uri;
  }

  /**
   * Where scheme and hosts will always be present. Other fields will only be present in the result if they were
   * present in the input.
   * @param {string} uri The connection string URI
   * @returns {ConnectionStringObject} The connection string object
   */
  parse(uri) {
    const connectionStringParser = new RegExp(
      "^\\s*" + // Optional whitespace padding at the beginning of the line
        "([^:]+)://" + // Scheme (Group 1)
        "(?:([^:@,/?=&]+)(?::([^:@,/?=&]+))?@)?" + // User (Group 2) and Password (Group 3)
        "([^@/?=&]+)" + // Host address(es) (Group 4)
        "(?:/([^:@,/?=&]+)?)?" + // Endpoint (Group 5)
        "(?:\\?([^:@,/?]+)?)?" + // Options (Group 6)
        "\\s*$", // Optional whitespace padding at the end of the line
      "gi",
    );
    const connectionStringObject = {};

    if (!uri.includes("://")) {
      throw new Error(`No scheme found in URI ${uri}`);
    }

    const tokens = connectionStringParser.exec(uri);

    if (Array.isArray(tokens)) {
      connectionStringObject.scheme = tokens[1];
      if (this.scheme && this.scheme !== connectionStringObject.scheme) {
        throw new Error(`URI must start with '${this.scheme}://'`);
      }
      connectionStringObject.username = tokens[2]
        ? decodeURIComponent(tokens[2])
        : tokens[2];
      connectionStringObject.password = tokens[3]
        ? decodeURIComponent(tokens[3])
        : tokens[3];
      connectionStringObject.hosts = this._parseAddress(tokens[4]);
      connectionStringObject.endpoint = tokens[5]
        ? decodeURIComponent(tokens[5])
        : tokens[5];
      connectionStringObject.options = tokens[6]
        ? this._parseOptions(tokens[6])
        : tokens[6];
    }
    return connectionStringObject;
  }

  /**
   * Formats the address portion of a connection string
   * @param {Object} connectionStringObject The object that describes connection string parameters
   */
  _formatAddress(connectionStringObject) {
    return connectionStringObject.hosts
      .map(
        (address) =>
          encodeURIComponent(address.host) +
          (address.port
            ? ":" + encodeURIComponent(address.port.toString(10))
            : ""),
      )
      .join(",");
  }

  /**
   * Parses an address
   * @param {string} addresses The address(es) to process
   */
  _parseAddress(addresses) {
    return addresses.split(",").map((address) => {
      const i = address.indexOf(":");

      return i >= 0
        ? {
            host: decodeURIComponent(address.substring(0, i)),
            port: +address.substring(i + 1),
          }
        : { host: decodeURIComponent(address) };
    });
  }

  /**
   * Parses options
   * @param {string} options The options to process
   */
  _parseOptions(options) {
    const result = {};

    options.split("&").forEach((option) => {
      const i = option.indexOf("=");

      if (i >= 0) {
        result[decodeURIComponent(option.substring(0, i))] = decodeURIComponent(
          option.substring(i + 1),
        );
      }
    });
    return result;
  }
}

module.exports = { ConnectionStringParser, assertReadOnlyQuery };
