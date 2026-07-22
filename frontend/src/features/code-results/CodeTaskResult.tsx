// SPDX-License-Identifier: MIT

import { CheckCircle, FileCode, Terminal, WarningCircle } from "@phosphor-icons/react";
import type { CodeTaskOutput } from "./types";

interface CodeTaskResultProps {
  outputs?: CodeTaskOutput[];
}

function FileChange({ output }: { output: CodeTaskOutput }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-theme-bg-secondary">
      <FileCode size={15} className="shrink-0 text-theme-text-secondary" />
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-theme-text-primary">
        {output.path || output.title}
      </span>
      {!!output.additions && <span className="text-[11px] text-emerald-500">+{output.additions}</span>}
      {!!output.deletions && <span className="text-[11px] text-red-400">−{output.deletions}</span>}
    </div>
  );
}

function DiffBlock({ content }: { content?: string }) {
  if (!content) return null;
  return (
    <pre className="max-h-[520px] overflow-auto rounded-xl border border-theme-border bg-zinc-950 p-3 font-mono text-[11px] leading-5 text-zinc-300">
      {content}
    </pre>
  );
}

function TerminalBlock({ output }: { output: CodeTaskOutput }) {
  return (
    <div className="overflow-hidden rounded-xl border border-theme-border bg-zinc-950">
      {output.command && (
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 font-mono text-[11px] text-zinc-400">
          <Terminal size={13} />
          {output.command}
        </div>
      )}
      {output.content && (
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap p-3 font-mono text-[11px] leading-5 text-zinc-300">
          {output.content}
        </pre>
      )}
    </div>
  );
}

export default function CodeTaskResult({ outputs = [] }: CodeTaskResultProps) {
  if (!outputs.length) return null;

  const task = outputs.find((o) => o.type === "task");
  const files = outputs.filter((o) => o.type === "file-change");
  const diffs = outputs.filter((o) => o.type === "diff");
  const terminals = outputs.filter((o) => o.type === "terminal" || o.type === "test-result");
  const summary = outputs.find((o) => o.type === "summary");

  return (
    <div className="flex flex-col gap-5">
      {task && (
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-theme-text-muted">Aufgabe</p>
          <h3 className="mt-1 text-sm font-medium text-theme-text-primary">{task.title || task.content}</h3>
        </section>
      )}

      {files.length > 0 && (
        <section>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-theme-text-muted">Geänderte Dateien</p>
          <div className="rounded-xl border border-theme-border p-1">
            {files.map((file, index) => (
              <FileChange key={file.path || index} output={file} />
            ))}
          </div>
        </section>
      )}

      {diffs.map((diff, index) => (
        <section key={`diff-${index}`}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-theme-text-muted">Diff</p>
          <DiffBlock content={diff.content} />
        </section>
      ))}

      {terminals.map((terminal, index) => (
        <section key={`terminal-${index}`}>
          <div className="mb-2 flex items-center gap-2">
            {terminal.status === "error" ? (
              <WarningCircle size={14} className="text-red-400" />
            ) : (
              <CheckCircle size={14} className="text-theme-text-secondary" />
            )}
            <p className="text-[10px] font-semibold uppercase tracking-wider text-theme-text-muted">
              {terminal.type === "test-result" ? "Prüfung" : "Terminal"}
            </p>
          </div>
          <TerminalBlock output={terminal} />
        </section>
      ))}

      {summary?.content && (
        <section>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-theme-text-muted">Zusammenfassung</p>
          <p className="text-sm leading-6 text-theme-text-primary">{summary.content}</p>
        </section>
      )}
    </div>
  );
}
