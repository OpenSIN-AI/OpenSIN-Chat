// SPDX-License-Identifier: MIT
/* eslint-env jest */

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const runtimePath = path.resolve(
  process.env.SIN_GMAIL_RUNTIME_PATH ||
    path.join(
      os.homedir(),
      "dev",
      "wow-my-zsh",
      "shared",
      "skills",
      "sin-gmail",
      "runtime",
      "himalaya-adapter.js",
    ),
);
const describeRuntime = fs.existsSync(runtimePath) ? describe : describe.skip;

jest.mock("../../models/systemSettings", () => ({
  SystemSettings: {
    getValueOrFallback: jest.fn().mockResolvedValue("{}"),
    updateSettings: jest.fn().mockResolvedValue({ success: true, error: null }),
  },
}));

const {
  buildMimeMessage,
  decodeRef,
  encodeRef,
  parseGmailQuery,
  parseHimalayaAccounts,
} = require("../../utils/agents/aibitat/plugins/gmail/himalaya");

describeRuntime("SIN-Gmail Himalaya adapter", () => {
  test("parses account aliases without reading auth commands", () => {
    const config = `
[accounts.default]
email = "user@example.com"
display-name = "User"
default = true

[accounts.default.backend]
type = "imap"
auth.cmd = "security find-generic-password -s secret -w"

[accounts.work]
email = "work@example.com"
default = false
`;

    expect(parseHimalayaAccounts(config)).toEqual([
      {
        id: "default",
        email: "user@example.com",
        displayName: "User",
        default: true,
      },
      {
        id: "work",
        email: "work@example.com",
        displayName: "",
        default: false,
      },
    ]);
  });

  test("round-trips opaque message references", () => {
    const source = { account: "energie", mailbox: "INBOX", id: "42" };
    expect(decodeRef(encodeRef(source), "default")).toEqual(source);
  });

  test("translates common Gmail search operators", () => {
    const filters = parseGmailQuery(
      'is:inbox is:unread from:example.com subject:"Rechnung Juli"',
    );
    expect(filters.mailboxRole).toBe("inbox");
    expect(filters.unread).toBe(true);
    expect(filters.from).toEqual(["example.com"]);
    expect(filters.subject).toEqual(["rechnung juli"]);
  });

  test("uses Himalaya v1 command ordering", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sin-gmail-v1-"));
    const binaryPath = path.join(tempDir, "himalaya");
    const configPath = path.join(tempDir, "config.toml");
    const logPath = path.join(tempDir, "calls.log");

    fs.writeFileSync(
      binaryPath,
      `#!/bin/sh
printf '%s\\n' "$*" >> "$HIMALAYA_TEST_LOG"
case "$1" in
  --version)
    printf '%s\\n' 'himalaya v1.1.0'
    ;;
  folder)
    printf '%s\\n' '["INBOX"]'
    ;;
  envelope)
    printf '%s\\n' '[{"id":"42","subject":"Test","from":"sender@example.com","to":"user@example.com","flags":[]}]'
    ;;
  *)
    printf '%s\\n' "unexpected command: $*" >&2
    exit 2
    ;;
esac
`,
      "utf8",
    );
    fs.chmodSync(binaryPath, 0o755);
    fs.writeFileSync(
      configPath,
      `[accounts.default]\nemail = "user@example.com"\ndefault = true\n`,
      "utf8",
    );

    const childScript = `
      const runtime = require(${JSON.stringify(runtimePath)});
      runtime.configure({
        consoleLogger: console,
        SystemSettings: {
          getValueOrFallback: async () => "{}",
          updateSettings: async () => ({ success: true, error: null }),
        },
        safeJsonParse: (value, fallback) => {
          try { return JSON.parse(value); } catch { return fallback; }
        },
      });
      (async () => {
        const result = await new runtime.HimalayaBridge().search(
          "is:inbox",
          1,
          0,
          "default",
        );
        if (!result.success) throw new Error(result.error);
        if (result.data.resultCount !== 1) throw new Error("missing result");
      })().catch((error) => {
        console.error(error);
        process.exitCode = 1;
      });
    `;

    try {
      const child = spawnSync(process.execPath, ["-e", childScript], {
        env: {
          ...process.env,
          HIMALAYA_BIN: binaryPath,
          HIMALAYA_CONFIG: configPath,
          HIMALAYA_TEST_LOG: logPath,
        },
        encoding: "utf8",
      });

      expect(child.status).toBe(0);
      expect(child.stderr).toBe("");
      const calls = fs.readFileSync(logPath, "utf8").trim().split(/\r?\n/);
      expect(calls).toContain("--version");
      expect(calls).toContain("folder list -a default -o json");
      expect(calls).toContain(
        "envelope list -a default -f INBOX -s 50 -o json",
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("uses Himalaya v1 ordering for message mutations", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sin-gmail-v1-ops-"));
    const binaryPath = path.join(tempDir, "himalaya");
    const configPath = path.join(tempDir, "config.toml");
    const logPath = path.join(tempDir, "calls.log");

    fs.writeFileSync(
      binaryPath,
      `#!/bin/sh
printf '%s\\n' "$*" >> "$HIMALAYA_TEST_LOG"
case "$1" in
  --version)
    printf '%s\\n' 'himalaya v1.1.0'
    ;;
  folder)
    printf '%s\\n' '["INBOX","[Gmail]/Drafts","[Gmail]/Trash","[Gmail]/All Mail"]'
    ;;
  message)
    case "$2" in
      read)
        printf '%s\\n' '{"id":"42","subject":"Test","from":"sender@example.com","to":"user@example.com","flags":[]}'
        ;;
      export)
        printf '%s\\n' 'Message-ID: <draft@example.com>' '' 'Draft body'
        ;;
      send)
        cat >/dev/null
        ;;
      save)
        cat >/dev/null
        printf '%s\\n' 'id: 77'
        ;;
      delete|move)
        ;;
      *)
        exit 2
        ;;
    esac
    ;;
  flag)
    case "$2" in
      add|remove)
        ;;
      *)
        exit 2
        ;;
    esac
    ;;
  *)
    exit 2
    ;;
esac
`,
      "utf8",
    );
    fs.chmodSync(binaryPath, 0o755);
    fs.writeFileSync(
      configPath,
      `[accounts.default]\nemail = "user@example.com"\ndefault = true\n`,
      "utf8",
    );

    const childScript = `
      const runtime = require(${JSON.stringify(runtimePath)});
      runtime.configure({
        consoleLogger: console,
        SystemSettings: {
          getValueOrFallback: async () => "{}",
          updateSettings: async () => ({ success: true, error: null }),
        },
        safeJsonParse: (value, fallback) => {
          try { return JSON.parse(value); } catch { return fallback; }
        },
      });
      (async () => {
        const bridge = new runtime.HimalayaBridge();
        const inboxRef = runtime.encodeRef({
          account: "default",
          mailbox: "INBOX",
          id: "42",
        });
        const draftRef = runtime.encodeRef({
          account: "default",
          mailbox: "[Gmail]/Drafts",
          id: "77",
        });
        const checks = [
          await bridge.readMessage(inboxRef, "default"),
          await bridge.exportRaw(draftRef, "default", "drafts"),
          await bridge.sendRaw("From: user@example.com\\r\\n\\r\\nBody", "default"),
          await bridge.saveRawDraft("From: user@example.com\\r\\n\\r\\nDraft", "default"),
          await bridge.deleteDraft(draftRef, "default"),
          await bridge.markRead(inboxRef, "default"),
          await bridge.markUnread(inboxRef, "default"),
          await bridge.moveToTrash(inboxRef, "default"),
          await bridge.moveToArchive(inboxRef, "default"),
        ];
        const failed = checks.find((result) => !result.success);
        if (failed) throw new Error(failed.error || "operation failed");
      })().catch((error) => {
        console.error(error);
        process.exitCode = 1;
      });
    `;

    try {
      const child = spawnSync(process.execPath, ["-e", childScript], {
        env: {
          ...process.env,
          HIMALAYA_BIN: binaryPath,
          HIMALAYA_CONFIG: configPath,
          HIMALAYA_TEST_LOG: logPath,
        },
        encoding: "utf8",
      });

      expect(child.status).toBe(0);
      expect(child.stderr).toBe("");
      const calls = fs.readFileSync(logPath, "utf8").trim().split(/\r?\n/);
      expect(calls).toContain("message read 42 -a default -f INBOX -o json");
      expect(calls).toContain(
        "message export 77 -a default -f [Gmail]/Drafts --full",
      );
      expect(calls).toContain("message send -a default");
      expect(calls).toContain("message save -a default -f [Gmail]/Drafts");
      expect(calls).toContain("message delete 77 -a default -f [Gmail]/Drafts");
      expect(calls).toContain("flag add 42 seen -a default -f INBOX");
      expect(calls).toContain("flag remove 42 seen -a default -f INBOX");
      expect(calls).toContain(
        "message move [Gmail]/Trash 42 -a default -f INBOX",
      );
      expect(calls).toContain(
        "message move [Gmail]/All Mail 42 -a default -f INBOX",
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("builds a safe multipart MIME message", () => {
    const result = buildMimeMessage({
      from: "sender@example.com",
      to: "recipient@example.com",
      subject: "Prüfung\r\nBcc: attacker@example.com",
      body: "Hallo",
      attachments: [
        {
          name: "report.txt",
          contentType: "text/plain",
          data: Buffer.from("content").toString("base64"),
        },
      ],
    });

    expect(result.raw).toContain("From: sender@example.com");
    expect(result.raw).toContain("To: recipient@example.com");
    expect(result.raw).toContain("Content-Type: multipart/mixed");
    expect(result.raw).toContain('filename="report.txt"');
    expect(result.raw).not.toMatch(/\r\nBcc: attacker@example.com\r\n/);
    expect(result.messageId).toMatch(/^<.+@opensin\.local>$/);
  });
});
