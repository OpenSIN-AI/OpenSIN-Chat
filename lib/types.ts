export interface Workspace {
  id: string
  name: string
  model?: string
  temperature?: number
  systemPrompt?: string
  agentEnabled?: boolean
  webSearchEnabled?: boolean
  documentCount: number
  createdAt: string
}

export interface WorkspaceDocument {
  id: string
  name: string
  type: string
  size: number
  charCount: number
  status: string
  createdAt: string
}

export interface RetrievedSource {
  documentId: string
  documentName: string
  chunkIndex: number
  content: string
  score: number
}

export interface StoredMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: RetrievedSource[] | null
  createdAt: string
}
