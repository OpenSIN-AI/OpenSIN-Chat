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

// Add `: any` to untyped destructured arrow-function params: `({ ... }) =>` -> `({ ... }: any) =>`
function typeDestructure(content) {
  let result = "";
  let i = 0;
  while (i < content.length) {
    // find `({` opening of a destructured param
    const idx = content.indexOf("({", i);
    if (idx === -1) {
      result += content.slice(i);
      break;
    }
    // walk forward from the `{` to matching `}`
    let depth = 0;
    let j = idx + 1; // at `{`
    for (; j < content.length; j++) {
      if (content[j] === "{") depth++;
      else if (content[j] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    // j is at matching `}`. Next should be `)` for a single destructured param
    if (content[j + 1] === ")") {
      const after = content.slice(j + 2).match(/^\s*=>/);
      const alreadyTyped = content.slice(j + 1, j + 8).match(/^\)\s*:/);
      if (after && !alreadyTyped) {
        result += content.slice(i, j + 1); // up to and including `}`
        result += ": any";
        i = j + 1;
        continue;
      }
    }
    result += content.slice(i, idx + 2);
    i = idx + 2;
  }
  return result;
}

const srcDir = path.join(process.cwd(), "src");
const allFiles = findAllFiles(srcDir);
let count = 0;
allFiles.forEach((filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  const fixed = typeDestructure(content);
  if (content !== fixed) {
    fs.writeFileSync(filePath, fixed);
    count++;
  }
});
console.log(`Typed destructured params in ${count}/${allFiles.length} files`);
