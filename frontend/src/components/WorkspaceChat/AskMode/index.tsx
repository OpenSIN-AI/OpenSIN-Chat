// SPDX-License-Identifier: MIT
import { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";

type AskResult = {
  answer: string;
  strategy: { term: string; instruction: string }[];
  subAnswers: { term: string; answer: string }[];
  sources: { title?: string; docpath?: string }[];
};

export default function AskMode({ workspace }: { workspace: any }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [expandedSub, setExpandedSub] = useState<number | null>(null);

  const submit = async () => {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setResult(null);
    const res = await Workspace.askDocuments(workspace.slug, q);
    setLoading(false);
    if (res?.error) {
      showToast(`Ask failed: ${res.error}`, "error", { clear: true });
      return;
    }
    setResult(res);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing &&
      e.keyCode !== 229
    ) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex flex-col gap-y-4 w-full max-w-3xl mx-auto p-4">
      <header>
        <h2 className="text-base font-semibold text-theme-text-primary">
          Ask Documents
        </h2>
        <p className="text-xs text-theme-text-secondary leading-relaxed">
          Your question is decomposed into targeted sub-queries, researched
          across all documents in this workspace, and synthesised into a final
          answer.
        </p>
      </header>

      <div className="flex items-end gap-x-2">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder="e.g. What are the key arguments in this document?"
          aria-label="Question for documents"
          className="flex-1 resize-none rounded-lg border border-theme-modal-border bg-theme-bg-primary px-3 py-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary focus:outline-none focus:ring-1 focus:ring-theme-sidebar-item-selected"
        />
        <button
          type="button"
          onClick={submit}
          disabled={loading || !question.trim()}
          className="flex items-center gap-x-1.5 rounded-lg bg-theme-sidebar-item-selected px-4 py-2.5 text-sm font-semibold text-theme-text-primary disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {loading ? (
            <CircleNotch size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <MagnifyingGlass size={16} weight="bold" aria-hidden="true" />
          )}
          Research
        </button>
      </div>

      {loading && (
        <p className="text-xs text-theme-text-secondary">
          Building search strategy and running sub-queries...
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-y-4">
          {/* Final Answer */}
          <section className="rounded-lg border border-theme-modal-border p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-theme-text-secondary mb-2">
              Answer
            </h3>
            <p className="text-sm text-theme-text-primary whitespace-pre-wrap leading-relaxed">
              {result.answer}
            </p>
          </section>

          {/* Sub-queries */}
          {result.subAnswers?.length > 0 && (
            <section className="rounded-lg border border-theme-modal-border p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-theme-text-secondary mb-2">
                Sub-queries ({result.subAnswers.length})
              </h3>
              <ul className="flex flex-col gap-y-1">
                {result.subAnswers.map((sub, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSub(expandedSub === i ? null : i)
                      }
                      aria-expanded={expandedSub === i}
                      className="flex w-full items-center gap-x-1.5 rounded-md px-2 py-1.5 text-left text-xs text-theme-text-primary hover:bg-theme-sidebar-item-hover transition-colors"
                    >
                      <CaretRight
                        size={12}
                        weight="bold"
                        aria-hidden="true"
                        className={`shrink-0 transition-transform ${
                          expandedSub === i ? "rotate-90" : ""
                        }`}
                      />
                      {sub.term}
                    </button>
                    {expandedSub === i && (
                      <p className="ml-6 mt-1 mb-2 text-xs text-theme-text-secondary whitespace-pre-wrap leading-relaxed">
                        {sub.answer}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Sources */}
          {result.sources?.length > 0 && (
            <section className="rounded-lg border border-theme-modal-border p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-theme-text-secondary mb-2">
                Sources ({result.sources.length})
              </h3>
              <ul className="flex flex-col gap-y-1">
                {result.sources.map((s, i) => (
                  <li
                    key={i}
                    className="text-xs text-theme-text-primary truncate"
                    title={s.title ?? s.docpath}
                  >
                    {i + 1}. {s.title ?? s.docpath ?? "Unknown source"}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
