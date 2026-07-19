// SPDX-License-Identifier: MIT
import { renameSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(`Running frontend post build script...`)
renameSync(path.resolve(__dirname, '../dist/index.html'), path.resolve(__dirname, '../dist/_index.html'));
console.log(`index.html renamed to _index.html so SSR of the index page can be assumed.`);

// Static prerender for the docs pages — improves LCP by serving HTML without
// waiting for the JS bundle to download, parse, and execute.

// Ensure ops playbooks that live in repo docs/ are always available for prerender.
const fs = require('fs');
const path = require('path');
const contentDir = path.resolve(__dirname, '../src/pages/Docs/content');
const ensure = [
  ['INCIDENT-RESPONSE.md', 'incident-response.md'],
];
for (const [srcName, destName] of ensure) {
  const src = path.resolve(__dirname, '../../docs', srcName);
  const dest = path.join(contentDir, destName);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

import('./prerender-docs.mjs')
  .then(() => console.log(`Docs prerender complete.`))
  .catch((err) => {
    console.error(`Docs prerender failed:`, err);
    process.exit(1);
  });