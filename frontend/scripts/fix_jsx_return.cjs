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

function removeJsxReturn(content) {
  let fixed = content;
  // Remove `: JSX.Element` return type annotation before `{` or `=>`
  fixed = fixed.replace(/\):\s*JSX\.Element\s*\{/g, ") {");
  fixed = fixed.replace(/\):\s*JSX\.Element\s*=>/g, ") =>");
  return fixed;
}

const srcDir = path.join(process.cwd(), "src");
const allFiles = findAllFiles(srcDir);
let count = 0;
allFiles.forEach((filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  const fixed = removeJsxReturn(content);
  if (content !== fixed) {
    fs.writeFileSync(filePath, fixed);
    count++;
  }
});
console.log(`Removed JSX.Element return types in ${count}/${allFiles.length} files`);
