#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Purpose: Prevent public repository files from carrying private deployment inventory.

import { execFileSync } from "node:child_process";
import { isIP } from "node:net";
import { readFileSync } from "node:fs";

const tracked = execFileSync("git", ["ls-files", "-z"])
  .toString("utf8")
  .split("\0")
  .filter(Boolean);

const findings = [];
const operationalPath = /^(?:docs\/(?:deployment|INCIDENT)|platform\/|tooling\/(?:skills|scripts\/oci-vm-bootstrap))/;
const ipv4Pattern = /(?<!\d)(?:\d{1,3}\.){3}\d{1,3}(?!\d)/g;
const allowedPublicAddresses = new Set([
  "1.1.1.1",
  "8.8.8.8",
  "8.8.4.4",
  "9.9.9.9",
  "208.67.220.220",
  "208.67.222.222",
]);
const documentationNetworks = [
  ["192.0.2.", 24],
  ["198.51.100.", 24],
  ["203.0.113.", 24],
];

function isNonPublicOrDocumentationAddress(value) {
  if (allowedPublicAddresses.has(value)) return true;
  if (documentationNetworks.some(([prefix]) => value.startsWith(prefix))) {
    return true;
  }

  const octets = value.split(".").map(Number);
  const [first, second] = octets;
  if (first === 0 || first === 10 || first === 127) return true;
  if (first === 169 && second === 254) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  if (first === 192 && second === 168) return true;
  if (first >= 224) return true;
  return false;
}

for (const file of tracked) {
  let data;
  try {
    data = readFileSync(file);
  } catch {
    continue;
  }
  if (data.includes(0)) continue;

  const lines = data.toString("utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    if (/\/(?:Users|home)\/(?:jeremy|ubuntu|opc|root)(?:\/|\b)/.test(line)) {
      findings.push(`${file}:${lineNumber}: private absolute user path`);
    }

    if (operationalPath.test(file)) {
      for (const match of line.matchAll(ipv4Pattern)) {
        const value = match[0];
        if (isIP(value) === 4 && !isNonPublicOrDocumentationAddress(value)) {
          findings.push(`${file}:${lineNumber}: literal operational IPv4 address`);
        }
      }
    }

    if (/^(?:apps\/web\/tests\/e2e|tests\/e2e-browser)\//.test(file)) {
      if (/OPENSIN_PASSWORD\s*\|\|\s*["']{2}/.test(line)) {
        findings.push(`${file}:${lineNumber}: empty-password fallback`);
      }
      if (/password\s*:\s*["']{2}/.test(line)) {
        findings.push(`${file}:${lineNumber}: literal empty password`);
      }
    }

    if (
      /^(?:docs|platform|tooling)\//.test(file) &&
      !file.startsWith("docs/archive/") &&
      /\bdocker\s+cp\b/.test(line)
    ) {
      findings.push(`${file}:${lineNumber}: production hot-patch instruction`);
    }

    if (/^platform\//.test(file) && /\bSYS_ADMIN\b/.test(line)) {
      findings.push(`${file}:${lineNumber}: forbidden container capability`);
    }
  });
}

if (findings.length > 0) {
  console.error("Public operations policy failed:\n" + findings.join("\n"));
  process.exit(1);
}

console.log(`Public operations policy passed (${tracked.length} tracked files).`);
