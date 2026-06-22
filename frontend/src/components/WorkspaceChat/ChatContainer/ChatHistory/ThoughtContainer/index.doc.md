# ThoughtContainer/index.tsx

**Purpose:** Brain icon button and expandable thought-chain panel for AI assistant
messages. Detects `<thinking>…</thinking>` tags in streamed replies and lets the
user toggle the raw thought chain.

**Docs:** [ThoughtContainer/index.tsx](index.tsx)

## What this file does

Exports:

- `ThoughtExpansionProvider` / `useThoughtExpansion` — keeps the thought-chain
  expand/collapse state stable across component transitions (streaming →
  historical message).
- `ThoughtBrainButton` — small brain icon that sits to the left of an AI
  message. Shows an animated brain while the model is still thinking, and a
  static brain once the thought chain is complete.
- `ThoughtChainComponent` — renders the extracted thought-chain content in a
  monospace panel when expanded.
- `THOUGHT_REGEX_OPEN`, `THOUGHT_REGEX_CLOSE`, `THOUGHT_REGEX_COMPLETE` — regexes
  used to detect thought tags in model output.

## Files that touch it

- [`PromptReply`](../PromptReply/index.tsx): uses `ThoughtBrainButton` and
  `ThoughtChainComponent` while the assistant reply is streaming.
- [`HistoricalMessage`](../HistoricalMessage/index.tsx): uses the same brain
  button and panel for already-persisted assistant messages.
- [`ThoughtContainer/index.test.tsx`](index.test.tsx): tests the regexes and
  expansion context.

## Important config values

- `THOUGHT_KEYWORDS`: `thought`, `thinking`, `think`, `thought_chain`,
  `arg_value`.
- `CLOSING_TAGS`: thought keywords plus `response` and `answer`.
- `contentIsNotEmpty` strips thought tags and whitespace before deciding whether
  to render the brain icon.
- The brain icon accepts an optional `className` prop so callers can override
  the default `mt-2` top margin (e.g., to vertically center it with the loading
  dots in `PromptReply`).

## Why certain decisions were made

- The brain icon is separated from the thought-chain panel so the same button can
  be reused in both streaming (`PromptReply`) and historical
  (`HistoricalMessage`) contexts.
- The icon uses `scale-[115%]` on the animated video so the 16px asset visibly
  fills the 18px square button area. The button is `inline-flex items-center
  justify-center` so the scaled video and static image stay vertically centered.
- In light mode the icon is inverted and dimmed (`light:invert light:opacity-50`)
  so it remains visible against the light bubble background.

## Usage

```tsx
import {
  ThoughtExpansionProvider,
  ThoughtBrainButton,
  ThoughtChainComponent,
} from "./ThoughtContainer";

function ReplyWithThoughts() {
  return (
    <ThoughtExpansionProvider>
      <div className="flex items-center gap-x-1.5">
        <ThoughtBrainButton
          messageId={messageId}
          content={message}
          className="mt-0"
        />
        <div className="dot-falling light:invert" />
      </div>
      <ThoughtChainComponent content={message} messageId={messageId} />
    </ThoughtExpansionProvider>
  );
}
```

## Known caveats

- `any` types are used throughout; the file predates stricter TypeScript
  adoption.
- The `contentIsNotEmpty` heuristic can hide the brain icon for very short or
  whitespace-only thought chains.
