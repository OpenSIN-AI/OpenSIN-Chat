<!-- SPDX-License-Identifier: MIT -->
# Architektur-Diagramm — OpenSIN-Chat Gumloop-Parität

> Visueller Überblick wie alle 6 Phasen + 37 Dateien zusammenhängen.

## Gesamtarchitektur (Mermaid)

```mermaid
graph TB
    subgraph "Frontend (React + Vite)"
        WS[WorkspaceChat<br/>index.tsx]
        ARS[AgentRunsContext<br/>SSE Consumer + buildTree]
        ASS[AgentSessionsSidebar<br/>Run-Baum + Cancel]
        RSB[RightSidebarIconBar<br/>+ Agent Section + Live-Badge]
        AST[AgentSettingsSidebar<br/>Model + Prompt + Tools<br/>+ TriggerManager]
        WSS[WorkspaceSettingsSidebar<br/>LLM + Embedding + VectorDB]
        CC[ConnectorCatalog<br/>Tile-Grid UI]
        UC[useConnector Hook<br/>OAuth Popup]
        UT[useTriggers Hook<br/>CRUD + Fire + Replay]
        US[useSubagents Hook<br/>Spawn + Tree]
    end

    subgraph "Backend (Node.js + Express)"
        APP[app.js<br/>Endpoint Registration]
        SSE[agentRunsStream.js<br/>SSE Multiplex]
        RB[runBus.js<br/>EventEmitter]
        AH[AgentHandler<br/>index.js]
        AI[AIbitat<br/>orchestrator]
        SP[SubagentSpawner<br/>isolated context]
        SUBP[subagentPlugin<br/>LLM Tool]
        TE[TriggerEngine<br/>Bree + Backoff]
        TM[agentTriggers Model<br/>CRUD + Checkpoint]
        OAUTH[oauth.js<br/>start/callback/list]
        CA[connectorAccounts Model<br/>Token Vault + Refresh]
        PKCE[pkce.js<br/>PKCE + State Store]
        PROV[providers.js<br/>Provider Registry]
        AR[agentRuns Model<br/>CRUD + getRunTree]
        SUBEP[subagents.js<br/>REST spawn + tree]
        TEP[agentTriggers.js<br/>REST CRUD + Fire]
    end

    subgraph "Database (Prisma)"
        DB[(SQLite / Postgres)]
        T1[agent_runs<br/>parent_run_id]
        T2[connector_accounts<br/>AES-GCM tokens]
        T3[agent_triggers<br/>cron + checkpoint]
        T4[trigger_runs<br/>dedupe + dead-letter]
    end

    subgraph "External"
        G[Google OAuth<br/>Gmail/Drive/Docs/Sheets]
        GH[GitHub OAuth]
    end

    %% Frontend → Backend
    WS --> ARS
    ARS -->|SSE| SSE
    ASS -->|cancel| SSE
    RSB -->|toggle| ASS
    RSB -->|toggle| AST
    RSB -->|toggle| WSS
    CC --> UC
    UC -->|OAuth popup| OAUTH
    AST --> UT
    UT -->|REST| TEP
    US -->|spawn| SUBEP

    %% Backend internal
    SSE --> RB
    RB -->|events| AH
    AH --> AI
    AI --> SUBP
    SUBP --> SP
    SP -->|parent_run_id| AH
    TE --> TM
    TE -->|invoke| AH
    OAUTH --> PKCE
    OAUTH --> CA
    OAUTH --> PROV
    CA -->|encrypt| PROV

    %% Backend → DB
    SSE --> AR
    AR --> T1
    CA --> T2
    TM --> T3
    TM --> T4
    SP --> AR

    %% OAuth → External
    PROV --> G
    PROV --> GH
```

## Phasen-Abhängigkeiten

```mermaid
graph LR
    P1[Phase 1<br/>Live Runs<br/>Right Sidebar]
    P2[Phase 2<br/>OAuth Connectors]
    P3[Phase 3<br/>Connector Katalog]
    P4[Phase 4<br/>Agent/Workspace Settings]
    P5[Phase 5<br/>Trigger Framework]
    P6[Phase 6<br/>Subagent API]

    P1 --> P6
    P1 --> P4
    P2 --> P3
    P4 --> P5
    P5 --> P4
```

## Datenfluss: Agent-Run → Live-Anzeige

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant SSE as SSE Stream
    participant Bus as runBus
    participant Handler as AgentHandler
    participant AIbitat
    participant DB

    User->>Frontend: Sendet Nachricht
    Frontend->>Handler: POST /chat
    Handler->>DB: agent_runs.create()
    Handler->>Bus: publish(run.started)
    Bus->>SSE: event: run.started
    SSE->>Frontend: EventSource callback
    Frontend->>User: Run erscheint im Panel

    Handler->>AIbitat: aibitat.start()
    AIbitat->>Bus: publish(run.tool, args)
    Bus->>SSE: event: run.tool
    SSE->>Frontend: Tool-Call erscheint live

    AIbitat->>Bus: publish(run.tool, result)
    Bus->>SSE: event: run.tool
    SSE->>Frontend: Tool-Status → ✓ done

    AIbitat->>Bus: publish(run.finished)
    Bus->>SSE: event: run.finished
    SSE->>Frontend: Run-Status → ✓ done
    Handler->>DB: agent_runs.updateStatus(done)
```

## Datenfluss: OAuth Connect

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend as oauth.js
    participant Google
    participant Vault as connectorAccounts
    participant DB

    User->>Frontend: Klickt "Gmail verbinden"
    Frontend->>Backend: GET /connectors/google/start?product=gmail
    Backend->>Backend: createPKCE() + putState()
    Backend->>Frontend: { authorizeUrl }
    Frontend->>Google: window.open(authorizeUrl)
    Google->>User: OAuth Consent Screen
    User->>Google: Erteilt Berechtigung
    Google->>Backend: GET /connectors/google/callback?code=...&state=...
    Backend->>Backend: takeState() — CSRF check
    Backend->>Google: POST tokenUrl (code + verifier)
    Google->>Backend: { access_token, refresh_token }
    Backend->>Google: GET userinfoUrl
    Google->>Backend: { email: "user@gmail.com" }
    Backend->>Vault: upsert(encrypted tokens)
    Vault->>DB: connector_accounts.save()
    Backend->>Frontend: postMessage({ ok: true, account: "user@gmail.com" })
    Frontend->>User: "✅ Verbunden als user@gmail.com"
```

## Datenfluss: Trigger-Ausführung

```mermaid
sequenceDiagram
    participant Engine as TriggerEngine
    participant DB
    participant Handler as AgentHandler
    participant Bus as runBus

    loop Every 60s
        Engine->>DB: getDueScheduleTriggers()
        DB->>Engine: [trigger1, trigger2]
        
        loop For each due trigger
            Engine->>DB: createRun(dedupeKey)
            DB->>Engine: { runId }
            Engine->>DB: updateRun(running)
            Engine->>Handler: invokeAgent(prompt)
            Handler->>Bus: publish(run.started)
            Handler->>Bus: publish(run.tool)
            Handler->>Bus: publish(run.finished)
            Engine->>DB: updateRun(done)
            Engine->>DB: update(nextRunAt)
        end
    end

    note over Engine: Bei Fehler:<br/>Exponential Backoff<br/>Circuit Breaker<br/>Dead-Letter
```

## Datei-Zuordnung nach Phase

| Phase | Neue Dateien | Modifizierte Dateien |
|---|---|---|
| **1** | runBus.js, agentRuns.js, agentRunsStream.js, AgentRunsContext.tsx, AgentSessionsSidebar/index.tsx, RightSidebarIconBar/index.tsx, AgentSettingsSidebar (placeholder), WorkspaceSettingsSidebar (placeholder) | app.js, WorkspaceChat/index.tsx |
| **2** | providers.js, pkce.js, connectorAccounts.js, oauth.js, useConnector.ts | GMailSkillPanel (optional) |
| **3** | connectorCatalog.ts, ConnectorCatalog/index.tsx | App.tsx (Route) |
| **4** | AgentSettingsSidebar (full), WorkspaceSettingsSidebar (full), 5 Unit-Test-Suites | — |
| **5** | agentTriggers.js (model), triggerEngine.js, agentTriggers.js (endpoint), useTriggers.ts, TriggerManager.tsx | app.js, AgentSettingsSidebar |
| **6** | subagentSpawner.js, subagentPlugin.js, subagents.js, useSubagents.ts | plugins/index.js, agents/index.js, app.js, WorkspaceChat/index.tsx |
