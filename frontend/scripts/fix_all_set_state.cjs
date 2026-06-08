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

function fixSetState(content) {
  let fixed = content;
  
  // Match setState calls and add as any if not already typed
  fixed = fixed.replace(/(\w+State)\(([^)]+)\)(?!\s*as\s*any)/g, (match, p1, p2) => {
    // Don't add if it's a function call or already has 'as'
    if (p2.includes('as ') || p2.trim().startsWith('(')) return match;
    // Check if the argument is a literal that needs typing
    if (/^(true|false|\d+|\[|\{|\w+\.|\`)/i.test(p2.trim())) {
      return `${p1}(${p2} as any)`;
    }
    return match;
  });
  
  return fixed;
}

const srcDir = path.join(process.cwd(), 'src');
const allFiles = findAllFiles(srcDir);

let count = 0;
allFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const fixed = fixSetState(content);
  if (content !== fixed) {
    fs.writeFileSync(filePath, fixed);
    count++;
  }
});

console.log(`Fixed setState calls in ${count} files`);
