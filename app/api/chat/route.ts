import {
  convertToModelMessages,
  streamText,
  tool,
  ToolLoopAgent,
  createAgentUIStreamResponse,
  type UIMessage,
} from 'ai'
import { z } from 'zod'
import { getUserId, query } from '@/lib/db'
import { embedQuery, toVectorLiteral } from '@/lib/rag'
import { webSearchTool, getMCPToolsForWorkspace } from '@/lib/agent-tools'
import type { RetrievedSource } from '@/lib/types'

export const maxDuration = 60

const TOP_K = 6

function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== 'user') continue
    return (m.parts ?? [])
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join(' ')
      .trim()
  }
  return ''
}

export async function POST(req: Request) {
  const {
    messages,
    workspaceId,
    workspaceName = 'Workspace',
  }: {
    messages: UIMessage[]
    workspaceId: string
    workspaceName?: string
  } = await req.json()

  const userId = await getUserId()

  // Verify ownership of the workspace and get agent settings.
  const wsRows = await query<{
    id: string
    model: string
    temperature: number
    system_prompt: string
    agent_enabled: boolean
    web_search_enabled: boolean
  }>(
    `SELECT id, model, temperature, system_prompt, agent_enabled, web_search_enabled FROM workspaces WHERE id = $1 AND "userId" = $2`,
    [workspaceId, userId],
  )
  if (wsRows.length === 0) {
    return new Response('Workspace not found', { status: 404 })
  }

  const {
    model,
    temperature,
    system_prompt,
    agent_enabled,
    web_search_enabled,
  } = wsRows[0]

  const queryText = lastUserText(messages)

  // Retrieve the most relevant chunks via cosine similarity (pgvector).
  let sources: RetrievedSource[] = []
  if (queryText) {
    const vector = toVectorLiteral(await embedQuery(queryText))
    sources = await query<RetrievedSource>(
      `SELECT c.document_id AS "documentId",
              d.name AS "documentName",
              c.chunk_index AS "chunkIndex",
              c.content,
              1 - (c.embedding <=> $1::vector) AS score
       FROM document_chunks c
       JOIN documents d ON d.id = c.document_id
       WHERE c.workspace_id = $2
       ORDER BY c.embedding <=> $1::vector
       LIMIT $3`,
      [vector, workspaceId, TOP_K],
    )
  }

  const hasContext = sources.length > 0
  const contextBlock = sources
    .map(
      (s, i) =>
        `[${i + 1}] (from "${s.documentName}")\n${s.content}`,
    )
    .join('\n\n---\n\n')

  const system = [
    `You are OpenAfD, a private AI assistant answering questions inside the "${workspaceName}" workspace.`,
    system_prompt
      ? `\n\n=== WORKSPACE INSTRUCTIONS ===\n${system_prompt}\n=== END INSTRUCTIONS ===`
      : '',
    hasContext
      ? `Use the retrieved context below as your primary source of truth. Cite the bracketed source numbers (e.g. [1], [2]) when you rely on them. If the answer is not in the context, say so clearly before answering from general knowledge.`
      : `This workspace has no relevant documents for the question. Answer helpfully from general knowledge and let the user know they can upload documents to ground answers in their own data.`,
    hasContext
      ? `\n=== RETRIEVED CONTEXT ===\n${contextBlock}\n=== END CONTEXT ===`
      : '',
    `Be concise and accurate. Use Markdown when helpful.`,
  ]
    .filter(Boolean)
    .join('\n\n')

  // Persist the incoming user message before streaming.
  if (queryText) {
    await query(
      `INSERT INTO messages (workspace_id, "userId", role, content) VALUES ($1, $2, 'user', $3)`,
      [workspaceId, userId, queryText],
    )
  }

  // Build the tools object
  const toolsDef: Record<string, any> = {}

  // Add web search tool if enabled
  if (agent_enabled && web_search_enabled) {
    toolsDef.webSearch = webSearchTool
  }

  // TODO: Dynamically load MCP tools from mcp_servers table
  // const mcpServers = await query(...)
  // const mcpTools = getMCPToolsForWorkspace(mcpServers)
  // Object.assign(toolsDef, mcpTools)

  // If agents are enabled and we have tools, use ToolLoopAgent for multi-step execution
  if (agent_enabled && Object.keys(toolsDef).length > 0) {
    console.log('[v0] Using agent mode with tools:', Object.keys(toolsDef))

    const agent = new ToolLoopAgent({
      model,
      instructions: system,
      tools: toolsDef,
    })

    const result = await createAgentUIStreamResponse({
      agent,
      uiMessages: messages,
      onFinish: async ({ messages: finalMessages }) => {
        // Extract the final text from the last assistant message
        const lastMsg = finalMessages[finalMessages.length - 1]
        const textContent =
          lastMsg?.parts
            ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
            .map((p) => p.text)
            .join('') || ''

        if (textContent) {
          await query(
            `INSERT INTO messages (workspace_id, "userId", role, content, sources)
             VALUES ($1, $2, 'assistant', $3, $4)`,
            [
              workspaceId,
              userId,
              textContent,
              hasContext ? JSON.stringify(sources) : null,
            ],
          )
        }
      },
    })

    return result
  }

  // Fall back to standard RAG chat without tools
  console.log('[v0] Using standard RAG mode (agents disabled)')

  const result = streamText({
    model,
    system,
    temperature,
    messages: await convertToModelMessages(messages),
    onFinish: async ({ text }) => {
      await query(
        `INSERT INTO messages (workspace_id, "userId", role, content, sources)
         VALUES ($1, $2, 'assistant', $3, $4)`,
        [
          workspaceId,
          userId,
          text,
          hasContext ? JSON.stringify(sources) : null,
        ],
      )
    },
  })

  return result.toUIMessageStreamResponse()
}
