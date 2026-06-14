# collector/utils/logger/index.js

## Purpose
Returns a singleton logger for the collector. Uses `winston` in production and falls back to the global `console` object in development and test environments.

## Dependencies
- `winston` (only loaded/used when `NODE_ENV=production`)

## Usage
```js
const setLogger = require("./utils/logger");
const logger = setLogger();
logger.info("something happened");
```

## Notes
- The first production call creates the winston logger and overrides `console.log`, `console.error`, and `console.info` so that legacy `console.*` calls are captured.
- The winston instance is cached for the lifetime of the process; subsequent calls return the same instance.
- Non-production calls always return the global `console` object.
