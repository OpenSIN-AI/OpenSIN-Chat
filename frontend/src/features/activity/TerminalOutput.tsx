// SPDX-License-Identifier: MIT

interface TerminalOutputProps {
  command?: string;
  output?: string;
  error?: boolean;
}

export default function TerminalOutput({ command, output, error = false }: TerminalOutputProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-theme-border bg-zinc-950 text-zinc-200">
      {command && (
        <div className="border-b border-white/10 px-3 py-2 font-mono text-[11px] text-zinc-400">
          <span className="mr-2 text-zinc-600">$</span>
          {command}
        </div>
      )}

      {output && (
        <pre
          className={[
            "max-h-72 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-5",
            error ? "text-red-300" : "text-zinc-300",
          ].join(" ")}
        >
          {output}
        </pre>
      )}
    </div>
  );
}
