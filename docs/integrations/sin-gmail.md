# SIN-Gmail with Himalaya

OpenSIN Chat uses the shared `sin-gmail` integration for Gmail and other IMAP/SMTP accounts. The application does not require a Google Cloud project, Gmail API client, OAuth consent screen or Apps Script deployment.

## Trust boundary

- Account definitions live in `~/.config/himalaya/config.toml`.
- Gmail App Passwords live only in the macOS Keychain.
- Himalaya resolves passwords through each account's `auth.cmd`.
- OpenSIN stores only non-secret presentation metadata: enabled state, display label, default account and contact groups.
- The existing agent tool names such as `gmail-search` and `gmail-send-email` remain stable, but their implementation calls Himalaya locally.

OpenSIN must never receive or persist an App Password.

## Host setup

Install the stable Himalaya release and configure an account using the shared skill:

```bash
brew install himalaya
himalaya account configure default
```

The fleet-wide skill is located at:

```text
~/dev/wow-my-zsh/shared/skills/sin-gmail/
```

A typical Keychain-backed account uses an `auth.cmd` similar to:

```toml
auth.cmd = "security find-generic-password -s himalaya-example -w"
```

After setup, restart the API or refresh the Gmail agent status. OpenSIN discovers account aliases from the Himalaya configuration automatically.

## Optional environment overrides

```bash
SIN_GMAIL_RUNTIME_PATH=/Users/example/dev/wow-my-zsh/shared/skills/sin-gmail/runtime/himalaya-adapter.js
HIMALAYA_BIN=/opt/homebrew/bin/himalaya
HIMALAYA_CONFIG=/Users/example/.config/himalaya/config.toml
```

All variables are optional on the standard Mac development layout. Without overrides, OpenSIN loads the shared runtime from `~/dev/wow-my-zsh/shared/skills/sin-gmail/runtime/himalaya-adapter.js`, checks the common Homebrew paths and executable `PATH`, and uses Himalaya's standard config location.

## Supported operations

The compatibility adapter provides:

- inbox listing and Gmail-style common search operators
- message reading
- sending and replying
- draft creation, listing, editing, deletion and sending
- read/unread flags
- archive, inbox and trash movement
- mailbox statistics
- multiple account aliases
- MIME attachments for host-local files

Message references returned to agents are opaque `hg:` identifiers containing the account, mailbox and IMAP message ID. Agents must pass these identifiers back unchanged.

## Himalaya version compatibility

The stable Himalaya v1 CLI uses singular command domains such as `folder`, `envelope`, `message` and `flag`. The upcoming v2 CLI uses plural domains such as `mailboxes`, `envelopes`, `messages` and `flags`. OpenSIN detects the installed major version and prefers the matching command family while retaining a compatibility fallback.

## Docker boundary

The automatic macOS experience is a host-local integration. A standard Linux container cannot access the host macOS Keychain and usually does not contain the Himalaya binary or the user's config file.

Therefore OpenSIN fails visibly when Himalaya is unavailable instead of pretending Gmail is connected. Container deployments need an explicit mail sidecar or a deliberately mounted Himalaya binary/config plus a container-compatible secret command. Do not mount plaintext App Passwords merely to make the status green.

## Operational checks

```bash
himalaya --version
himalaya account list
himalaya envelope list -a default -s 5 -o json
```

The OpenSIN UI also exposes a connection test per account. A successful test proves that Himalaya can authenticate and list the mailbox; it does not expose the credential to OpenSIN.
