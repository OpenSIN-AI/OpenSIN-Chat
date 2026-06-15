<!-- SPDX-License-Identifier: MIT -->

> ⚠️ **DEPRECATED / SUPERSEDED** — Dieser Plan ist nicht mehr aktiv verfolgt.
> Aktuelle Planung: [`PLAN.md`](../PLAN.md) und [`PLAN-PRODUCTION-READINESS.md`](./PLAN-PRODUCTION-READINESS.md).
> Stand der Markierung: 2026-06-15.
> Der Inhalt bleibt als Archiv lesbar, aber wird nicht umgesetzt.

# Plan: Embeddable Widget + Developer-API

## Ziel
Ermögliche es, OpenSIN als einbettbares Chat-Widget auf fremden Websites zu nutzen. Stelle eine öffentliche Developer-API für Integration bereit.

## Scope
- **Embeddable Widget** — `<script>` Tag für fremde Websites
- **Public API** — REST-Endpoints für externe Apps
- **API Keys & Rate Limiting** — Authentifizierung pro Workspace
- **CORS** — Cross-Origin Resource Sharing
- **Styling** — Widget-Anpassung (Theme, Position, Size)

---

## Phase 1: Datenbank-Schema

### API Keys
```sql
CREATE TABLE workspace_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,                -- "Production API Key", "Staging", etc.
  key_hash VARCHAR(64) NOT NULL,     -- SHA256(key) — nur Hash speichern
  key_prefix VARCHAR(10) NOT NULL,   -- z.B. "openafd_xxx" für UI-Anzeige
  is_active BOOLEAN DEFAULT true,
  rate_limit INT DEFAULT 1000,       -- Requests pro Tag
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,            -- Optional
  last_used_at TIMESTAMPTZ
);

CREATE TABLE api_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL,
  api_key_id UUID NOT NULL,
  request_count INT DEFAULT 0,
  reset_at TIMESTAMPTZ DEFAULT (now() + interval '1 day')
);

CREATE TABLE widget_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  anonymous_user_id TEXT NOT NULL,
  external_user_id TEXT,              -- Optional: für Tracking
  conversation_metadata JSONB,        -- Source URL, User Agent, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Phase 2: API Authentication & Rate Limiting

### API Key Generation (Server Action)
```ts
export async function generateApiKey(workspaceId: string, name: string) {
  const userId = await getUserId()
  
  // Verify ownership
  const ws = await query(
    `SELECT id FROM workspaces WHERE id = $1 AND "userId" = $2`,
    [workspaceId, userId]
  )
  if (ws.length === 0) throw new Error('Not found')

  // Generate
  const key = crypto.randomBytes(32).toString('base64url')
  const hash = crypto.createHash('sha256').update(key).digest('hex')
  const prefix = key.slice(0, 10)

  await query(
    `INSERT INTO workspace_api_keys (workspace_id, user_id, name, key_hash, key_prefix)
     VALUES ($1, $2, $3, $4, $5)`,
    [workspaceId, userId, name, hash, prefix]
  )

  return key // Return once! User must save it.
}
```

### Middleware: Authentifizierung
```ts
// app/api/middleware/api-auth.ts
export async function authenticateApiKey(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing API key', status: 401 }
  }

  const key = authHeader.slice(7)
  const hash = crypto.createHash('sha256').update(key).digest('hex')

  const keyRow = await query(
    `SELECT workspace_id, id FROM workspace_api_keys 
     WHERE key_hash = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > now())
     LIMIT 1`,
    [hash]
  )

  if (keyRow.length === 0) {
    return { error: 'Invalid API key', status: 403 }
  }

  const { workspace_id, id: keyId } = keyRow[0]

  // Rate limiting check
  const limitRow = await query(
    `SELECT request_count FROM api_rate_limits 
     WHERE api_key_id = $1 AND reset_at > now()`,
    [keyId]
  )

  const count = limitRow[0]?.request_count || 0
  const limit = (await query(
    `SELECT rate_limit FROM workspace_api_keys WHERE id = $1`,
    [keyId]
  ))[0]?.rate_limit || 1000

  if (count >= limit) {
    return { error: 'Rate limit exceeded', status: 429 }
  }

  // Increment
  await query(
    `UPDATE api_rate_limits SET request_count = request_count + 1 
     WHERE api_key_id = $1`,
    [keyId]
  )

  return { workspaceId: workspace_id, keyId }
}
```

---

## Phase 3: Public REST API

### Endpoints

#### 1. Chat (POST)
```
POST /api/public/chat
Authorization: Bearer <API_KEY>

{
  "message": "What are your hours?",
  "sessionId": "optional-uuid",
  "externalUserId": "user@example.com",
  "conversationHistory": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}

Response:
{
  "sessionId": "uuid",
  "message": "We're open 9-5 EST...",
  "sources": [
    { "documentName": "FAQ", "content": "..." }
  ],
  "timestamp": "2026-06-06T12:00:00Z"
}
```

#### 2. Get Conversation (GET)
```
GET /api/public/conversations/:sessionId
Authorization: Bearer <API_KEY>

Response:
{
  "sessionId": "uuid",
  "messages": [...],
  "createdAt": "2026-06-06T11:00:00Z"
}
```

#### 3. Workspace Info (GET)
```
GET /api/public/workspace
Authorization: Bearer <API_KEY>

Response:
{
  "name": "My Workspace",
  "documentCount": 5,
  "model": "openai/gpt-4o-mini"
}
```

### Implementierung
```ts
// app/api/public/chat/route.ts
import { authenticateApiKey } from '@/app/api/middleware/api-auth'
import { convertToModelMessages, streamText } from 'ai'

export async function POST(req: Request) {
  const auth = await authenticateApiKey(req)
  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status })
  }

  const { workspaceId, keyId } = auth
  const { message, sessionId, externalUserId, conversationHistory } = await req.json()

  // Create or update session
  const sid = sessionId || crypto.randomUUID()
  await query(
    `INSERT INTO widget_sessions (workspace_id, anonymous_user_id, external_user_id)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [workspaceId, sid, externalUserId]
  )

  // Process chat (reuse chat logic from /api/chat)
  const wsRows = await query(
    `SELECT model, temperature, system_prompt, agent_enabled 
     FROM workspaces WHERE id = $1`,
    [workspaceId]
  )
  const { model, temperature, system_prompt, agent_enabled } = wsRows[0]

  // RAG + embeddings (reuse lib/rag.ts)
  const sources = await retrieveContext(message, workspaceId)

  // Build messages
  const messages = [
    ...(conversationHistory || []),
    { role: 'user', content: message }
  ]

  const result = await streamText({
    model,
    system: buildSystem(system_prompt, sources),
    messages: await convertToModelMessages(messages),
    temperature
  })

  // Get full text for response
  const { text } = await result.toText()

  // Persist
  await query(
    `INSERT INTO messages (workspace_id, "userId", role, content, sources)
     VALUES ($1, $2, 'user', $3, NULL),
            ($1, $2, 'assistant', $4, $5)`,
    [workspaceId, sid, message, text, JSON.stringify(sources)]
  )

  return Response.json({
    sessionId: sid,
    message: text,
    sources
  })
}
```

---

## Phase 4: Embeddable Widget

### Widget-Script (`public/widget.js`)
```js
(function() {
  const API_KEY = document.currentScript.getAttribute('data-api-key')
  const WORKSPACE_ID = document.currentScript.getAttribute('data-workspace-id')
  const POSITION = document.currentScript.getAttribute('data-position') || 'bottom-right'

  const SESSION_ID = localStorage.getItem('openafd_session_id') || null

  // Inject Styles
  const style = document.createElement('style')
  style.textContent = `
    .openafd-widget {
      position: fixed;
      bottom: 20px; right: 20px;
      width: 400px; height: 600px;
      border-radius: 12px;
      box-shadow: 0 5px 40px rgba(0,0,0,0.16);
      background: white;
      display: flex;
      flex-direction: column;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .openafd-widget.hidden { display: none; }
    .openafd-header {
      padding: 16px;
      background: #000;
      color: white;
      border-radius: 12px 12px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .openafd-close { background: none; border: none; color: white; cursor: pointer; }
    .openafd-messages { flex: 1; overflow-y: auto; padding: 16px; }
    .openafd-input-area { padding: 12px; border-top: 1px solid #eee; display: flex; gap: 8px; }
    .openafd-input { flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; }
  `
  document.head.appendChild(style)

  // Create Widget HTML
  const widget = document.createElement('div')
  widget.className = 'openafd-widget'
  widget.innerHTML = `
    <div class="openafd-header">
      <span>OpenSIN</span>
      <button class="openafd-close">✕</button>
    </div>
    <div class="openafd-messages" id="messages"></div>
    <div class="openafd-input-area">
      <input type="text" class="openafd-input" placeholder="Ask a question..." id="input">
      <button style="padding: 8px 12px; border: none; bg: #000; color: white; border-radius: 6px; cursor: pointer;">Send</button>
    </div>
  `

  document.body.appendChild(widget)

  // Toggle Button
  const toggle = document.createElement('button')
  toggle.style.cssText = `
    position: fixed; bottom: 20px; right: 20px;
    width: 60px; height: 60px;
    border-radius: 50%;
    background: #000; color: white;
    border: none; cursor: pointer;
    font-size: 24px; z-index: 9998;
  `
  toggle.textContent = '💬'
  toggle.onclick = () => widget.classList.toggle('hidden')
  document.body.appendChild(toggle)

  // Chat Logic
  const messagesDiv = document.getElementById('messages')
  const input = document.getElementById('input')
  const send = toggle.nextSibling

  send.onclick = async () => {
    const text = input.value.trim()
    if (!text) return

    // Add user message
    const userMsg = document.createElement('div')
    userMsg.textContent = text
    userMsg.style.cssText = 'margin-bottom: 8px; padding: 8px 12px; background: #f0f0f0; border-radius: 6px;'
    messagesDiv.appendChild(userMsg)

    // Send to API
    const res = await fetch(
      `https://openafd.example.com/api/public/chat`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: text,
          sessionId: SESSION_ID,
          externalUserId: 'anonymous'
        })
      }
    )

    const { message: reply, sessionId } = await res.json()

    if (!SESSION_ID) {
      localStorage.setItem('openafd_session_id', sessionId)
    }

    // Add assistant message
    const assistantMsg = document.createElement('div')
    assistantMsg.textContent = reply
    assistantMsg.style.cssText = 'margin-bottom: 8px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px;'
    messagesDiv.appendChild(assistantMsg)

    input.value = ''
    messagesDiv.scrollTop = messagesDiv.scrollHeight
  }

  input.onkeypress = (e) => { if (e.key === 'Enter') send.click() }
})()
```

### Einbettung auf fremder Website
```html
<script
  src="https://openafd.example.com/widget.js"
  data-api-key="openafd_xxxxxxxxxxxxx"
  data-workspace-id="workspace-uuid"
  data-position="bottom-right">
</script>
```

---

## Phase 5: API Keys Management UI

### Admin Dashboard Component
```tsx
// components/api-keys/api-keys-section.tsx
export function ApiKeysSection({ workspaceId }: { workspaceId: string }) {
  const [keys, setKeys] = useState<ApiKey[]>([])

  useEffect(() => {
    fetchApiKeys(workspaceId).then(setKeys)
  }, [workspaceId])

  const handleGenerateKey = async (name: string) => {
    const newKey = await generateApiKey(workspaceId, name)
    // Show copy-to-clipboard UI
  }

  return (
    <div>
      <h3>API Keys</h3>
      <Button onClick={() => handleGenerateKey(prompt('Name?'))}>
        Generate New Key
      </Button>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Key Prefix</th>
            <th>Created</th>
            <th>Last Used</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {keys.map(key => (
            <tr key={key.id}>
              <td>{key.name}</td>
              <td>{key.keyPrefix}***</td>
              <td>{new Date(key.createdAt).toLocaleDateString()}</td>
              <td>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}</td>
              <td>{key.isActive ? 'Active' : 'Inactive'}</td>
              <td>
                <Button onClick={() => revokeKey(key.id)}>Revoke</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

---

## Phase 6: CORS & Security

### CORS-Konfiguration
```ts
// app/api/public/chat/route.ts
export async function POST(req: Request) {
  // ... auth, logic ...

  return Response.json(result, {
    headers: {
      'Access-Control-Allow-Origin': '*', // Oder Whitelist
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type'
    }
  })
}

export async function OPTIONS() {
  return Response.json(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type'
    }
  })
}
```

### Security
- Nie API-Keys in Frontend-Code zeigen
- Widget-Script muss über HTTPS served werden
- Rate limiting pro Key (prevent abuse)
- API-Audit-Logs (wer, wann, was)

---

## Phase 7: Documentation

### Für Entwickler
- API Reference (Swagger/OpenAPI)
- Widget Integration Guide (HTML-Snippet kopieren)
- Authentication beispiele
- Error Codes & Handling

---

## Phase 8: Testing

- [ ] API Key generation & validation
- [ ] Rate limiting works
- [ ] Widget loads on external site
- [ ] CORS allows cross-origin requests
- [ ] Session persistence
- [ ] Revoke Key stops API calls

---

## Dependencies
- Node.js built-in `crypto` module
- CORS middleware (Next.js built-in)
- Swagger/OpenAPI (optional, für Docs)

---

## Geschätzter Aufwand
- Datenbank-Schema: 1h
- API Keys + Auth Middleware: 2–3h
- REST API Endpoints: 2–3h
- Widget-Script: 2–3h
- Admin UI: 1–2h
- CORS & Security: 1h
- Testing: 1–2h
- **Total: ~10–14h**

## Risiken
- API Key exposure (user copies & pastes into frontend — educate!)
- CORS Misconfiguration (security vs usability tradeoff)
- Rate limiting bypass attempts
- Widget styling conflicts on partner sites
