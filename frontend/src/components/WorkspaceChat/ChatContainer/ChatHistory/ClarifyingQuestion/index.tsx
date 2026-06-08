// SPDX-License-Identifier: MIT
import { useMemo, useState } from "react";
import useTimeoutProgress from "@/hooks/useTimeoutProgress";
import Header from "./Header";
import InputForm from "./InputForm";
import ChoiceForm from "./ChoiceForm";
import Footer from "./Footer";
import SurveyBody from "./SurveyBody";
import { answerForDraft, emptyDraftFor } from "./utils";

function TimeoutProgressBar({ percent }: any): JSX.Element {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-700 light:bg-slate-300">
      <div
        className="h-full bg-sky-500 light:bg-sky-600 transition-none"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function CardWrapper({ children }: any): JSX.Element {
  return (
    <div className="flex justify-center w-full my-1 pr-4">
      <div className="w-full flex flex-col">
        <div
          style={{ borderRadius: "20px" }}
          className="relative border border-solid border-zinc-700 light:border-zinc-300 bg-transparent p-[18px] flex flex-col gap-[18px] overflow-hidden"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function ActiveInputForm({ question: any, draft: any, updateDraft: any, onSubmit }: any): JSX.Element {
  if (question?.kind !== "input") return null;
  return (
    <InputForm
      question={question}
      draft={draft}
      onChange={(value) => updateDraft({ skipped: false, value })}
      onSubmit={onSubmit}
    />
  );
}

function ActiveChoiceForm({
  question: any, draft: any, updateDraft: any, onAutoAdvance: any, allowSkip: any, onSkip: any, }: any): JSX.Element {
  if (question?.kind !== "choice") return null;
  return (
    <ChoiceForm
      question={question}
      draft={draft}
      onChange={(patch) => updateDraft({ skipped: false, ...patch })}
      onAutoAdvance={
        question.multiSelect
          ? null
          : (patch) => onAutoAdvance({ skipped: false, ...patch })
      }
      allowSkip={allowSkip}
      onSkip={onSkip}
    />
  );
}

function ActiveFooter({
  question: any, draft: any, isSingle: any, isLast: any, allowSkip: any, answeredCount: any, total: any, onSkipThis: any, onNext: any, onSubmitAll: any, }: any): JSX.Element {
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

function CompletedSurvey({ questions: any, drafts: any, submittedResult }: any): JSX.Element {
  const result =
    submittedResult?.timedOut || submittedResult?.skipped
      ? submittedResult
      : { answers: questions.map((q, i) => answerForDraft(q, drafts[i])) };

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
  requestId: any, questions: any = [], allowSkip: any = true, timeoutMs: any = null, websocket: any, }: any): JSX.Element {
  const [index, setIndex] = useState(0);
  const [responded, setResponded] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);
  const [drafts, setDrafts] = useState(() =>
    questions.map((q) => emptyDraftFor(q)),
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
      questions.reduce((acc, q, i) => {
        const r = answerForDraft(q, drafts[i]);
        return acc + (r.skipped ? 0 : 1);
      }, 0),
    [questions, drafts],
  );

  if (!total) return null;

  function updateDraft(patch: any): JSX.Element {
    setDrafts((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...patch } : d)),
    );
  }

  function send(payload: any): JSX.Element {
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

  function handleAutoAdvance(pendingPatch: any): JSX.Element {
    if (isLast) return handleSubmitAll(pendingPatch);
    setIndex(index + 1);
  }

  function handlePrev() {
    if (isFirst) return;
    setIndex(index - 1);
  }

  function handleSubmitAll(pendingPatch: any): JSX.Element {
    const resolved = pendingPatch
      ? drafts.map((d, i) => (i === index ? { ...d, ...pendingPatch } : d))
      : drafts;
    const answers = questions.map((q, i) => answerForDraft(q, resolved[i]));
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
