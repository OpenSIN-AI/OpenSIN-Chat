# PromptReply/index.tsx

**Purpose:** Renders the assistant’s streaming response in the chat history,
including pending dots, error states, thought-chain detection, and citations.

**Docs:** [PromptReply/index.tsx](index.tsx)

## What this file does

Displays one of four states based on props:

1. `pending` — bouncing dots loader while waiting for the first chunk.
2. `error` — red error banner with `Warning` icon.
3. `thinking` (reply contains `<thinking>` but no closing tag) — brain icon +
   bouncing dots, aligned vertically.
4. `complete` — rendered markdown reply plus optional thought-chain panel and
   citations.

## Files that touch it

- [`ChatHistory`](../index.tsx): maps assistant replies to `PromptReply`.
- [`ThoughtContainer`](../ThoughtContainer/index.tsx): provides the brain icon,
  thought-chain panel, and regexes used to detect thinking tags.
- [`Citation`](../Citation/index.tsx): renders source citations below the reply.
- [`PromptReply/index.test.jsx`](index.test.jsx): covers pending, error, and
  reply states.

## Important config values

- `MARKDOWN_SANITIZE_OPTS`: restricted tag allow-list used before rendering the
  assistant reply markdown.
- `dot-falling` / `typing-dots` classes are reused for the loader animation.
- The brain icon in the thinking state is passed `className="mt-0"` so it sits
  flush with the vertically centered dots; the default `mt-2` margin is used
  when the icon sits next to message text in `HistoricalMessage`.

## Why certain decisions were made

- The component is split from `ChatHistory` so each reply can manage its own
  thought-chain expansion state and citation rendering.
- `RenderAssistantChatContent` is an internal sub-component so the pending/error
  states can short-circuit without computing thought regexes.
- The thought chain is updated imperatively via `ref.updateContent()` during
  streaming, but the visible markdown is computed during render so chunks appear
  immediately.

## Usage

```tsx
import PromptReply from "./PromptReply";

function AssistantReply() {
  return (
    <PromptReply
      uuid={messageId}
      reply={assistantReply}
      pending={false}
      error={null}
      sources={[]}
    />
  );
}
```

## Known caveats

- `any` types are used for props; the file predates stricter TypeScript
  adoption.
- The `thinking` regex check is re-run inside the effect and during render;
  keeping the two in sync is important to avoid stale or missing thought-chain
  updates.
