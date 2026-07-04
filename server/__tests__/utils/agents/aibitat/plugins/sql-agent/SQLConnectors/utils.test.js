// SPDX-License-Identifier: MIT
// Purpose: Regression tests for assertReadOnlyQuery() -- the shared
// read-only enforcement used by all three SQL agent connectors
// (MySQL/Postgres/MSSQL) to stop the agent's sql-query tool from running
// anything other than a single, safe, read-only statement.
const {
  assertReadOnlyQuery,
} = require("../../../../../../../utils/agents/aibitat/plugins/sql-agent/SQLConnectors/utils");

describe("assertReadOnlyQuery", () => {
  describe("legitimate read-only queries are allowed", () => {
    it.each([
      "SELECT * FROM users",
      "  select 1",
      "WITH cte AS (SELECT 1) SELECT * FROM cte",
      "SHOW TABLES",
      "EXPLAIN SELECT * FROM users",
      "DESCRIBE users",
      "SELECT 1;",
      "SELECT 1;   ",
    ])("allows: %s", (query) => {
      expect(assertReadOnlyQuery(query).ok).toBe(true);
    });
  });

  describe("non-read-only statements are rejected", () => {
    it.each([
      "DROP TABLE users",
      "DELETE FROM users",
      "UPDATE users SET admin=1",
      "INSERT INTO users VALUES (1)",
      "TRUNCATE TABLE users",
      "ALTER TABLE users ADD COLUMN x INT",
    ])("rejects: %s", (query) => {
      expect(assertReadOnlyQuery(query).ok).toBe(false);
    });
  });

  describe("stacked queries are rejected (CWE-89 bypass)", () => {
    it.each([
      "SELECT 1; DROP TABLE users;",
      "SELECT 1; DELETE FROM users",
      "SELECT * FROM users WHERE id=1; UPDATE users SET admin=1 WHERE id=1;",
    ])("rejects: %s", (query) => {
      const result = assertReadOnlyQuery(query);
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/multiple statements/i);
    });
  });

  describe("file/command-execution primitives are rejected even though they start with SELECT", () => {
    it.each([
      ["MySQL INTO OUTFILE", "SELECT * FROM users INTO OUTFILE '/var/www/shell.php'"],
      ["MySQL INTO DUMPFILE", "SELECT 'x' INTO DUMPFILE '/tmp/x'"],
      ["MySQL LOAD_FILE", "SELECT LOAD_FILE('/etc/passwd')"],
      ["Postgres pg_read_file", "SELECT pg_read_file('/etc/passwd')"],
      ["Postgres pg_read_binary_file", "SELECT pg_read_binary_file('/etc/passwd')"],
      ["Postgres pg_ls_dir", "SELECT pg_ls_dir('/etc')"],
      ["Postgres COPY PROGRAM", "SELECT 1; COPY (SELECT 1) TO PROGRAM 'id'"],
      ["MSSQL xp_cmdshell", "SELECT 1; EXEC xp_cmdshell 'whoami'"],
      ["MSSQL OPENROWSET", "SELECT * FROM OPENROWSET('SQLNCLI', 'evil', 'SELECT 1')"],
      ["MSSQL OPENQUERY", "SELECT * FROM OPENQUERY(LinkedServer, 'SELECT 1')"],
      ["MSSQL OPENDATASOURCE", "SELECT * FROM OPENDATASOURCE('SQLNCLI', 'evil').db.dbo.t"],
      ["MSSQL sp_configure", "SELECT 1; EXEC sp_configure 'show advanced options', 1"],
    ])("rejects %s: %s", (_label, query) => {
      const result = assertReadOnlyQuery(query);
      expect(result.ok).toBe(false);
    });
  });

  it("is case-insensitive for both the keyword check and the dangerous-pattern check", () => {
    expect(assertReadOnlyQuery("select load_file('/etc/passwd')").ok).toBe(
      false,
    );
    expect(assertReadOnlyQuery("Select * From users").ok).toBe(true);
  });
});
