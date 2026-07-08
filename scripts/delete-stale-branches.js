#!/usr/bin/env node
/**
 * Delete stale branches from OpenSIN-Chat repo.
 * Run: GITHUB_TOKEN=<token> node scripts/delete-stale-branches.js
 *
 * Closes #508
 */
const https = require('https');

const REPO = 'OpenSIN-AI/OpenSIN-Chat';
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) {
  console.error('GITHUB_TOKEN env var is required');
  process.exit(1);
}

const branchesToDelete = [
  'audit-report-server-changes',
  'build/node-22-and-svgo',
  'chore/branding-cleanup-openafd-to-opensin',
  'chore/tailwind-v4-migration',
  'code-review-and-fix',
  'docs/nim-vision-update',
  'docs/phases-1-6-documentation-devtools',
  'docs/remove-fork-label',
  'docs/web-docs-sota-upgrade',
  'feat/nvidia-nim-vision-ocr',
  'feat/pdf-upload-speed-overhaul',
  'feature/phase1-2-live-runs-oauth',
  'feature/phase3-5-connectors-triggers',
  'feature/phase4-agent-workspace-settings',
  'feature/phase6-subagent-api',
  'fix/back-to-chat-desktop',
  'fix/back-to-chat-desktop-v2',
  'fix/build-config-cleanup',
  'fix/build-deps-and-e2e-smoke',
  'fix/ci-lint-errors',
  'fix/ci-lockfile-sync',
  'fix/cleanup-stale-branches',
  'fix/delete-stale-branches',
  'fix/deps-react-i18next-17',
  'fix/frontend-audit-170-bugs',
  'fix/frontend-audit-round5-remaining',
  'fix/mime-v4-compat',
  'fix/pdf-ocr-upload-hang',
  'fix/upload-stall-nginx-body-size',
  'fix/509-server-tsconfig',
  'fix/510-god-files-split',
  'fix/523-input-validation',
  'fix/524-typescript-errors',
  'fix/525-typed-context-providers',
  'fix/528-server-god-files-remaining',
  'fix/529-server-model-tests',
  'fix/530-split-large-components',
  'fix/531-console-error-cleanup',
  'fix/532-frontend-test-coverage',
  'fix/533-react-memo',
  'fix/538-prisma-migrations',
  'fix/541-aria-attributes',
  'fix-test-failures',
  'issue-371-error-id',
  'issue-383-remove-deprecated-mark-invalid',
  'issue-390-password-recovery-tests',
  'open-tasks',
  'pull-request-review',
  'security/remove-public-research-data',
  'test/core-model-coverage-and-smoke',
  'test/endpoints-and-ai-providers',
  'test/infra-fixes-and-frontend-coverage',
  'test/remaining-coverage-8-areas',
  'test/security-and-core-models',
  'test/security-and-core-models-v2',
  'test/security-model-coverage',
  'test/vectorstore-mcp-workers-speech',
  'v0/bergraseil-4585-5b1df0e5',
  'v0/birratiojgd-1088-cc9a1c6e',
  'v0/castleoffantasies-5452-ed038939',
  'v0/helaidumse-9762-7be93d55',
  'v0/loriyboasumsu-2542-c5f58ca5',
];

async function deleteBranch(branch) {
  const path = `/repos/${REPO}/git/refs/heads/${encodeURIComponent(branch)}`;
  const options = {
    hostname: 'api.github.com',
    path,
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'OpenSIN-Chat-Branch-Cleanup',
    },
  };
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 204) {
          console.log(`✓ Deleted: ${branch}`);
        } else {
          console.log(`✗ Failed: ${branch} (${res.statusCode})`);
        }
        resolve();
      });
    });
    req.on('error', (e) => {
      console.log(`✗ Error: ${branch} (${e.message})`);
      resolve();
    });
    req.end();
  });
}

(async () => {
  console.log(`Deleting ${branchesToDelete.length} stale branches from ${REPO}...\n`);
  for (const branch of branchesToDelete) {
    await deleteBranch(branch);
  }
  console.log('\nDone!');
})();
