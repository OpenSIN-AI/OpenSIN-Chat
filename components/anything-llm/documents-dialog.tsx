'use client'

import { useRef, useState } from 'react'
import useSWR from 'swr'
import { FileText, Trash2, Upload, Type, X, Loader2, Globe } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  deleteDocument,
  ingestDocument,
  listDocuments,
  addDocumentFromUrl,
} from '@/app/actions/workspaces'
import type { Workspace } from '@/lib/types'

const ACCEPTED =
  '.txt,.md,.markdown,.csv,.json,.log,.html,.xml,.yaml,.yml,.pdf,.docx,.doc'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface DocumentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspace: Workspace
  onDocumentsChanged: () => void
}

export function DocumentsDialog({
  open,
  onOpenChange,
  workspace,
  onDocumentsChanged,
}: DocumentsDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pasteMode, setPasteMode] = useState(false)
  const [urlMode, setUrlMode] = useState(false)
  const [pasteTitle, setPasteTitle] = useState('')
  const [pasteContent, setPasteContent] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const {
    data: documents = [],
    isLoading,
    mutate,
  } = useSWR(open ? ['documents', workspace.id] : null, () =>
    listDocuments(workspace.id),
  )

  async function refresh() {
    await mutate()
    onDocumentsChanged()
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    setBusy(true)
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('workspaceId', workspace.id)
        fd.append('file', file)
        try {
          await ingestDocument(fd)
        } catch {
          setError(
            `Could not process "${file.name}". Try a text or PDF file.`,
          )
        }
      }
      await refresh()
    } finally {
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function savePasted() {
    const content = pasteContent.trim()
    if (!content) return
    setBusy(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('workspaceId', workspace.id)
      fd.append('title', pasteTitle.trim() || 'Pasted text')
      fd.append('content', content)
      await ingestDocument(fd)
      setPasteTitle('')
      setPasteContent('')
      setPasteMode(false)
      await refresh()
    } catch {
      setError('Could not save the pasted text.')
    } finally {
      setBusy(false)
    }
  }

  async function saveUrl() {
    const url = urlInput.trim()
    if (!url) return
    setBusy(true)
    setError(null)
    try {
      await addDocumentFromUrl(workspace.id, '', url)
      setUrlInput('')
      setUrlMode(false)
      await refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`Could not import URL: ${msg}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(id: string) {
    await deleteDocument(id)
    await refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Documents — {workspace.name}</DialogTitle>
          <DialogDescription>
            Uploaded files are split into chunks, embedded, and stored for
            semantic retrieval. PDF, DOCX, and plain text files are supported.
          </DialogDescription>
        </DialogHeader>

        {pasteMode ? (
          <div className="flex flex-col gap-3">
            <Input
              value={pasteTitle}
              onChange={(e) => setPasteTitle(e.target.value)}
              placeholder="Document title"
            />
            <Textarea
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder="Paste your text here…"
              className="min-h-44 resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setPasteMode(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button onClick={savePasted} disabled={!pasteContent.trim() || busy}>
                {busy ? 'Embedding…' : 'Add document'}
              </Button>
            </div>
          </div>
        ) : urlMode ? (
          <div className="flex flex-col gap-3">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com"
              type="url"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setUrlMode(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button onClick={saveUrl} disabled={!urlInput.trim() || busy}>
                {busy ? 'Scraping…' : 'Import URL'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center transition hover:border-primary/50 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="size-6 animate-spin text-primary" />
                ) : (
                  <Upload className="size-6 text-primary" />
                )}
                <span className="text-sm font-medium text-foreground">
                  {busy ? 'Processing…' : 'Upload files'}
                </span>
                <span className="text-xs text-muted-foreground">
                  PDF, DOCX, TXT and more
                </span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setPasteMode(true)}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center transition hover:border-primary/50 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Type className="size-6 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Paste text
                </span>
                <span className="text-xs text-muted-foreground">
                  Add raw content directly
                </span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setUrlMode(true)}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center transition hover:border-primary/50 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Globe className="size-6 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Import URL
                </span>
                <span className="text-xs text-muted-foreground">
                  Scrape web content
                </span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <X className="size-3.5" /> {error}
          </p>
        )}

        <div className="mt-1">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            In this workspace ({documents.length})
          </p>
          {isLoading ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              Loading documents…
            </p>
          ) : documents.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              No documents added yet.
            </p>
          ) : (
            <ScrollArea className="max-h-56">
              <div className="flex flex-col gap-1.5 pr-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
                  >
                    <FileText className="size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {doc.name}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatSize(doc.size)}</span>
                        <span>·</span>
                        <span>{doc.charCount.toLocaleString()} chars</span>
                        {doc.status !== 'ready' && (
                          <>
                            <span>·</span>
                            <span className="capitalize text-amber-400">
                              {doc.status}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${doc.name}`}
                      onClick={() => handleRemove(doc.id)}
                      className="rounded p-1.5 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
