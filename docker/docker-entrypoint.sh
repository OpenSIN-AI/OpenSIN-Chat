#!/bin/bash

# Check if STORAGE_DIR is set
if [ -z "$STORAGE_DIR" ]; then
    echo "================================================================"
    echo "⚠️  ⚠️  ⚠️  WARNING: STORAGE_DIR environment variable is not set! ⚠️  ⚠️  ⚠️"
    echo ""
    echo "Not setting this will result in data loss on container restart since"
    echo "the application will not have a persistent storage location."
    echo "It can also result in weird errors in various parts of the application."
    echo ""
    echo "Please run the container with the official docker command at"
    echo "https://sinchat.delqhi.com/docs"
    echo ""
    echo "⚠️  ⚠️  ⚠️  WARNING: STORAGE_DIR environment variable is not set! ⚠️  ⚠️  ⚠️"
    echo "================================================================"
fi

# Ensure PDF analysis storage directory exists (healthcheck expects it)
mkdir -p "${STORAGE_DIR:-/app/server/storage}/pdf-analysis"

# Defense-in-depth runtime guard for issue #114: the native embedder crashes
# with a cryptic Node module error when /app/server/utils/paths.js is missing.
# If the file is not present, fail loudly and tell the operator to rebuild.
if [ ! -f /app/server/utils/paths.js ]; then
    echo "================================================================"
    echo "RUNTIME ERROR: /app/server/utils/paths.js is missing!"
    echo "The native embedder will crash. Please rebuild the image so that"
    echo "server/utils/paths.js is included in the Docker image."
    echo "================================================================"
    exit 1
fi

{
  cd /app/server/ &&
    # Disable Prisma CLI telemetry (https://www.prisma.io/docs/orm/tools/prisma-cli#how-to-opt-out-of-data-collection)
    export CHECKPOINT_DISABLE=1 &&
    npx prisma generate --schema=./prisma/schema.prisma &&
    npx prisma migrate deploy --schema=./prisma/schema.prisma &&
    node /app/server/index.js
} &
{ node /app/collector/index.js; } &
wait -n
exit $?
