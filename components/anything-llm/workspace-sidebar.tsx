'use client'

import { useState } from 'react'
import { Plus, MessagesSquare, Trash2, FileText, Boxes } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { Workspace } from '@/lib/types'

interface WorkspaceSidebarProps {
  workspaces: Workspace[]
  activeId: string | null
  loading?: boolean
  onSelect: (id: string) => void
  onCreate: (name: string) => void | Promise<void>
  onDelete: (id: string) => void | Promise<void>
}

export function WorkspaceSidebar({
  workspaces,
  activeId,
  loading = false,
  onSelect,
  onCreate,
  onDelete,
}: WorkspaceSidebarProps) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    try {
      await onCreate(trimmed)
      setName('')
      setCreating(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2.5 px-5 py-4">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Boxes className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-sidebar-foreground">
            OpenAfD
          </p>
          <p className="text-[11px] text-muted-foreground">Private AI workspace</p>
        </div>
      </div>

      <div className="px-3 pb-2">
        {creating ? (
          <div className="flex flex-col gap-2 rounded-lg border border-sidebar-border bg-background/40 p-2">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Workspace name"
              className="h-8 bg-background"
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
                if (e.key === 'Escape') {
                  setCreating(false)
                  setName('')
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 flex-1"
                onClick={submit}
                disabled={busy}
              >
                {busy ? 'Creating…' : 'Create'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={() => {
                  setCreating(false)
                  setName('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full justify-start gap-2 border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setCreating(true)}
          >
            <Plus className="size-4" />
            New Workspace
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="flex flex-col gap-1 pb-4 pt-1">
          {loading && workspaces.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              Loading…
            </p>
          )}
          {!loading && workspaces.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              No workspaces yet. Create one to get started.
            </p>
          )}
          {workspaces.map((ws) => {
            const active = ws.id === activeId
            return (
              <div
                key={ws.id}
                className={cn(
                  'group flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                )}
                onClick={() => onSelect(ws.id)}
              >
                <MessagesSquare
                  className={cn(
                    'size-4 shrink-0',
                    active ? 'text-primary' : 'text-muted-foreground',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{ws.name}</p>
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <FileText className="size-3" />
                    {ws.documentCount}{' '}
                    {ws.documentCount === 1 ? 'document' : 'documents'}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Delete ${ws.name}`}
                  className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(ws.id)
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      <div className="border-t border-sidebar-border px-5 py-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Documents are embedded and stored in your Neon database for grounded,
          persistent retrieval.
        </p>
      </div>
    </aside>
  )
}
