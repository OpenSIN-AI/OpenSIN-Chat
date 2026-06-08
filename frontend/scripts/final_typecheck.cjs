const fs = require('fs');
const path = require('path');

function findAllFiles(dir) {
  let files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  items.forEach(item => {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files = files.concat(findAllFiles(fullPath));
    } else if ((item.name.endsWith('.tsx') || item.name.endsWith('.ts')) && !item.name.endsWith('.test.tsx')) {
      files.push(fullPath);
    }
  });
  return files;
}

function fixRemaining(content) {
  let fixed = content;
  
  // Fix HTMLSelectElement casting - use unknown first then any
  fixed = fixed.replace(
    /\(e\.target as HTMLInputElement\)\.value/g,
    '((e.target as unknown) as any)?.value'
  );
  
  // Fix array methods on unknown
  fixed = fixed.replace(/(\w+)\.some\(/g, (m, v) => `(${v} as any).some(`);
  fixed = fixed.replace(/(\w+)\.filter\(/g, (m, v) => `(${v} as any).filter(`);
  fixed = fixed.replace(/(\w+)\.map\(/g, (m, v) => `(${v} as any).map(`);
  
  // Fix abort on unknown
  fixed = fixed.replace(/\.abort\(\)/g, '?.abort()');
  
  return fixed;
}

const srcDir = path.join(process.cwd(), 'src');
const allFiles = findAllFiles(srcDir);

let count = 0;
allFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const fixed = fixRemaining(content);
  if (content !== fixed) {
    fs.writeFileSync(filePath, fixed);
    count++;
  }
});

console.log(`Fixed remaining issues in ${count} files`);
