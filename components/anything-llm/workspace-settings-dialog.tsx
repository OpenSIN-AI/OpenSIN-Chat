'use client'

import { useState, useEffect } from 'react'
import { Settings, X, Plus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  updateWorkspaceSettings,
  updateWorkspaceAgentSettings,
} from '@/app/actions/workspaces'
import type { Workspace } from '@/lib/types'

const MODELS = [
  'openai/gpt-4o-mini',
  'openai/gpt-4o',
  'openai/gpt-4-turbo',
  'anthropic/claude-opus-4.6',
  'anthropic/claude-sonnet-4.6',
  'google/gemini-3-flash',
  'google/gemini-3.5-sonnet',
]

export function WorkspaceSettingsDialog({
  workspace,
  onSettingsChanged,
}: {
  workspace: Workspace
  onSettingsChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [model, setModel] = useState(workspace.model || 'openai/gpt-4o-mini')
  const [temperature, setTemperature] = useState(
    workspace.temperature ?? 0.7,
  )
  const [systemPrompt, setSystemPrompt] = useState(
    workspace.systemPrompt || '',
  )
  const [agentEnabled, setAgentEnabled] = useState(
    workspace.agentEnabled ?? false,
  )
  const [webSearchEnabled, setWebSearchEnabled] = useState(
    workspace.webSearchEnabled ?? false,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setModel(workspace.model || 'openai/gpt-4o-mini')
      setTemperature(workspace.temperature ?? 0.7)
      setSystemPrompt(workspace.systemPrompt || '')
      setAgentEnabled(workspace.agentEnabled ?? false)
      setWebSearchEnabled(workspace.webSearchEnabled ?? false)
      setError(null)
    }
  }, [open, workspace])

  async function handleSave() {
    setBusy(true)
    setError(null)
    try {
      await updateWorkspaceSettings(
        workspace.id,
        model,
        temperature,
        systemPrompt,
      )
      await updateWorkspaceAgentSettings(
        workspace.id,
        agentEnabled,
        webSearchEnabled,
      )
      setOpen(false)
      onSettingsChanged()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="inline-flex">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg p-1.5 hover:bg-muted transition-colors"
            title="Workspace settings"
          >
            <Settings className="size-5" />
          </button>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings — {workspace.name}</DialogTitle>
          <DialogDescription>
            Configure the AI model and behavior for this workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide">
              Model
            </Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide">
              Temperature
            </Label>
            <div className="mt-2 flex items-center gap-3">
              <Slider
                value={[temperature]}
                onValueChange={([v]) => setTemperature(v)}
                min={0}
                max={2}
                step={0.1}
                className="flex-1"
              />
              <span className="w-8 text-right text-sm font-mono text-muted-foreground">
                {temperature.toFixed(1)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Lower = deterministic, Higher = creative
            </p>
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide">
              System Prompt
            </Label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Custom instructions for this workspace…"
              className="mt-1 min-h-24 resize-none"
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3">
              AI Agents
            </h3>

            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                id="agent-enabled"
                checked={agentEnabled}
                onChange={(e) => setAgentEnabled(e.target.checked)}
                className="size-4 rounded"
              />
              <label
                htmlFor="agent-enabled"
                className="text-sm font-medium cursor-pointer"
              >
                Enable Agents
              </label>
              <span className="text-xs text-muted-foreground">
                (Tool-calling, web search, MCP)
              </span>
            </div>

            {agentEnabled && (
              <div className="ml-4 flex items-center gap-3 p-2 bg-muted rounded">
                <input
                  type="checkbox"
                  id="web-search-enabled"
                  checked={webSearchEnabled}
                  onChange={(e) => setWebSearchEnabled(e.target.checked)}
                  className="size-4 rounded"
                />
                <label
                  htmlFor="web-search-enabled"
                  className="text-sm font-medium cursor-pointer"
                >
                  Web Search
                </label>
                <span className="text-xs text-muted-foreground">
                  (Requires TAVILY_API_KEY)
                </span>
              </div>
            )}

            {agentEnabled && (
              <p className="mt-2 text-xs text-muted-foreground">
                When enabled, the agent can use tools to search the web and
                access MCP servers configured below. You can manage MCP servers
                in a future update.
              </p>
            )}
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <X className="size-3.5" /> {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
