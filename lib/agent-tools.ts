// SPDX-License-Identifier: MIT
import { tool } from 'ai'
import { z } from 'zod'

const TAVILY_API_KEY = process.env.TAVILY_API_KEY

/**
 * Web search tool using Tavily API
 * Requires TAVILY_API_KEY environment variable
 */
export const webSearchTool = tool({
  description:
    'Search the web for real-time information. Use when you need current data, news, or information not in your training data.',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(5)
      .describe('Maximum number of results to return'),
  }),
  execute: async ({ query, maxResults }) => {
    if (!TAVILY_API_KEY) {
      return 'Web search is not configured. Set TAVILY_API_KEY to enable web search.'
    }

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: TAVILY_API_KEY,
          query,
          max_results: maxResults,
          include_answer: true,
          include_raw_content: false,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        return `Web search error: ${response.status} - ${error}`
      }

      const data = (await response.json()) as {
        answer?: string
        results?: Array<{
          title: string
          url: string
          content: string
        }>
      }

      if (!data.results || data.results.length === 0) {
        return 'No search results found.'
      }

      const formatted = [data.answer ? `**Answer:** ${data.answer}\n` : '']
        .concat(
          data.results.map(
            (r) => `**${r.title}** (${r.url})\n${r.content}`,
          ),
        )
        .filter(Boolean)
        .join('\n\n')

      return formatted
    } catch (error) {
      return `Web search failed: ${error instanceof Error ? error.message : String(error)}`
    }
  },
})

/**
 * Simple MCP tool registry
 * In production, you'd dynamically load these from your mcp_servers table
 */
export function getMCPToolsForWorkspace(
  mcpServers: Array<{ name: string; url: string; enabled: boolean }>,
): Record<string, any> {
  // Placeholder: in production, use @ai-sdk/mcp to dynamically create tools
  // from the enabled MCP servers in the workspace
  const tools: Record<string, any> = {}

  for (const server of mcpServers) {
    if (!server.enabled) continue
    // TODO: Implement dynamic MCP tool loading via @ai-sdk/mcp
    // Example:
    // const client = await createMCPClient(...)
    // const serverTools = await client.getTools()
    // Merge into tools object
  }

  return tools
}
