'use server'

import { getUserId, query } from '@/lib/db'
import {
  chunkText,
  embedTexts,
  extractText,
  scrapeUrl,
  toVectorLiteral,
} from '@/lib/rag'
import type {
  StoredMessage,
  Workspace,
  WorkspaceDocument,
} from '@/lib/types'

export async function listWorkspaces(): Promise<Workspace[]> {
  const userId = await getUserId()
  return query<Workspace>(
    `SELECT w.id,
            w.name,
            w.model,
            w.temperature,
            w.system_prompt AS "systemPrompt",
            w.agent_enabled AS "agentEnabled",
            w.web_search_enabled AS "webSearchEnabled",
            w.created_at AS "createdAt",
            COUNT(d.id)::int AS "documentCount"
     FROM workspaces w
     LEFT JOIN documents d ON d.workspace_id = w.id
     WHERE w."userId" = $1
     GROUP BY w.id
     ORDER BY w.created_at ASC`,
    [userId],
  )
}

export async function createWorkspace(name: string): Promise<Workspace> {
  const userId = await getUserId()
  const trimmed = name.trim() || 'New Workspace'
  const rows = await query<{ id: string; createdAt: string }>(
    `INSERT INTO workspaces ("userId", name) VALUES ($1, $2)
     RETURNING id, created_at AS "createdAt"`,
    [userId, trimmed],
  )
  return {
    id: rows[0].id,
    name: trimmed,
    documentCount: 0,
    createdAt: rows[0].createdAt,
  }
}

export async function deleteWorkspace(id: string): Promise<void> {
  const userId = await getUserId()
  // Ensure ownership, then cascade-delete dependent rows.
  const owned = await query(
    `SELECT id FROM workspaces WHERE id = $1 AND "userId" = $2`,
    [id, userId],
  )
  if (owned.length === 0) return
  await query(`DELETE FROM document_chunks WHERE workspace_id = $1`, [id])
  await query(`DELETE FROM documents WHERE workspace_id = $1`, [id])
  await query(`DELETE FROM messages WHERE workspace_id = $1`, [id])
  await query(`DELETE FROM workspaces WHERE id = $1`, [id])
}

export async function listDocuments(
  workspaceId: string,
): Promise<WorkspaceDocument[]> {
  const userId = await getUserId()
  return query<WorkspaceDocument>(
    `SELECT id, name, type, size, char_count AS "charCount", status,
            created_at AS "createdAt"
     FROM documents
     WHERE workspace_id = $1 AND "userId" = $2
     ORDER BY created_at DESC`,
    [workspaceId, userId],
  )
}

/**
 * Ingest a document: extract text, chunk it, embed each chunk, and store the
 * vectors for retrieval. Accepts either an uploaded file or pasted text.
 */
export async function ingestDocument(formData: FormData): Promise<void> {
  const userId = await getUserId()
  const workspaceId = String(formData.get('workspaceId') || '')
  if (!workspaceId) throw new Error('Missing workspace')

  // Confirm the workspace belongs to this user.
  const owned = await query(
    `SELECT id FROM workspaces WHERE id = $1 AND "userId" = $2`,
    [workspaceId, userId],
  )
  if (owned.length === 0) throw new Error('Workspace not found')

  let name: string
  let type: string
  let size: number
  let text: string

  const file = formData.get('file')
  if (file && file instanceof File && file.size > 0) {
    name = file.name
    type = file.type || 'application/octet-stream'
    size = file.size
    const buffer = Buffer.from(await file.arrayBuffer())
    text = await extractText(buffer, file.name, type)
  } else {
    const pasted = String(formData.get('content') || '')
    name = String(formData.get('title') || 'Pasted text')
    if (!name.toLowerCase().endsWith('.txt')) name = `${name}.txt`
    type = 'text/plain'
    size = Buffer.byteLength(pasted, 'utf-8')
    text = pasted.trim()
  }

  if (!text) throw new Error('No readable text found in the document')

  const chunks = chunkText(text)
  const docRows = await query<{ id: string }>(
    `INSERT INTO documents (workspace_id, "userId", name, type, size, char_count, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'processing')
     RETURNING id`,
    [workspaceId, userId, name, type, size, text.length],
  )
  const documentId = docRows[0].id

  try {
    const embeddings = await embedTexts(chunks)
    for (let i = 0; i < chunks.length; i++) {
      await query(
        `INSERT INTO document_chunks (document_id, workspace_id, chunk_index, content, embedding)
         VALUES ($1, $2, $3, $4, $5::vector)`,
        [documentId, workspaceId, i, chunks[i], toVectorLiteral(embeddings[i])],
      )
    }
    await query(`UPDATE documents SET status = 'ready' WHERE id = $1`, [
      documentId,
    ])
  } catch (err) {
    await query(`UPDATE documents SET status = 'failed' WHERE id = $1`, [
      documentId,
    ])
    throw err
  }
}

export async function deleteDocument(id: string): Promise<void> {
  const userId = await getUserId()
  const owned = await query(
    `SELECT id FROM documents WHERE id = $1 AND "userId" = $2`,
    [id, userId],
  )
  if (owned.length === 0) return
  await query(`DELETE FROM document_chunks WHERE document_id = $1`, [id])
  await query(`DELETE FROM documents WHERE id = $1`, [id])
}

export async function listMessages(
  workspaceId: string,
): Promise<StoredMessage[]> {
  const userId = await getUserId()
  return query<StoredMessage>(
    `SELECT id, role, content, sources, created_at AS "createdAt"
     FROM messages
     WHERE workspace_id = $1 AND "userId" = $2
     ORDER BY created_at ASC`,
    [workspaceId, userId],
  )
}

export async function clearMessages(workspaceId: string): Promise<void> {
  const userId = await getUserId()
  await query(
    `DELETE FROM messages WHERE workspace_id = $1 AND "userId" = $2`,
    [workspaceId, userId],
  )
}

export async function updateWorkspaceSettings(
  workspaceId: string,
  model: string,
  temperature: number,
  systemPrompt: string,
): Promise<void> {
  const userId = await getUserId()
  const owned = await query(
    `SELECT id FROM workspaces WHERE id = $1 AND "userId" = $2`,
    [workspaceId, userId],
  )
  if (owned.length === 0) throw new Error('Workspace not found')

  await query(
    `UPDATE workspaces SET model = $1, temperature = $2, system_prompt = $3 WHERE id = $4`,
    [model, Math.max(0, Math.min(2, temperature)), systemPrompt, workspaceId],
  )
}

export async function updateWorkspaceAgentSettings(
  workspaceId: string,
  agentEnabled: boolean,
  webSearchEnabled: boolean,
): Promise<void> {
  const userId = await getUserId()
  const owned = await query(
    `SELECT id FROM workspaces WHERE id = $1 AND "userId" = $2`,
    [workspaceId, userId],
  )
  if (owned.length === 0) throw new Error('Workspace not found')

  await query(
    `UPDATE workspaces SET agent_enabled = $1, web_search_enabled = $2 WHERE id = $3`,
    [agentEnabled, webSearchEnabled, workspaceId],
  )
}

export async function addDocumentFromUrl(
  workspaceId: string,
  name: string,
  url: string,
): Promise<void> {
  const userId = await getUserId()

  // Verify workspace ownership
  const owned = await query(
    `SELECT id FROM workspaces WHERE id = $1 AND "userId" = $2`,
    [workspaceId, userId],
  )
  if (owned.length === 0) throw new Error('Workspace not found')

  // Scrape the URL
  const text = await scrapeUrl(url)
  if (!text) throw new Error('No content found at this URL')

  // Use the hostname as default name if not provided
  const docName = name || new URL(url).hostname

  // Create document record and ingest
  const chunks = chunkText(text)
  const docRows = await query<{ id: string }>(
    `INSERT INTO documents (workspace_id, "userId", name, type, size, char_count, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'processing')
     RETURNING id`,
    [workspaceId, userId, docName, 'text/html', 0, text.length],
  )
  const documentId = docRows[0].id

  try {
    const embeddings = await embedTexts(chunks)
    for (let i = 0; i < chunks.length; i++) {
      await query(
        `INSERT INTO document_chunks (document_id, workspace_id, chunk_index, content, embedding)
         VALUES ($1, $2, $3, $4, $5::vector)`,
        [documentId, workspaceId, i, chunks[i], toVectorLiteral(embeddings[i])],
      )
    }
    await query(`UPDATE documents SET status = 'ready' WHERE id = $1`, [
      documentId,
    ])
  } catch (err) {
    await query(`UPDATE documents SET status = 'failed' WHERE id = $1`, [
      documentId,
    ])
    throw err
  }
}
