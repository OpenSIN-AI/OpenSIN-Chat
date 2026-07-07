<!-- SPDX-License-Identifier: MIT -->
# Contributing Guide — Neue Connectors, Triggers & Plugins hinzufügen

> Erweitern von OpenSIN-Chat um neue Integrations-Möglichkeiten

---

## Neuen Connector hinzufügen

### 1. Provider-Registry erweitern

**Datei:** `server/utils/connectors/providers.js`

```js
const PROVIDERS = {
  // ... bestehende Provider
  slack: {
    authUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    revokeUrl: "https://slack.com/api/auth.revoke",
    clientId: process.env.SLACK_OAUTH_CLIENT_ID || null,
    clientSecret: process.env.SLACK_OAUTH_CLIENT_SECRET || null,
    usesPKCE: false, // Slack unterstützt kein PKCE
    extraAuthParams: {},
    scopeSets: {
      messages: ["channels:read", "chat:write"],
      _base: [],
    },
    userinfoUrl: "https://slack.com/api/auth.test",
  },
};
```

### 2. OAuth-App anlegen
- Slack: https://api.slack.com/apps → Create New App → OAuth & Permissions
- Redirect URI: `https://sinchat.delqhi.com/api/connectors/slack/callback`
- Scopes freischalten

### 3. `.env` erweitern
```env
SLACK_OAUTH_CLIENT_ID=...
SLACK_OAUTH_CLIENT_SECRET=...
```

### 4. Katalog-Eintrag hinzufügen

**Datei:** `frontend/src/data/connectorCatalog.ts`

```ts
{
  id: "slack",
  provider: "slack",
  product: "messages",
  name: "Slack",
  description: "Nachrichten lesen und senden",
  icon: "chat-circle",
  category: "slack", // neue Kategorie oder "coming_soon"
},
```

### 5. Agent-Skill erstellen (optional)
Erstelle ein AIbitat-Plugin das `ConnectorAccounts.getFreshAccessToken({ provider: "slack" })` nutzt.

---

## Neuen Trigger-Typ hinzufügen

### 1. Trigger-Typ erweitern

**Datei:** `server/models/agentTriggers.js`
- `create()` akzeptiert neuen `type` Wert
- Neue Scheduler-Query (z.B. `getDueWebhookTriggers()`)

**Datei:** `server/utils/agents/triggerEngine.js`
- Neue `_checkWebhookTriggers()` Methode
- In `_useIntervalInstead()` einbinden

### 2. Frontend anpassen

**Datei:** `frontend/src/hooks/useTriggers.ts`
- Type-Definition erweitern: `type: "schedule" | "polling" | "webhook"`

**Datei:** `frontend/src/components/.../AgentSettingsSidebar/TriggerManager.tsx`
- Create-Form: neuen Type-Button hinzufügen

---

## Neues AIbitat-Plugin hinzufügen

### 1. Plugin-Datei erstellen

**Datei:** `server/utils/agents/aibitat/plugins/my-plugin.js`

```js
function myPlugin(aibitat) {
  return {
    name: "my-plugin",
    setup(aibitat) {
      aibitat.function({
        super: aibitat,
        name: "my_tool",
        description: "Beschreibung was das Tool macht",
        parameters: {
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: {
            input: { type: "string", description: "Eingabe" },
          },
          required: ["input"],
        },
        handler: async function (args = {}) {
          // Tool-Logik
          return `<result>${args.input}</result>`;
        },
      });
    },
  };
}
module.exports = { myPlugin };
```

### 2. Plugin registrieren

**Datei:** `server/utils/agents/aibitat/plugins/index.js`

```js
const { myPlugin } = require("./my-plugin.js");

module.exports = {
  // ... bestehende Plugins
  myPlugin,
  [myPlugin.name]: myPlugin,
};
```

### 3. Tool-Toggle hinzufügen (Frontend)

**Datei:** `frontend/src/components/.../AgentSettingsSidebar/index.tsx`

```ts
const AVAILABLE_TOOLS = [
  // ... bestehende Tools
  { id: "my-plugin", name: "Mein Tool", defaultEnabled: false },
];
```

### 4. Unit-Test schreiben

**Datei:** `server/__tests__/agents/myPlugin.test.js`

```js
describe("MyPlugin", () => {
  it("should register a function", () => {
    const mockAibitat = { function: vi.fn() };
    const plugin = myPlugin(mockAibitat);
    plugin.setup(mockAibitat);
    expect(mockAibitat.function).toHaveBeenCalledWith(
      expect.objectContaining({ name: "my_tool" })
    );
  });
});
```

---

## Code-Style

- **SPDX-Header:** Jede neue Datei beginnt mit `// SPDX-License-Identifier: MIT`
- **Purpose-Kommentar:** `// Purpose: ...` nach SPDX
- **Doc.md:** Jede meaningful Datei bekommt eine `.doc.md` Begleitdatei
- **Brand-Guard:** Keine `AnythingLLM` oder `Mintplex Labs` Strings (außer in erlaubten Dateien)
- **Tests:** VERIFY-BEFORE-CLAIM — nie "es funktioniert" sagen ohne es getestet zu haben

## Branch-Workflow

```bash
git checkout -b feature/my-new-feature
# Code schreiben
yarn lint:check
yarn test
yarn test:server
git commit -m "feat: description"
git push origin feature/my-new-feature
# PR erstellen
```
