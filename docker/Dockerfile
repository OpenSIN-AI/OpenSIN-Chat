# syntax=docker/dockerfile:1
# Setup base image
#
# SECURITY: The base image is pinned to a specific tag (noble-20251013) but
# should also be pinned by SHA256 digest for full reproducibility and supply-
# chain protection. To obtain the digest, run:
#
#   docker pull ubuntu:noble-20251013 --platform=linux/arm64
#   docker inspect --format='{{index .RepoDigests 0}}' ubuntu:noble-20251013
#
# Then replace the FROM line below with:
#   FROM ubuntu@sha256:<DIGEST> AS base
#
# The digest must be verified and updated whenever the base image tag is
# bumped. For production container builds, always use SHA256 pinning.
FROM ubuntu:noble-20251013 AS base

# Build arguments
ARG ARG_UID=1000
ARG ARG_GID=1000
# SKIP_CHROMIUM=1 omits the 568 MB ARM64 Chromium download. Keep it enabled
# unless browser-based collection is explicitly required in this image.
ARG SKIP_CHROMIUM=1
# SECURITY: Chromium binary SHA256 digest. REQUIRED for builds that include Chromium.
# Obtain with: curl -fsSL "$CHROMIUM_DOWNLOAD_URL" | sha256sum
ARG CHROMIUM_SHA256
# ARM64 Chromium download source. There is deliberately no third-party default.
# Builds that enable Chromium must provide a self-controlled HTTPS URL and the
# matching SHA256 digest explicitly.
ARG CHROMIUM_DOWNLOAD_URL

FROM base AS build-arm64
ARG ARG_UID=1000
ARG ARG_GID=1000
ARG SKIP_CHROMIUM
# ARGs are NOT inherited across stages — without these redeclarations the
# CHROMIUM_SHA256 check below always sees an empty value and the build fails.
ARG CHROMIUM_SHA256
ARG CHROMIUM_DOWNLOAD_URL
RUN echo "Preparing build of OpenSIN Chat image for arm64 architecture"

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install system dependencies
# hadolint ignore=DL3008,DL3013
RUN DEBIAN_FRONTEND=noninteractive apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -yq --no-install-recommends \
        unzip curl gnupg libgfortran5 libgbm1 tzdata netcat-openbsd \
        libasound2t64 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 \
        libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libx11-6 libx11-xcb1 libxcb1 \
        libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
        libxss1 libxtst6 ca-certificates fonts-liberation libappindicator3-1 libnss3 lsb-release \
        xdg-utils git build-essential ffmpeg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    # Install Node.js and activate the same Yarn version used by CI.
    apt-get install -yq --no-install-recommends nodejs && \
    corepack enable && \
    corepack prepare yarn@1.22.22 --activate && \
    # Install uvx (pinned to 0.6.10) for MCP support
    curl -LsSf https://astral.sh/uv/0.6.10/install.sh | sh && \
        mv /root/.local/bin/uv /usr/local/bin/uv && \
        mv /root/.local/bin/uvx /usr/local/bin/uvx && \
        echo "Installed uvx! $(uv --version)" && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create a group and user with specific UID and GID
# First, remove any existing user/group with the target UID/GID to avoid conflicts
RUN (getent passwd "$ARG_UID" && userdel -f "$(getent passwd "$ARG_UID" | cut -d: -f1)") || true && \
    (getent group "$ARG_GID" && groupdel "$(getent group "$ARG_GID" | cut -d: -f1)") || true && \
    groupadd -g "$ARG_GID" opensin && \
    useradd -l -u "$ARG_UID" -m -d /app -s /bin/bash -g opensin opensin && \
    mkdir -p /app/frontend/ /app/server/ /app/collector/ && chown -R opensin:opensin /app

# Copy docker helper scripts
COPY ./docker/docker-entrypoint.sh /usr/local/bin/
COPY ./docker/docker-healthcheck.sh /usr/local/bin/
# NOTE: We intentionally do NOT bake docker/.env into the image.
# docker-compose mounts the real docker/.env over /app/server/.env at runtime
# (see volumes in docker-compose.yml). Baking .env.example here would only ship
# a misleading default with commented-out keys.

# Ensure the scripts are executable
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/docker-healthcheck.sh

USER opensin
WORKDIR /app

# Puppeteer does not ship with an ARM64 compatible build for Chromium
# so web-scraping would be broken in arm docker containers unless we patch it
# by manually installing a compatible Chromium binary.
RUN if [ "$SKIP_CHROMIUM" != "1" ]; then \
        echo "Need to patch Puppeteer x Chromium support for ARM64 - installing dep!" && \
        # SECURITY: Verify SHA256 before unzipping. The CHROMIUM_SHA256 build arg
        # MUST be set. In production, self-host the binary and update the URL.
        if [ -z "$CHROMIUM_DOWNLOAD_URL" ] || [ -z "$CHROMIUM_SHA256" ]; then \
            echo "ERROR: CHROMIUM_DOWNLOAD_URL and CHROMIUM_SHA256 are required when SKIP_CHROMIUM is not 1."; \
            exit 1; \
        fi; \
        curl -fSL "${CHROMIUM_DOWNLOAD_URL}" -o chrome-linux.zip && \
        echo "${CHROMIUM_SHA256}  chrome-linux.zip" | sha256sum -c - && \
        unzip chrome-linux.zip && \
        rm -rf chrome-linux.zip; \
    else \
        echo "SKIP_CHROMIUM=1: omitting ARM64 Chromium download" && \
        mkdir -p /app/chrome-linux && \
        echo '#!/bin/sh' > /app/chrome-linux/chrome && \
        echo 'echo "Chromium skipped by SKIP_CHROMIUM=1" && exit 1' >> /app/chrome-linux/chrome && \
        chmod +x /app/chrome-linux/chrome; \
    fi

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROME_PATH=/app/chrome-linux/chrome
ENV PUPPETEER_EXECUTABLE_PATH=/app/chrome-linux/chrome

RUN echo "Done running arm64 specific installation steps"

#############################################

# amd64-specific stage
FROM base AS build-amd64
ARG ARG_UID=1000
ARG ARG_GID=1000
RUN echo "Preparing build of OpenSIN Chat image for non-ARM architecture"

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install system dependencies
# hadolint ignore=DL3008,DL3013
RUN DEBIAN_FRONTEND=noninteractive apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -yq --no-install-recommends \
        curl gnupg libgfortran5 libgbm1 tzdata netcat-openbsd \
        libasound2t64 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 \
        libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libx11-6 libx11-xcb1 libxcb1 \
        libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
        libxss1 libxtst6 ca-certificates fonts-liberation libappindicator3-1 libnss3 lsb-release \
        xdg-utils git build-essential ffmpeg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    # Install Node.js and activate the same Yarn version used by CI.
    apt-get install -yq --no-install-recommends nodejs && \
    corepack enable && \
    corepack prepare yarn@1.22.22 --activate && \
    # Install uvx (pinned to 0.6.10) for MCP support
    curl -LsSf https://astral.sh/uv/0.6.10/install.sh | sh && \
        mv /root/.local/bin/uv /usr/local/bin/uv && \
        mv /root/.local/bin/uvx /usr/local/bin/uvx && \
        echo "Installed uvx! $(uv --version)" && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create a group and user with specific UID and GID
# First, remove any existing user/group with the target UID/GID to avoid conflicts
RUN (getent passwd "$ARG_UID" && userdel -f "$(getent passwd "$ARG_UID" | cut -d: -f1)") || true && \
    (getent group "$ARG_GID" && groupdel "$(getent group "$ARG_GID" | cut -d: -f1)") || true && \
    groupadd -g "$ARG_GID" opensin && \
    useradd -l -u "$ARG_UID" -m -d /app -s /bin/bash -g opensin opensin && \
    mkdir -p /app/frontend/ /app/server/ /app/collector/ && chown -R opensin:opensin /app

# Copy docker helper scripts
COPY ./docker/docker-entrypoint.sh /usr/local/bin/
COPY ./docker/docker-healthcheck.sh /usr/local/bin/
# NOTE: We intentionally do NOT bake docker/.env into the image.
# docker-compose mounts the real docker/.env over /app/server/.env at runtime
# (see volumes in docker-compose.yml). Baking .env.example here would only ship
# a misleading default with commented-out keys.

# Ensure the scripts are executable
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/docker-healthcheck.sh

#############################################
# COMMON BUILD FLOW FOR ALL ARCHS
#############################################

# hadolint ignore=DL3006
FROM build-${TARGETARCH} AS build
RUN echo "Running common build flow of OpenSIN Chat image for all architectures"

USER opensin
WORKDIR /app

# Install & Build frontend layer
# Use BUILDPLATFORM to run on the native host architecture (not emulated).
# This avoids esbuild crashing under QEMU when cross-compiling.
# The output (static HTML/CSS/JS) is platform-independent.
FROM --platform=$BUILDPLATFORM node:22-slim AS frontend-build

ARG VITE_ENABLE_IMAGE_GENERATION=false
ARG VITE_ENABLE_VIDEO_GENERATION=false
ARG VITE_ENABLE_CVOICE_TTS=false

ENV VITE_ENABLE_IMAGE_GENERATION=${VITE_ENABLE_IMAGE_GENERATION}
ENV VITE_ENABLE_VIDEO_GENERATION=${VITE_ENABLE_VIDEO_GENERATION}
ENV VITE_ENABLE_CVOICE_TTS=${VITE_ENABLE_CVOICE_TTS}

WORKDIR /app/frontend
RUN corepack enable && corepack prepare yarn@1.22.22 --activate
COPY ./frontend/package.json ./frontend/yarn.lock ./
RUN --mount=type=cache,target=/yarn-cache \
    YARN_CACHE_FOLDER=/yarn-cache \
    yarn install --frozen-lockfile --network-timeout 100000
COPY ./frontend/ ./
COPY ./docs/ /app/docs/
RUN yarn build
WORKDIR /app

# Install server layer
# Also pull and build collector deps (chromium issues prevent bad bindings)
FROM build AS backend-build
ARG ARG_UID=1000
ARG ARG_GID=1000

COPY --chown=opensin:opensin ./server/package.json ./server/yarn.lock /app/server/
COPY --chown=opensin:opensin ./server/prisma/schema.prisma /app/server/prisma/schema.prisma
WORKDIR /app/server
RUN --mount=type=cache,target=/yarn-cache,uid=${ARG_UID},gid=${ARG_GID} \
    YARN_CACHE_FOLDER=/yarn-cache \
    yarn install --production --frozen-lockfile --network-timeout 600000

WORKDIR /app
COPY --chown=opensin:opensin ./server/ /app/server/

# Explicitly copy the critical paths.js file required by the native embedder
# (server/utils/EmbeddingEngines/native/index.js). This is a defense-in-depth
# measure for issue #114: even if the bulk server COPY above is refactored or
# a build context change silently drops this file, the image will still contain
# it. The build-time check below fails the image build if the file is missing.
COPY --chown=opensin:opensin ./server/utils/paths.js /app/server/utils/paths.js

# Verify critical server files made it into the image (issue #114).
# If paths.js is missing we fail the build loudly so a broken image
# can never ship. The runtime guard in docker-entrypoint.sh is a
# defense-in-depth backup for already-built images.
RUN test -f /app/server/utils/paths.js || (echo "BUILD ERROR: /app/server/utils/paths.js missing from server COPY" && exit 1)

# Install collector dependencies
COPY --chown=opensin:opensin ./collector/package.json ./collector/yarn.lock /app/collector/
WORKDIR /app/collector
ENV PUPPETEER_DOWNLOAD_BASE_URL=https://storage.googleapis.com/chrome-for-testing-public
RUN --mount=type=cache,target=/yarn-cache,uid=${ARG_UID},gid=${ARG_GID} \
    YARN_CACHE_FOLDER=/yarn-cache \
    yarn install --production --frozen-lockfile --network-timeout 600000

COPY --chown=opensin:opensin ./collector/ /app/collector/
WORKDIR /app
USER opensin

# Since we are building from backend-build we just need to move built frontend into server/public
FROM backend-build AS production-build
WORKDIR /app
COPY --chown=opensin:opensin --from=frontend-build /app/frontend/dist /app/server/public

# Setup the environment
ARG APP_VERSION=dev
ARG GIT_SHA=unknown
ENV NODE_ENV=production
ENV OPENSIN_CHAT_RUNTIME=docker
ENV DEPLOYMENT_VERSION=1.14.0
ENV APP_VERSION=${APP_VERSION}
ENV GIT_SHA=${GIT_SHA}

# Setup the healthcheck
HEALTHCHECK --interval=1m --timeout=10s --start-period=1m \
  CMD /bin/bash /usr/local/bin/docker-healthcheck.sh || exit 1

# Run the server
# CMD ["sh", "-c", "tail -f /dev/null"] # For development: keep container open
ENTRYPOINT ["/bin/bash", "/usr/local/bin/docker-entrypoint.sh"]
