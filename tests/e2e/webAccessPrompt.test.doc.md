# E2E: LLM awareness of @agent tooling

## What it does
Sends a chat to a running OpenAfD container without the `@agent` prefix and
verifies the LLM acknowledges that tools (web, filesystem, etc.) are
available via the `@agent` prefix. Also re-tests the explicit `@agent` flow
to make sure backward compatibility holds.

## Why
Bug: users asking "hast du web zugriff?" were getting "Nein, ich habe keinen
Webzugriff" because the system prompt never told the LLM that `@agent` unlocks
tools. The fix adds a rule to the default system prompt and this test pins
both the prompt and the runtime behaviour.

## How to run
```bash
docker cp tests/e2e/webAccessPrompt.test.cjs openafd:/tmp/test.cjs
docker exec openafd sh -c 'cd /app/server && node /tmp/test.cjs'
```

## Caveats
- Runs against the live container — depends on the `pol-test-key-001` API
  key and the `test` workspace existing.
- Strip `<think>...</think>` blocks from the response before matching,
  because the default Nemotron reasoning model emits chain-of-thought.
