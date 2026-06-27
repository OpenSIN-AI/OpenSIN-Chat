// SPDX-License-Identifier: MIT
const fs = require("fs");
const path = require("path");

function findAllFiles(dir) {
  let files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  items.forEach((item) => {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files = files.concat(findAllFiles(fullPath));
    } else if (
      (item.name.endsWith(".tsx") || item.name.endsWith(".ts")) &&
      !item.name.endsWith(".test.tsx") &&
      !item.name.endsWith(".test.ts")
    ) {
      files.push(fullPath);
    }
  });
  return files;
}

function fixContexts(content) {
  let fixed = content;
  // createContext()  -> createContext<any>(undefined)
  fixed = fixed.replace(
    /(\b(?:React\.)?createContext)\(\s*\)/g,
    "$1<any>(undefined)",
  );
  // createContext(arg) without generic -> createContext<any>(arg)
  fixed = fixed.replace(
    /(\b(?:React\.)?createContext)\((?!<)([^)]*)\)/g,
    (match, fn, arg) => {
      // skip if already has generic (handled above won't reach here)
      return `${fn}<any>(${arg})`;
    },
  );
  return fixed;
}

const srcDir = path.join(process.cwd(), "src");
const allFiles = findAllFiles(srcDir);

let count = 0;
allFiles.forEach((filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  const fixed = fixContexts(content);
  if (content !== fixed) {
    fs.writeFileSync(filePath, fixed);
    count++;
  }
});

console.log(`Fixed ${count}/${allFiles.length} files`);
