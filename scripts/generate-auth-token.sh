#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Purpose: Generates a cryptographically strong AUTH_TOKEN for OpenSIN-Chat production deployments.
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
