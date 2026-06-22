<!-- SPDX-License-Identifier: MIT -->

# HistoricalMessage

## Purpose

Renders a single historical chat message in the workspace thread. It handles both user and assistant roles, including:

- Markdown rendering with DOMPurify sanitization.
- Image attachment thumbnails with lightbox support.
- Thought-chain display for assistant messages.
- Action bars (copy, edit, regenerate, feedback, delete, fork, TTS).
- Inline editing via `EditMessageForm`.
- Delete animation via `useWatchDeleteMessage`.
- Truncation for very long messages with a “see more / see less” toggle.

## User-message visibility fix (#258)

The user-message bubble explicitly sets both foreground and background colors so the text is never the same as its background:

```jsx
<div className="bg-zinc-700 light:bg-slate-200 text-white light:text-slate-900 ...">
```

- Dark mode: white text on `bg-zinc-700`.
- Light mode: `text-slate-900` on `bg-slate-200`.

The `TruncatableContent` wrapper also carries `text-white light:text-slate-900` as a defensive layer so that any markdown-produced children inherit a visible foreground color. Without this, the user message could be rendered with the parent `text-white/80` or theme-default color that matches the bubble background.

## Docs

- `index.tsx` — component implementation.
- `index.test.jsx` — unit tests for rendering, editing, deletion, and user-message visibility classes.
- `Actions/` — message action bar and sub-actions.
- `ThoughtContainer/` — thought-chain rendering for assistant messages.
- `ChatHistory/index.tsx` — virtualized list that builds the `historical` rows passed to this component.
- `useChatStream.js` — local chat history state and streaming logic.
