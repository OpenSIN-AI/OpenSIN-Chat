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

// Find `}: any` and walk backwards to matching `{`, then clean `: any` inside
function fixDestructured(content) {
  let result = "";
  let i = 0;

  while (i < content.length) {
    const match = content.slice(i).match(/\}:\s*any/);
    if (!match) {
      result += content.slice(i);
      break;
    }

    const closeBracePos = i + match.index;

    let depth = 1;
    let j = closeBracePos - 1;
    while (j >= 0 && depth > 0) {
      if (content[j] === "}") depth++;
      else if (content[j] === "{") depth--;
      if (depth === 0) break;
      j--;
    }

    if (j < 0) {
      result += content.slice(i, closeBracePos + match[0].length);
      i = closeBracePos + match[0].length;
      continue;
    }

    const openBracePos = j;
    result += content.slice(i, openBracePos + 1);

    let inner = content.slice(openBracePos + 1, closeBracePos);
    const cleanedInner = inner.replace(/(\w+):\s*any/g, "$1");

    result += cleanedInner;
    result += content.slice(closeBracePos, closeBracePos + match[0].length);

    i = closeBracePos + match[0].length;
  }

  return result;
}

const srcDir = path.join(process.cwd(), "src");
const allFiles = findAllFiles(srcDir);

let count = 0;
allFiles.forEach((filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  const fixed = fixDestructured(content);
  if (content !== fixed) {
    fs.writeFileSync(filePath, fixed);
    count++;
  }
});

console.log(`Fixed ${count}/${allFiles.length} files`);
