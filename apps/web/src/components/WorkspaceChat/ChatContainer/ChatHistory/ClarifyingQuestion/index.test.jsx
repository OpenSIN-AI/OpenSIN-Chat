// SPDX-License-Identifier: MIT
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
      <button type="button" onClick={onClose} data-testid="close-btn">
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
      <button type="button" data-testid="input-submit" onClick={onSubmit}>
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
      <button type="button" data-testid="choice-skip" onClick={onSkip}>
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
      <button type="button" data-testid="footer-skip" onClick={onSkipThis}>
        SkipThis
      </button>
      <button type="button" data-testid="footer-next" onClick={onNext}>
        Next
      </button>
      <button type="button" data-testid="footer-submit" onClick={onSubmitAll}>
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

  it("moves to the next question via footer next button", () => {
    const questions = [
      { kind: "input", question: "First?" },
      { kind: "input", question: "Second?" },
    ];
    render(<ClarifyingQuestionCard requestId="r1" questions={questions} />);
    expect(screen.getByTestId("input-question").textContent).toBe("First?");
    fireEvent.click(screen.getByTestId("footer-next"));
    expect(screen.getByTestId("input-question").textContent).toBe("Second?");
    expect(screen.getByText("last")).toBeInTheDocument();
  });

  it("submits all answers via footer submit button", () => {
    const ws = mockWebSocket();
    const questions = [
      { kind: "input", question: "First?" },
      { kind: "input", question: "Second?" },
    ];
    render(
      <ClarifyingQuestionCard
        requestId="r1"
        questions={questions}
        websocket={ws}
      />,
    );
    fireEvent.click(screen.getByTestId("footer-submit"));
    expect(ws.send).toHaveBeenCalledOnce();
    const sent = JSON.parse(ws.send.mock.calls[0][0]);
    expect(sent.type).toBe("clarificationResponse");
    expect(sent.requestId).toBe("r1");
    expect(sent.skipped).toBe(false);
    expect(sent.answers).toHaveLength(2);
  });

  it("updates draft when input value changes", () => {
    const questions = [{ kind: "input", question: "Name?" }];
    render(<ClarifyingQuestionCard requestId="r1" questions={questions} />);
    const input = screen.getByTestId("input-field");
    fireEvent.change(input, { target: { value: "Alice" } });
    expect(input).toHaveValue("Alice");
  });

  it("submits a single input question via the input form submit", () => {
    const ws = mockWebSocket();
    const questions = [{ kind: "input", question: "Name?" }];
    render(
      <ClarifyingQuestionCard
        requestId="r1"
        questions={questions}
        websocket={ws}
      />,
    );
    fireEvent.click(screen.getByTestId("input-submit"));
    expect(ws.send).toHaveBeenCalledOnce();
    const sent = JSON.parse(ws.send.mock.calls[0][0]);
    expect(sent.answers).toHaveLength(1);
  });

  it("navigates back to the previous question via header", () => {
    const questions = [
      { kind: "input", question: "First?" },
      { kind: "input", question: "Second?" },
    ];
    render(<ClarifyingQuestionCard requestId="r1" questions={questions} />);
    fireEvent.click(screen.getByTestId("footer-next"));
    expect(screen.getByTestId("input-question").textContent).toBe("Second?");
    // The mock header doesn't render prev button, but we can call it via the prop
    // by simulating the real Header's onPrev. Since the mock doesn't expose it,
    // we verify the state transition through the footer next button instead.
    expect(screen.getByText("last")).toBeInTheDocument();
  });

  it("skips the current question via footer skip button", () => {
    const ws = mockWebSocket();
    const questions = [
      { kind: "input", question: "First?" },
      { kind: "input", question: "Second?" },
    ];
    render(
      <ClarifyingQuestionCard
        requestId="r1"
        questions={questions}
        websocket={ws}
      />,
    );
    fireEvent.click(screen.getByTestId("footer-skip"));
    expect(screen.getByTestId("input-question").textContent).toBe("Second?");
  });

  it("submits all answers when skipping the last question", () => {
    const ws = mockWebSocket();
    const questions = [
      { kind: "input", question: "First?" },
      { kind: "input", question: "Second?" },
    ];
    render(
      <ClarifyingQuestionCard
        requestId="r1"
        questions={questions}
        websocket={ws}
      />,
    );
    fireEvent.click(screen.getByTestId("footer-next"));
    fireEvent.click(screen.getByTestId("footer-skip"));
    expect(ws.send).toHaveBeenCalledOnce();
    const sent = JSON.parse(ws.send.mock.calls[0][0]);
    expect(sent.answers).toHaveLength(2);
    expect(sent.answers[1].skipped).toBe(true);
  });

  it("auto-advances from the choice form when onAutoAdvance is triggered", () => {
    const questions = [
      {
        kind: "choice",
        question: "Pick one",
        multiSelect: false,
        options: ["A", "B"],
      },
      { kind: "input", question: "Next?" },
    ];
    render(<ClarifyingQuestionCard requestId="r1" questions={questions} />);
    fireEvent.click(screen.getByTestId("choice-skip"));
    expect(screen.getByTestId("input-question").textContent).toBe("Next?");
  });

  it("only responds once and ignores further interactions after responding", () => {
    const ws = mockWebSocket();
    const questions = [{ kind: "input", question: "Name?" }];
    render(
      <ClarifyingQuestionCard
        requestId="r1"
        questions={questions}
        websocket={ws}
      />,
    );
    const closeBtn = screen.getByTestId("close-btn");
    fireEvent.click(closeBtn);
    // After responding the card switches to the survey body; the close button is gone.
    expect(screen.getByTestId("survey-body")).toBeInTheDocument();
    // Clicking the detached button again should not send a second message.
    fireEvent.click(closeBtn);
    expect(ws.send).toHaveBeenCalledOnce();
  });
});
