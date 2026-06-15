<!-- SPDX-License-Identifier: MIT -->

> ⚠️ **DEPRECATED / SUPERSEDED** — Dieser Plan ist nicht mehr aktiv verfolgt.
> Aktuelle Planung: [`PLAN.md`](../PLAN.md) und [`PLAN-PRODUCTION-READINESS.md`](./PLAN-PRODUCTION-READINESS.md).
> Stand der Markierung: 2026-06-15.
> Der Inhalt bleibt als Archiv lesbar, aber wird nicht umgesetzt.

# Plan: Memories (Persistentes Gedächtnis)

## Ziel
Ermögliche dem Assistenten, sich an Nutzerpräferenzen, Kontext und Fakten über Konversationen hinweg zu erinnern. Automatische und manuelle Memory-Verwaltung.

## Scope
- **Automatic Memory Extraction** — LLM extrahiert Erinnerungen aus Konversationen
- **Memory Storage** — Vektorisierte Memories in pgvector
- **Memory Retrieval** — Relevante Memories automatisch in Context injiziert
- **Manual Memory Management** — Nutzer können Memories erstellen, bearbeiten, löschen
- **Memory Privacy** — Memories sind workspace-spezifisch, nicht geheim

---

## Phase 1: Datenbank-Schema

### Memory Table
```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,                   -- "Prefers JSON format", "Has 3 kids"
  content TEXT NOT NULL,                 -- Full memory text
  embedding vector(1536),                -- Vektorisierung für Ähnlichkeitssuche
  category TEXT DEFAULT 'personal',      -- 'personal', 'preference', 'factual'
  source TEXT,                           -- 'auto' (from conversation), 'manual' (user-created)
  last_mentioned_at TIMESTAMPTZ,         -- Für Relevanz-Scoring
  mention_count INT DEFAULT 0,           -- Häufigkeit der Erwähnung
  is_pinned BOOLEAN DEFAULT false,       -- Wichtige Memories immer laden
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_memories_workspace ON memories(workspace_id);
CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops);

CREATE TABLE memory_references (
  id BIGSERIAL PRIMARY KEY,
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  relevance_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Phase 2: Automatic Memory Extraction

### Background Job (per Message)
```ts
// app/api/chat/route.ts → nach onFinish

export async function extractMemoriesFromAssistantMessage(
  workspaceId: string,
  userId: string,
  userMessage: string,
  assistantResponse: string
) {
  // System Prompt für Memory Extraction
  const extractionPrompt = `
Extract 0-3 important facts or preferences mentioned in this conversation that the assistant should remember:

User: "${userMessage}"
Assistant: "${assistantResponse}"

For each memory, respond in JSON format:
{
  "memories": [
    {
      "title": "short title",
      "content": "detailed content",
      "category": "personal|preference|factual"
    }
  ]
}

Only extract if genuinely useful for future conversations.
  `

  const { text } = await generateText({
    model: 'openai/gpt-4o-mini',
    prompt: extractionPrompt,
  })

  try {
    const { memories } = JSON.parse(text)
    
    for (const mem of memories) {
      // Embed
      const embedding = await embedQuery(mem.content)
      
      // Store
      await query(
        `INSERT INTO memories (workspace_id, user_id, title, content, embedding, source)
         VALUES ($1, $2, $3, $4, $5, 'auto')
         ON CONFLICT(workspace_id, user_id, content) DO UPDATE
         SET mention_count = mention_count + 1, last_mentioned_at = now()`,
        [workspaceId, userId, mem.title, mem.content, embedding, mem.category]
      )
    }
  } catch (err) {
    console.error('[v0] Memory extraction failed:', err)
    // Fail silently — don't break chat
  }
}
```

---

## Phase 3: Memory Retrieval & Injection

### Retrieve Relevant Memories
```ts
// In chat route, before building system prompt

export async function getRelevantMemories(
  workspaceId: string,
  userId: string,
  queryText: string,
  topK: number = 5
) {
  const queryVector = toVectorLiteral(await embedQuery(queryText))

  // Get pinned memories + most relevant by similarity
  const memories = await query<Memory>(
    `SELECT id, title, content, category, mention_count, is_pinned
     FROM memories
     WHERE workspace_id = $1 AND user_id = $2
     ORDER BY
       is_pinned DESC,
       1 - (embedding <=> $3::vector) ASC,
       mention_count DESC
     LIMIT $4`,
    [workspaceId, userId, queryVector, topK]
  )

  return memories
}
```

### Inject into System Prompt
```ts
// In chat route

const userMessage = lastUserText(messages)
const memories = await getRelevantMemories(workspaceId, userId, userMessage)

const memoryBlock = memories
  .map(m => `• ${m.title}: ${m.content}`)
  .join('\n')

const system = [
  `You are OpenSIN...`,
  system_prompt ? `\n\n=== INSTRUCTIONS ===\n${system_prompt}` : '',
  memories.length > 0 ? `
=== REMEMBER ABOUT THIS USER ===
${memoryBlock}

Use these memories to personalize your responses. Reference them naturally.
=== END MEMORIES ===
  ` : '',
  // ... rest of system prompt
].filter(Boolean).join('\n\n')
```

---

## Phase 4: Manual Memory Management UI

### Memory List Component
```tsx
// components/memories/memory-manager.tsx
'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Pin, PinOff, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import type { Memory } from '@/lib/types'

export function MemoryManager({ workspaceId }: { workspaceId: string }) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState<'personal' | 'preference' | 'factual'>('personal')

  useEffect(() => {
    fetchMemories(workspaceId).then(setMemories)
  }, [workspaceId])

  const handleAddMemory = async () => {
    if (!newTitle.trim() || !newContent.trim()) return

    const memory = await createMemory(workspaceId, {
      title: newTitle,
      content: newContent,
      category: newCategory,
      source: 'manual'
    })

    setMemories([...memories, memory])
    setNewTitle('')
    setNewContent('')
  }

  const handleDelete = async (id: string) => {
    await deleteMemory(id)
    setMemories(memories.filter(m => m.id !== id))
  }

  const handlePin = async (id: string, isPinned: boolean) => {
    await updateMemory(id, { isPinned: !isPinned })
    setMemories(memories.map(m => 
      m.id === id ? { ...m, isPinned: !isPinned } : m
    ))
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Add New Memory</h3>
        <Input
          placeholder="Title (e.g., 'Prefers JSON format')"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="mb-2"
        />
        <Textarea
          placeholder="Detailed content..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          className="mb-2 min-h-20"
        />
        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value as any)}
          className="mb-2 p-2 border rounded text-sm"
        >
          <option value="personal">Personal</option>
          <option value="preference">Preference</option>
          <option value="factual">Factual</option>
        </select>
        <Button onClick={handleAddMemory} size="sm">Add Memory</Button>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Your Memories ({memories.length})</h3>
        {memories.map(memory => (
          <div key={memory.id} className="border rounded-lg p-3 flex justify-between items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{memory.title}</span>
                <Badge variant="outline" className="text-xs">
                  {memory.category}
                </Badge>
                {memory.isPinned && <Pin className="size-3 fill-current" />}
              </div>
              <p className="text-sm text-muted-foreground">{memory.content}</p>
              <span className="text-xs text-muted-foreground">
                Mentioned {memory.mentionCount}x
                {memory.lastMentionedAt && ` (last: ${new Date(memory.lastMentionedAt).toLocaleDateString()})`}
              </span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePin(memory.id, memory.isPinned)}
                title={memory.isPinned ? 'Unpin' : 'Pin'}
              >
                {memory.isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(memory.id)}
                title="Delete"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Tab im Workspace
```tsx
// In workspace dashboard
<Tabs>
  <TabsList>
    <TabsTrigger value="chat">Chat</TabsTrigger>
    <TabsTrigger value="documents">Documents</TabsTrigger>
    <TabsTrigger value="memories">Memories</TabsTrigger>
  </TabsList>

  <TabsContent value="memories">
    <MemoryManager workspaceId={workspaceId} />
  </TabsContent>
</Tabs>
```

---

## Phase 5: Server Actions

### Memory CRUD
```ts
// app/actions/memories.ts
'use server'

import { query } from '@/lib/db'
import { embedQuery, toVectorLiteral } from '@/lib/rag'
import { getUserId } from '@/lib/db'

export async function createMemory(
  workspaceId: string,
  {
    title,
    content,
    category = 'personal',
    source = 'manual'
  }: {
    title: string
    content: string
    category?: 'personal' | 'preference' | 'factual'
    source?: 'auto' | 'manual'
  }
) {
  const userId = await getUserId()

  // Verify ownership
  const ws = await query(
    `SELECT id FROM workspaces WHERE id = $1 AND "userId" = $2`,
    [workspaceId, userId]
  )
  if (ws.length === 0) throw new Error('Workspace not found')

  // Embed
  const embedding = toVectorLiteral(await embedQuery(content))

  // Insert
  const result = await query(
    `INSERT INTO memories (workspace_id, user_id, title, content, embedding, category, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, title, content, category, is_pinned, mention_count, last_mentioned_at, created_at`,
    [workspaceId, userId, title, content, embedding, category, source]
  )

  return result[0]
}

export async function updateMemory(
  memoryId: string,
  updates: { title?: string; content?: string; isPinned?: boolean }
) {
  const userId = await getUserId()

  // Verify ownership
  const mem = await query(
    `SELECT m.id FROM memories m
     JOIN workspaces w ON w.id = m.workspace_id
     WHERE m.id = $1 AND w."userId" = $2`,
    [memoryId, userId]
  )
  if (mem.length === 0) throw new Error('Memory not found')

  const setClauses = []
  const values = [memoryId]
  let paramIdx = 2

  if (updates.title !== undefined) {
    setClauses.push(`title = $${paramIdx++}`)
    values.push(updates.title)
  }

  if (updates.content !== undefined) {
    setClauses.push(`content = $${paramIdx++}`)
    values.push(updates.content)
    // Re-embed if content changed
    const embedding = toVectorLiteral(await embedQuery(updates.content))
    setClauses.push(`embedding = $${paramIdx++}`)
    values.push(embedding)
  }

  if (updates.isPinned !== undefined) {
    setClauses.push(`is_pinned = $${paramIdx++}`)
    values.push(updates.isPinned)
  }

  setClauses.push(`updated_at = now()`)

  await query(
    `UPDATE memories SET ${setClauses.join(', ')} WHERE id = $1`,
    values
  )
}

export async function deleteMemory(memoryId: string) {
  const userId = await getUserId()

  const mem = await query(
    `SELECT m.id FROM memories m
     JOIN workspaces w ON w.id = m.workspace_id
     WHERE m.id = $1 AND w."userId" = $2`,
    [memoryId, userId]
  )
  if (mem.length === 0) throw new Error('Memory not found')

  await query(`DELETE FROM memories WHERE id = $1`, [memoryId])
}

export async function listMemories(workspaceId: string) {
  const userId = await getUserId()

  return query(
    `SELECT id, title, content, category, mention_count, is_pinned, last_mentioned_at
     FROM memories
     WHERE workspace_id = $1 AND user_id = $2
     ORDER BY is_pinned DESC, mention_count DESC`,
    [workspaceId, userId]
  )
}
```

---

## Phase 6: Memory Analytics & Insights

### Optional: Unused Memory Detection
```ts
// Cron job (daily)
// Identify memories not mentioned in 30+ days
export async function cleanupUnusedMemories() {
  await query(
    `DELETE FROM memories 
     WHERE last_mentioned_at < now() - interval '30 days'
     AND source = 'auto'
     AND mention_count < 3`
  )
}
```

### Memory Stats
```tsx
<div className="grid grid-cols-3 gap-4">
  <StatCard label="Total Memories" value={memories.length} />
  <StatCard label="Pinned" value={memories.filter(m => m.isPinned).length} />
  <StatCard label="Auto-Extracted" value={memories.filter(m => m.source === 'auto').length} />
</div>
```

---

## Phase 7: Testing

- [ ] Memory extraction triggers after assistant response
- [ ] Memory retrieval finds relevant memories
- [ ] Manual create/update/delete works
- [ ] Pinned memories always loaded
- [ ] Unused memories cleaned up
- [ ] Mention count incremented correctly
- [ ] Vektorsuche funktioniert

---

## Phase 8: Privacy & Governance

### Notes
- Memories sind **nicht** verschlüsselt (workspace-sichtbar)
- Nutzer können Memories jederzeit löschen
- Automatisch extrahierte Memories können als "Vorschlag" gekennzeichnet werden
- Optional: Explizites Opt-in für Auto-Extraction

---

## Dependencies
- Existierendes pgvector Setup (Phase 1 Agent-Implementierung)
- AI SDK für Memory-Extraktion (bereits da)

---

## Geschätzter Aufwand
- Datenbank-Schema: 1h
- Auto-Extraction Logic: 1–2h
- Memory-Retrieval Integration: 1h
- Manual Memory UI: 2–3h
- Server Actions: 1–2h
- Analytics (optional): 1h
- Testing: 1–2h
- **Total: ~8–12h**

## Risiken
- Memory-Storage-Bloat (sehr viele Memories = langsame Suche)
- False Memories ("Nutzer mag keine Sushi" wenn sie's einmal erwähnen)
- Privacy-Concerns (Nutzer weiß nicht, was der Agent "weiß")
- LLM-Halluzinationen bei Memory-Extraction (z.B. falsche Fakten)

---

## Optimierungen für späte Phasen
1. Memory-Kategorisierung verfeinern (Tags, Sub-Categories)
2. Memory-Sharing zwischen Workspaces (optional)
3. Memory-Import/Export (JSON)
4. Memory-Expiration (z.B. "Remember only until X date")
5. Conversational Memory-Editing ("Don't remember that", "That's not right")
