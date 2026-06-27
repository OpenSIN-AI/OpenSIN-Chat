// SPDX-License-Identifier: MIT
const fs = require("fs");
const path = require("path");

const modelsDir = path.join(process.cwd(), "src/models");

function findAllFiles(dir) {
  let files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  items.forEach((item) => {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files = files.concat(findAllFiles(fullPath));
    } else if (
      item.name.endsWith(".ts") &&
      !item.name.endsWith(".test.ts")
    ) {
      files.push(fullPath);
    }
  });
  return files;
}

function annotateModel(content) {
  let fixed = content;

  // const ModelName = { ...  =>  const ModelName: any = {
  // Only top-level (no indentation) capitalized const objects
  fixed = fixed.replace(
    /^const ([A-Z][a-zA-Z0-9_]*) = \{/gm,
    "const $1: any = {",
  );

  return fixed;
}

const files = findAllFiles(modelsDir);
let count = 0;
files.forEach((filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  const fixed = annotateModel(content);
  if (content !== fixed) {
    fs.writeFileSync(filePath, fixed);
    count++;
    console.log("annotated", path.relative(modelsDir, filePath));
  }
});
console.log(`\nAnnotated ${count}/${files.length} model files`);
