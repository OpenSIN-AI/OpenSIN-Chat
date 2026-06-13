// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PromptInput from "./index";
import { useState, useRef } from "react";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("react-router-dom", () => ({
  useParams: vi.fn(() => ({})),
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: vi.fn(() => ({ theme: "dark", isLight: false })),
}));

vi.mock("@/hooks/useDocument", () => ({
  default: vi.fn(() => ({
    document: null,
    isLoading: false,
    refresh: vi.fn(),
  })),
}));

vi.mock("@/hooks/useUser", () => ({
  default: vi.fn(() => ({ user: null })),
}));

vi.mock("@/utils/toast", () => ({
  default: vi.fn(),
}));

vi.mock("@/hooks/useDocuments", () => ({
  default: vi.fn(() => ({
    documents: null,
    isLoading: false,
    mutate: vi.fn(),
  })),
}));

function MockUsePromptState() {
  const [promptInput, setPromptInput] = useState("");
  const textareaRef = useRef(null);
  const formRef = useRef(null);
  const autoOpenedToolsRef = useRef(false);
  const toolsHighlightRef = useRef(-1);

  return {
    promptInput,
    setPromptInput,
    showTools: false,
    setShowTools: () => {},
    autoOpenedToolsRef,
    toolsHighlightRef,
    formRef,
    textareaRef,
    textSizeClass: "text-[14px]",
    saveCurrentState: () => {},
    handleSubmit: (e) => e.preventDefault(),
    captureEnterOrUndo: () => {},
    adjustTextArea: () => {},
    handlePasteEvent: () => {},
    handleChange: (e) => setPromptInput(e.target.value),
    agentSessionActive: false,
    showAgentCommand: true,
  };
}

vi.mock("./usePromptState", () => ({
  PROMPT_INPUT_EVENT: "set_prompt_input",
  MAX_EDIT_STACK_SIZE: 100,
  default: MockUsePromptState,
}));

vi.mock("./StopGenerationButton", () => ({ default: () => null }));
vi.mock("./SpeechToText", () => ({ default: () => null }));
vi.mock("./Attachments", () => ({ default: () => null }));
vi.mock("./ToolsMenu", () => ({ default: () => null }));
vi.mock("./AgentSessionButton", () => ({ default: () => null }));
vi.mock("./ToolsButton", () => ({ default: () => null }));
vi.mock("./SendPromptButton", () => ({ default: () => null }));
vi.mock("./EnhancePromptButton", () => ({ default: () => null }));

describe("PromptInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const leftover = document.getElementById("dnd-chat-file-uploader");
    if (leftover) leftover.remove();
  });

  function renderPromptInput(props = {}) {
    return render(
      <PromptInput
        workspace={{}}
        submit={() => {}}
        isStreaming={false}
        sendCommand={() => {}}
        workspaceSlug="my-workspace"
        threadSlug="my-thread"
        {...props}
      />,
    );
  }

  function addDndFileInput() {
    const input = document.createElement("input");
    input.id = "dnd-chat-file-uploader";
    input.type = "file";
    input.hidden = true;
    document.body.appendChild(input);
    return input;
  }

  it("renders the prompt textarea and the AttachItem trigger", () => {
    renderPromptInput();
    expect(screen.getByPlaceholderText("Send a message")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Attach a file to this chat/i }),
    ).toBeInTheDocument();
  });

  it("keeps the textarea value while opening the attachment menu", async () => {
    const user = userEvent.setup();
    renderPromptInput();
    const textarea = screen.getByPlaceholderText("Send a message");
    const trigger = screen.getByRole("button", {
      name: /Attach a file to this chat/i,
    });

    await user.type(textarea, "Hello world");
    expect(textarea).toHaveValue("Hello world");

    await user.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(textarea).toHaveValue("Hello world");
  });

  it("triggers the hidden file input from the prompt input without touching the textarea", async () => {
    const user = userEvent.setup();
    const input = addDndFileInput();
    const clickSpy = vi.spyOn(input, "click");
    renderPromptInput();

    const textarea = screen.getByPlaceholderText("Send a message");
    await user.type(textarea, "Keep me");
    expect(textarea).toHaveValue("Keep me");

    const trigger = screen.getByRole("button", {
      name: /Attach a file to this chat/i,
    });
    await user.click(trigger);
    await user.click(
      screen.getByRole("menuitem", { name: /Upload from computer/i }),
    );

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(textarea).toHaveValue("Keep me");

    input.remove();
  });
});
