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

function fixAsync(content) {
  let fixed = content;
  // Fix: async (...): JSX.Element => to async (...) =>
  fixed = fixed.replace(
    /async\s*\(([^)]*)\):\s*JSX\.Element\s*=>/g,
    "async ($1) =>",
  );
  // Fix: async function name(...): JSX.Element { to async function name(...) {
  fixed = fixed.replace(
    /async\s+function\s+(\w+)\s*\(([^)]*)\):\s*JSX\.Element\s*\{/g,
    "async function $1($2) {",
  );
  return fixed;
}

const srcDir = path.join(process.cwd(), "src");
const allFiles = findAllFiles(srcDir);

let count = 0;
allFiles.forEach((filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  const fixed = fixAsync(content);
  if (content !== fixed) {
    fs.writeFileSync(filePath, fixed);
    count++;
  }
});

console.log(`Fixed ${count}/${allFiles.length} files`);
