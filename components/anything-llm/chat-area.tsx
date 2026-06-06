'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { FileText, FolderOpen, Sparkles, Quote } from 'lucide-react'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import {
  Message,
  MessageContent,
} from '@/components/ai-elements/message'
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MarkdownMessage } from '@/components/anything-llm/markdown-message'
import { WorkspaceSettingsDialog } from '@/components/anything-llm/workspace-settings-dialog'
import { listMessages } from '@/app/actions/workspaces'
import type { RetrievedSource, Workspace } from '@/lib/types'

interface ChatAreaProps {
  workspace: Workspace
  onOpenDocuments: () => void
}

const SUGGESTIONS = [
  'Summarize the documents in this workspace',
  'What are the key takeaways?',
  'List any action items you can find',
]

export function ChatArea({ workspace, onOpenDocuments }: ChatAreaProps) {
  // Load persisted chat history before mounting the chat hook.
  const { data: stored, isLoading } = useSWR(
    ['messages', workspace.id],
    () => listMessages(workspace.id),
  )

  if (isLoading || !stored) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading conversation…</p>
      </div>
    )
  }

  const initialMessages: UIMessage[] = stored.map((m) => ({
    id: m.id,
    role: m.role,
    parts: [{ type: 'text', text: m.content }],
  }))

  const sourcesById = new Map<string, RetrievedSource[]>()
  for (const m of stored) {
    if (m.role === 'assistant' && m.sources?.length) {
      sourcesById.set(m.id, m.sources)
    }
  }

  return (
    <ChatPanel
      key={workspace.id}
      workspace={workspace}
      initialMessages={initialMessages}
      historicalSources={sourcesById}
      onOpenDocuments={onOpenDocuments}
    />
  )
}

function ChatPanel({
  workspace,
  initialMessages,
  historicalSources,
  onOpenDocuments,
}: {
  workspace: Workspace
  initialMessages: UIMessage[]
  historicalSources: Map<string, RetrievedSource[]>
  onOpenDocuments: () => void
}) {
  const [input, setInput] = useState('')

  const { messages, sendMessage, status } = useChat({
    id: workspace.id,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          messages,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        },
      }),
    }),
  })

  function send(text: string) {
    if (!text.trim()) return
    sendMessage({ text })
    setInput('')
  }

  function handleSubmit(message: PromptInputMessage) {
    send(message.text ?? '')
  }

  const docCount = workspace.documentCount

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3.5">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-foreground">
            {workspace.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            {docCount > 0
              ? `Retrieving from ${docCount} ${docCount === 1 ? 'document' : 'documents'}`
              : 'No documents — answering from general knowledge'}
          </p>
        </div>
        <div className="flex gap-2">
          <WorkspaceSettingsDialog
            workspace={workspace}
            onSettingsChanged={() => {
              // Refetch workspace + message state after settings change
              // This will trigger a re-render with updated model/temperature/system_prompt
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent"
            onClick={onOpenDocuments}
          >
            <FolderOpen className="size-4" />
            Documents
            {docCount > 0 && (
              <Badge variant="secondary" className="ml-0.5 px-1.5">
                {docCount}
              </Badge>
            )}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <Conversation className="flex-1">
          <ConversationContent className="mx-auto w-full max-w-3xl">
            {messages.length === 0 ? (
              <ConversationEmptyState
                className="h-full"
                icon={<Sparkles className="size-10 text-primary" />}
                title={`Chat with ${workspace.name}`}
                description={
                  docCount > 0
                    ? 'Ask anything about your uploaded documents.'
                    : 'Upload documents, then ask questions grounded in your own data.'
                }
              >
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {docCount === 0 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-transparent"
                      onClick={onOpenDocuments}
                    >
                      <FileText className="size-4" />
                      Add your first document
                    </Button>
                  ) : (
                    SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))
                  )}
                </div>
              </ConversationEmptyState>
            ) : (
              messages.map((message) => {
                const sources = historicalSources.get(message.id)
                return (
                  <Message from={message.role} key={message.id}>
                    <MessageContent>
                      {message.parts.map((part, i) => {
                        if (part.type === 'text') {
                          return (
                            <MarkdownMessage
                              key={`${message.id}-${i}`}
                              content={part.text}
                              className={
                                message.role === 'user'
                                  ? 'prose-p:text-primary-foreground prose-strong:text-primary-foreground prose-headings:text-primary-foreground prose-code:text-primary-foreground prose-a:text-primary-foreground'
                                  : undefined
                              }
                            />
                          )
                        }
                        return null
                      })}
                      {sources && sources.length > 0 && (
                        <SourceList sources={sources} />
                      )}
                    </MessageContent>
                  </Message>
                )
              })
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="px-4 pb-4">
          <PromptInput
            onSubmit={handleSubmit}
            className="mx-auto w-full max-w-3xl"
          >
            <PromptInputBody>
              <PromptInputTextarea
                value={input}
                onChange={(e) => setInput(e.currentTarget.value)}
                placeholder={`Message ${workspace.name}…`}
              />
            </PromptInputBody>
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit
                status={status}
                disabled={!input.trim() && status !== 'streaming'}
              />
            </PromptInputFooter>
          </PromptInput>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">
            Answers are retrieved from this workspace&apos;s embedded documents.
          </p>
        </div>
      </div>
    </div>
  )
}

function SourceList({ sources }: { sources: RetrievedSource[] }) {
  return (
    <div className="mt-3 border-t border-border/60 pt-2.5">
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Quote className="size-3" />
        Sources
      </p>
      <div className="flex flex-col gap-1.5">
        {sources.map((s, i) => (
          <div
            key={`${s.documentId}-${s.chunkIndex}`}
            className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-medium text-foreground">
                [{i + 1}] {s.documentName}
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {Math.round(s.score * 100)}% match
              </span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
              {s.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
