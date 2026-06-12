// SPDX-License-Identifier: MIT
/* eslint-disable i18next/no-literal-string */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ClarifyingQuestionCard from "./index";

vi.mock("@/hooks/useTimeoutProgress", () => ({
  default: (_timeoutMs, _opts) => 75,
}));

vi.mock("./Header", () => ({
  default: ({ question, index, total, onClose }) => (
    <div data-testid="header">
      <span>{question}</span>
      <span>
        {index}/{total}
      </span>
      <button onClick={onClose} data-testid="close-btn">
        Close
      </button>
    </div>
  ),
}));

vi.mock("./InputForm", () => ({
  default: ({ question, draft, onChange, onSubmit }) => (
    <div data-testid="input-form">
      <span data-testid="input-question">{question?.question}</span>
      <input
        data-testid="input-field"
        value={draft?.value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
      <button data-testid="input-submit" onClick={onSubmit}>
        Submit
      </button>
    </div>
  ),
}));

vi.mock("./ChoiceForm", () => ({
  default: ({
    question,
    draft,
    onChange,
    onAutoAdvance,
    allowSkip,
    onSkip,
  }) => (
    <div data-testid="choice-form">
      <span data-testid="choice-question">{question?.question}</span>
      <button data-testid="choice-skip" onClick={onSkip}>
        Skip
      </button>
    </div>
  ),
}));

vi.mock("./Footer", () => ({
  default: ({ isSingle, isLast, onSkipThis, onNext, onSubmitAll }) => (
    <div data-testid="footer">
      {isSingle && <span>single</span>}
      {isLast && <span>last</span>}
      <button data-testid="footer-skip" onClick={onSkipThis}>
        SkipThis
      </button>
      <button data-testid="footer-next" onClick={onNext}>
        Next
      </button>
      <button data-testid="footer-submit" onClick={onSubmitAll}>
        SubmitAll
      </button>
    </div>
  ),
}));

vi.mock("./SurveyBody", () => ({
  default: ({ questions, result }) => (
    <div data-testid="survey-body">
      <span>Survey: {questions?.length ?? 0}</span>
    </div>
  ),
}));

function mockWebSocket() {
  return {
    readyState: WebSocket.OPEN,
    send: vi.fn(),
  };
}

{/* eslint-disable i18next/no-literal-string */}
describe("ClarifyingQuestionCard", () => {
  it("returns null when questions array is empty", () => {
    const { container } = render(
      <ClarifyingQuestionCard requestId="r1" questions={[]} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders header and input form for single input question", () => {
    const questions = [{ kind: "input", question: "What is your name?" }];
    render(<ClarifyingQuestionCard requestId="r1" questions={questions} />);
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("input-form")).toBeInTheDocument();
    expect(screen.getByTestId("input-question").textContent).toBe(
      "What is your name?",
    );
  });

  it("renders choice form for choice question", () => {
    const questions = [
      {
        kind: "choice",
        question: "Pick one",
        multiSelect: false,
        options: ["A", "B"],
      },
    ];
    render(<ClarifyingQuestionCard requestId="r1" questions={questions} />);
    expect(screen.getByTestId("choice-form")).toBeInTheDocument();
  });

  it("renders footer for single input question", () => {
    const questions = [{ kind: "input", question: "Name?" }];
    render(<ClarifyingQuestionCard requestId="r1" questions={questions} />);
    expect(screen.getByTestId("footer")).toBeInTheDocument();
    expect(screen.getByText("single")).toBeInTheDocument();
  });

  it("does not render footer for single-select choice question", () => {
    const questions = [
      {
        kind: "choice",
        question: "Pick one",
        multiSelect: false,
        options: ["A"],
      },
    ];
    render(<ClarifyingQuestionCard requestId="r1" questions={questions} />);
    expect(screen.queryByTestId("footer")).not.toBeInTheDocument();
  });

  it("shows survey body after close", () => {
    const questions = [{ kind: "input", question: "Name?" }];
    render(<ClarifyingQuestionCard requestId="r1" questions={questions} />);
    fireEvent.click(screen.getByTestId("close-btn"));
    expect(screen.getByTestId("survey-body")).toBeInTheDocument();
  });

  it("sends clarificationResponse on websocket when skipping", () => {
    const ws = mockWebSocket();
    const questions = [{ kind: "input", question: "Name?" }];
    render(
      <ClarifyingQuestionCard
        requestId="r1"
        questions={questions}
        websocket={ws}
      />,
    );
    fireEvent.click(screen.getByTestId("close-btn"));
    expect(ws.send).toHaveBeenCalledOnce();
    const sent = JSON.parse(ws.send.mock.calls[0][0]);
    expect(sent.type).toBe("clarificationResponse");
    expect(sent.requestId).toBe("r1");
    expect(sent.skipped).toBe(true);
  });

  it("shows timeout progress bar when timeoutMs is set", () => {
    const questions = [{ kind: "input", question: "Name?" }];
    const { container } = render(
      <ClarifyingQuestionCard
        requestId="r1"
        questions={questions}
        timeoutMs={5000}
      />,
    );
    const bar = container.querySelector(".bg-sky-500");
    expect(bar).toBeInTheDocument();
  });

  it("does not show timeout bar when timeoutMs is null", () => {
    const questions = [{ kind: "input", question: "Name?" }];
    const { container } = render(
      <ClarifyingQuestionCard
        requestId="r1"
        questions={questions}
        timeoutMs={null}
      />,
    );
    const bar = container.querySelector(".bg-sky-500");
    expect(bar).not.toBeInTheDocument();
  });
});
{/* eslint-enable i18next/no-literal-string */}
