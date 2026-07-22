// SPDX-License-Identifier: MIT
// Purpose: In-app modal to file a GitHub feedback issue without leaving the app.
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import ModalWrapper from "@/components/ModalWrapper";
import System from "@/models/system";
import showToast from "@/utils/toast";
import paths from "@/utils/paths";

const LABEL_OPTIONS = [
  { id: "feedback", key: "feedbackModal.label_feedback" },
  { id: "bug", key: "feedbackModal.label_bug" },
  { id: "enhancement", key: "feedbackModal.label_enhancement" },
  { id: "question", key: "feedbackModal.label_question" },
] as const;

type FeedbackIssueModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function FeedbackIssueModal({
  isOpen,
  onClose,
}: FeedbackIssueModalProps) {
  const { t } = useTranslation();
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [labels, setLabels] = useState<string[]>(["feedback"]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [repo, setRepo] = useState("OpenSIN-AI/OpenSIN-Chat");
  const [configured, setConfigured] = useState(true);
  const [fallbackUrl, setFallbackUrl] = useState(
    `${paths.github()}/issues/new`,
  );
  const [created, setCreated] = useState<{
    number: number;
    url: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitle("");
    setBody("");
    setLabels(["feedback"]);
    setError("");
    setCreated(null);
    setSubmitting(false);

    let cancelled = false;
    System.feedbackConfig()
      .then((cfg) => {
        if (cancelled || !cfg) return;
        if (cfg.repo) setRepo(cfg.repo);
        if (typeof cfg.configured === "boolean") setConfigured(cfg.configured);
        if (cfg.githubNewIssueUrl) setFallbackUrl(cfg.githubNewIssueUrl);
      })
      .catch(() => {
        /* keep defaults */
      });

    // Focus title after open
    const tId = window.setTimeout(() => titleRef.current?.focus(), 50);
    return () => {
      cancelled = true;
      window.clearTimeout(tId);
    };
  }, [isOpen]);

  function toggleLabel(id: string) {
    setLabels((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((l) => l !== id);
        return next.length === 0 ? ["feedback"] : next;
      }
      return [...prev, id];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const trimmed = title.trim();
    if (trimmed.length < 3) {
      setError(t("feedbackModal.titleTooShort"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const result = await System.createFeedbackIssue({
        title: trimmed,
        body: body.trim(),
        labels,
        pageUrl: window.location.href,
      });

      if (!result.success) {
        if (result.githubNewIssueUrl) setFallbackUrl(result.githubNewIssueUrl);
        setError(result.error || t("feedbackModal.createFailed"));
        setSubmitting(false);
        return;
      }

      setCreated({
        number: result.issue!.number,
        url: result.issue!.url,
        title: result.issue!.title,
      });
      showToast(
        t("feedbackModal.createSuccess", { number: result.issue!.number }),
        "success",
      );
    } catch (err: any) {
      setError(err?.message || t("feedbackModal.createFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <ModalWrapper
      isOpen={isOpen}
      closeModal={onClose}
      ariaLabel={t("feedbackModal.title")}
    >
      <div className="relative w-[min(520px,calc(100vw-24px))] max-h-[min(90vh,720px)] overflow-y-auto no-scroll rounded-xl border border-theme-modal-border bg-theme-bg-secondary light:bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-theme-modal-border">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-theme-text-primary">
              {t("feedbackModal.title")}
            </h2>
            <p className="text-xs text-theme-text-secondary mt-0.5 truncate">
              {t("feedbackModal.filingIn", { repo })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close", "Close")}
            className="border-none bg-transparent p-1 rounded-md text-theme-text-secondary hover:text-theme-text-primary hover:bg-white/5 light:hover:bg-zinc-100 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {created ? (
          <div className="px-5 py-6 flex flex-col gap-4">
            <p className="text-sm text-theme-text-primary">
              {t("feedbackModal.createdMessage", {
                number: created.number,
                title: created.title,
              })}
            </p>
            <div className="flex items-center justify-end gap-2">
              <a
                href={created.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-theme-modal-border text-theme-text-primary hover:bg-white/5 light:hover:bg-zinc-50 no-underline"
              >
                {t("feedbackModal.viewOnGithub")}
                <ArrowSquareOut size={14} />
              </a>
              <button
                type="button"
                onClick={onClose}
                className="border-none px-3 py-2 text-sm rounded-lg bg-primary-button text-theme-text-primary hover:opacity-90 cursor-pointer"
              >
                {t("common.done", "Done")}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="px-5 py-4 flex flex-col gap-4">
              {/* Project / repo (read-only, like the Orca/GitHub popup) */}
              <div>
                <label className="block text-xs font-medium text-theme-text-secondary mb-1.5">
                  {t("feedbackModal.project")}
                </label>
                <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-theme-modal-border bg-theme-bg-primary light:bg-zinc-50 text-sm text-theme-text-primary">
                  <span className="truncate flex-1">{repo}</span>
                </div>
              </div>

              {/* Title */}
              <div>
                <label
                  htmlFor="feedback-issue-title"
                  className="block text-xs font-medium text-theme-text-secondary mb-1.5"
                >
                  {t("feedbackModal.titleLabel")}
                </label>
                <input
                  ref={titleRef}
                  id="feedback-issue-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("feedbackModal.titlePlaceholder")}
                  maxLength={200}
                  required
                  disabled={submitting}
                  className="w-full h-9 px-3 rounded-lg border border-theme-modal-border bg-theme-bg-primary light:bg-white text-sm text-theme-text-primary placeholder:text-theme-text-secondary outline-none focus:ring-2 focus:ring-blue-400/40"
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="feedback-issue-body"
                  className="block text-xs font-medium text-theme-text-secondary mb-1.5"
                >
                  {t("feedbackModal.descriptionLabel")}
                </label>
                <textarea
                  id="feedback-issue-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={t("feedbackModal.descriptionPlaceholder")}
                  rows={6}
                  maxLength={12000}
                  disabled={submitting}
                  className="w-full px-3 py-2 rounded-lg border border-theme-modal-border bg-theme-bg-primary light:bg-white text-sm text-theme-text-primary placeholder:text-theme-text-secondary outline-none focus:ring-2 focus:ring-blue-400/40 resize-y min-h-[120px]"
                />
              </div>

              {/* Labels */}
              <div>
                <p className="text-xs font-medium text-theme-text-secondary mb-1.5">
                  {t("feedbackModal.labels")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {LABEL_OPTIONS.map(({ id, key }) => {
                    const active = labels.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleLabel(id)}
                        disabled={submitting}
                        aria-pressed={active}
                        className={`h-7 px-2.5 rounded-full border text-xs font-medium cursor-pointer transition-colors ${
                          active
                            ? "border-blue-500/50 bg-blue-500/15 text-blue-300 light:text-blue-700 light:bg-blue-50"
                            : "border-theme-modal-border bg-transparent text-theme-text-secondary hover:bg-white/5 light:hover:bg-zinc-50"
                        }`}
                      >
                        {t(key)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {!configured && (
                <p className="text-xs text-amber-400 light:text-amber-700 leading-snug">
                  {t("feedbackModal.notConfigured")}{" "}
                  <a
                    href={fallbackUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-theme-text-primary"
                  >
                    {t("feedbackModal.openGithub")}
                  </a>
                </p>
              )}

              {error && (
                <p
                  className="text-xs text-red-400 light:text-red-600"
                  role="alert"
                >
                  {error}{" "}
                  <a
                    href={fallbackUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {t("feedbackModal.openGithub")}
                  </a>
                </p>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-theme-modal-border">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="border-none px-3 py-2 text-sm rounded-lg bg-transparent text-theme-text-secondary hover:bg-white/5 light:hover:bg-zinc-100 cursor-pointer"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={submitting || title.trim().length < 3}
                className="border-none inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-primary-button text-theme-text-primary hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <CircleNotch size={14} className="animate-spin" />
                    {t("feedbackModal.creating")}
                  </>
                ) : (
                  t("feedbackModal.createIssue")
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalWrapper>
  );
}
