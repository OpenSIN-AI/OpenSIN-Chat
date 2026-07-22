// SPDX-License-Identifier: MIT
import { useMemo, useState } from "react";
import useTimeoutProgress from "@/hooks/useTimeoutProgress";
import Header from "./Header";
import InputForm from "./InputForm";
import ChoiceForm from "./ChoiceForm";
import Footer from "./Footer";
import SurveyBody from "./SurveyBody";
import { answerForDraft, emptyDraftFor } from "./utils";

function TimeoutProgressBar({ percent }: any) {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-700 light:bg-slate-300">
      <div
        className="h-full bg-sky-500 light:bg-sky-600 transition-none w-[var(--timeout-progress)]"
        style={{ "--timeout-progress": `${percent}%` }}
      />
    </div>
  );
}

function CardWrapper({ children }: any) {
  return (
    <div className="flex justify-center w-full my-1 pr-4">
      <div className="w-full flex flex-col">
        <div className="rounded-[20px] relative border border-solid border-zinc-700 light:border-zinc-300 bg-transparent p-[18px] flex flex-col gap-[18px] overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

function ActiveInputForm({ question, draft, updateDraft, onSubmit }: any) {
  if (question?.kind !== "input") return null;
  return (
    <InputForm
      question={question}
      draft={draft}
      onChange={(value: string) => updateDraft({ skipped: false, value })}
      onSubmit={onSubmit}
    />
  );
}

function ActiveChoiceForm({
  question,
  draft,
  updateDraft,
  onAutoAdvance,
  allowSkip,
  onSkip,
}: any) {
  if (question?.kind !== "choice") return null;
  return (
    <ChoiceForm
      question={question}
      draft={draft}
      onChange={(patch: Record<string, any>) => updateDraft({ skipped: false, ...patch })}
      onAutoAdvance={
        question.multiSelect
          ? null
          : (patch: Record<string, any>) => onAutoAdvance({ skipped: false, ...patch })
      }
      allowSkip={allowSkip}
      onSkip={onSkip}
    />
  );
}

function ActiveFooter({
  question,
  draft,
  isSingle,
  isLast,
  allowSkip,
  answeredCount,
  total,
  onSkipThis,
  onNext,
  onSubmitAll,
}: any) {
  const isChoice = question?.kind === "choice";
  const isInput = question?.kind === "input";
  const showFooter =
    isInput || (isChoice && (question.multiSelect || draft?.otherSelected));

  if (!showFooter) return null;

  return (
    <Footer
      isSingle={isSingle}
      isLast={isLast}
      allowSkip={allowSkip && isInput}
      answeredCount={answeredCount}
      total={total}
      onSkipThis={onSkipThis}
      onNext={onNext}
      onSubmitAll={onSubmitAll}
    />
  );
}

function CompletedSurvey({ questions, drafts, submittedResult }: any) {
  const result =
    submittedResult?.timedOut || submittedResult?.skipped
      ? submittedResult
      : {
          answers: (questions as any).map((q: any, i: number) =>
            answerForDraft(q, drafts[i]),
          ),
        };

  return <SurveyBody questions={questions} result={result} />;
}

/**
 * Live, interactive clarifying-question card. Walks the user through one or
 * more questions in a single batch (paginated), then renders a read-only
 * SurveyBody once the user submits, skips, or the timeout fires.
 *
 * Persisted/historical chats use the same SurveyBody via HistoricalClarifyingQuestions.
 */
export default function ClarifyingQuestionCard({
  requestId,
  questions = [],
  allowSkip = true,
  timeoutMs = null,
  websocket,
}: any) {
  const [index, setIndex] = useState(0 as any);
  const [responded, setResponded] = useState(false as any);
  const [submittedResult, setSubmittedResult] = useState<any>(null);
  const [drafts, setDrafts] = useState(() =>
    (questions as any).map((q: any) => emptyDraftFor(q)),
  );

  const progressPercent = useTimeoutProgress(timeoutMs, {
    active: !responded,
    onTimeout: () => {
      setResponded(true);
      setSubmittedResult({ timedOut: true });
    },
  });

  const total = questions.length;
  const isSingle = total === 1;
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const currentQuestion = questions[index];
  const currentDraft = drafts[index];

  const answeredCount = useMemo(
    () =>
      questions.reduce((acc: number, q: any, i: number) => {
        const r = answerForDraft(q, drafts[i]);
        return acc + (r.skipped ? 0 : 1);
      }, 0),
    [questions, drafts],
  );

  if (!total) return null;

  function updateDraft(patch: any) {
    setDrafts((prev: any[]) =>
      (prev as any).map((d: any, i: number) => (i === index ? { ...d, ...patch } : d)),
    );
  }

  function send(payload: any) {
    if (responded) return;
    setResponded(true);
    setSubmittedResult(payload);
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(
        JSON.stringify({
          type: "clarificationResponse",
          requestId,
          ...payload,
        }),
      );
    }
  }

  function handleSkipThis() {
    const skipPatch = { skipped: true };
    updateDraft(skipPatch);
    if (isLast) return handleSubmitAll(skipPatch);
    setIndex(index + 1);
  }

  function handleNext() {
    if (isLast) return handleSubmitAll();
    setIndex(index + 1);
  }

  function handleAutoAdvance(pendingPatch: any) {
    if (isLast) return handleSubmitAll(pendingPatch);
    setIndex(index + 1);
  }

  function handlePrev() {
    if (isFirst) return;
    setIndex(index - 1);
  }

  function handleSubmitAll(pendingPatch?: any) {
    const resolved = pendingPatch
      ? (drafts as any).map((d: any, i: number) =>
          i === index ? { ...d, ...pendingPatch } : d,
        )
      : drafts;
    const answers = (questions as any).map((q: any, i: number) =>
      answerForDraft(q, resolved[i]),
    );
    send({ skipped: false, answers });
  }

  function handleClose() {
    send({ skipped: true });
  }

  return (
    <CardWrapper>
      {!responded && (
        <>
          <Header
            question={currentQuestion?.question}
            index={index}
            total={total}
            isSingle={isSingle}
            responded={responded}
            onPrev={handlePrev}
            onNext={handleNext}
            onClose={handleClose}
            isFirst={isFirst}
            isLast={isLast}
          />
          <ActiveInputForm
            question={currentQuestion}
            draft={currentDraft}
            updateDraft={updateDraft}
            onSubmit={isSingle ? handleSubmitAll : handleNext}
          />
          <ActiveChoiceForm
            question={currentQuestion}
            draft={currentDraft}
            updateDraft={updateDraft}
            onAutoAdvance={handleAutoAdvance}
            allowSkip={allowSkip}
            onSkip={handleSkipThis}
          />
          <ActiveFooter
            question={currentQuestion}
            draft={currentDraft}
            isSingle={isSingle}
            isLast={isLast}
            allowSkip={allowSkip}
            answeredCount={answeredCount}
            total={total}
            onSkipThis={handleSkipThis}
            onNext={handleNext}
            onSubmitAll={handleSubmitAll}
          />
        </>
      )}
      {responded && (
        <CompletedSurvey
          questions={questions}
          drafts={drafts}
          submittedResult={submittedResult}
        />
      )}
      {timeoutMs && !responded && (
        <TimeoutProgressBar percent={progressPercent} />
      )}
    </CardWrapper>
  );
}
