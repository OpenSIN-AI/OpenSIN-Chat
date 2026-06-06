'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { Boxes } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorkspaceSidebar } from '@/components/openafd-chat/workspace-sidebar'
import { ChatArea } from '@/components/openafd-chat/chat-area'
import { DocumentsDialog } from '@/components/openafd-chat/documents-dialog'
import {
  createWorkspace,
  deleteWorkspace,
  listWorkspaces,
} from '@/app/actions/workspaces'

export default function Page() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [docsOpen, setDocsOpen] = useState(false)

  const {
    data: workspaces = [],
    isLoading,
    mutate,
  } = useSWR('workspaces', () => listWorkspaces())

  // Keep a valid active workspace selected as data loads/changes.
  useEffect(() => {
    if (workspaces.length === 0) {
      setActiveId(null)
      return
    }
    if (!activeId || !workspaces.some((w) => w.id === activeId)) {
      setActiveId(workspaces[0].id)
    }
  }, [workspaces, activeId])

  const active = useMemo(
    () => workspaces.find((w) => w.id === activeId) ?? null,
    [workspaces, activeId],
  )

  async function handleCreate(name: string) {
    const ws = await createWorkspace(name)
    await mutate()
    setActiveId(ws.id)
  }

  async function handleDelete(id: string) {
    await deleteWorkspace(id)
    await mutate()
  }

  return (
    <main className="flex h-dvh w-full overflow-hidden">
      <WorkspaceSidebar
        workspaces={workspaces}
        activeId={activeId}
        loading={isLoading}
        onSelect={setActiveId}
        onCreate={handleCreate}
        onDelete={handleDelete}
      />

      {active ? (
        <ChatArea
          key={active.id}
          workspace={active}
          onOpenDocuments={() => setDocsOpen(true)}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background text-center">
          <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Boxes className="size-7" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {isLoading ? 'Loading workspaces…' : 'No workspace selected'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a workspace to start chatting with your documents.
            </p>
          </div>
          {!isLoading && (
            <Button onClick={() => handleCreate('General')}>
              Create workspace
            </Button>
          )}
        </div>
      )}

      {active && (
        <DocumentsDialog
          open={docsOpen}
          onOpenChange={setDocsOpen}
          workspace={active}
          onDocumentsChanged={() => mutate()}
        />
      )}
    </main>
  )
}
