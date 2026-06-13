# `requireAuthWhenOnboardingComplete.js` — Onboarding auth gate

Companion to `server/utils/middleware/requireAuthWhenOnboardingComplete.js`.

## What it does

Express middleware used on `POST /api/onboarding`. It decides whether the request needs to be authenticated:

- If onboarding is **not yet complete**, the request proceeds without auth. This lets a single-user no-password setup finish onboarding.
- If onboarding is **already complete**, the request is forwarded to `validatedRequest()` so only authenticated admins can change the onboarding flag.

## Dependencies

- `SystemSettings.isOnboardingComplete()` to check the current onboarding state.
- `validatedRequest` from `./validatedRequest.js` for the auth check.

## Usage

```js
const { requireAuthWhenOnboardingComplete } = require("../utils/middleware/requireAuthWhenOnboardingComplete");
app.post("/onboarding", [requireAuthWhenOnboardingComplete], async (req, res) => { ... });
```

## Edge cases

- If `SystemSettings.isOnboardingComplete()` throws, the middleware returns 500 and logs the error.
- It does not call `next()` when it returns 500, so the final handler is not reached.

## Tests

See `server/__tests__/utils/middleware/requireAuthWhenOnboardingComplete.test.js`.
